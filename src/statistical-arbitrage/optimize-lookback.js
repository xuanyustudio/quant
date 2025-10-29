/**
 * lookbackPeriod 优化脚本 - 找出最佳回看周期
 */

import ccxt from 'ccxt';
import dotenv from 'dotenv';
import { Backtest } from './Backtest.js';
import { DataCollector } from './DataCollector.js';
import { logger } from '../utils/logger.js';
import config from './config.js';

dotenv.config();

class LookbackOptimizer {
  constructor(symbol1, symbol2, exchangeConfig, strategyConfig) {
    this.symbol1 = symbol1;
    this.symbol2 = symbol2;
    this.exchangeConfig = exchangeConfig;
    this.strategyConfig = strategyConfig;
    this.exchange = null;
    this.dataCollector = null;
  }

  async initialize() {
    logger.info('🔧 初始化 lookbackPeriod 优化器...');
    
    // 创建交易所实例
    const ExchangeClass = ccxt[this.exchangeConfig.id];
    const exchangeParams = {
      apiKey: this.exchangeConfig.apiKey,
      secret: this.exchangeConfig.secret,
      enableRateLimit: this.exchangeConfig.enableRateLimit !== false,
      timeout: this.exchangeConfig.timeout || 30000,
      options: this.exchangeConfig.options || {}
    };
    
    if (this.exchangeConfig.httpsProxy) {
      exchangeParams.httpsProxy = this.exchangeConfig.httpsProxy;
      logger.info('📡 使用代理: ' + this.exchangeConfig.httpsProxy);
    }
    
    this.exchange = new ExchangeClass(exchangeParams);
    await this.exchange.loadMarkets();
    
    // 初始化数据收集器
    this.dataCollector = new DataCollector(this.exchange, {
      dataDir: './data/statistical-arbitrage'
    });
    await this.dataCollector.initialize();
    
    logger.info('✅ 初始化完成');
  }

  /**
   * 获取历史数据
   */
  async fetchHistoricalData(timeframe, limit, since) {
    logger.info('📊 获取 ' + this.symbol1 + ' 和 ' + this.symbol2 + ' 的历史数据...');
    logger.info('⏰ 时间周期: ' + timeframe);
    logger.info('📊 数据点数: ' + limit);
    
    const data1 = await this.dataCollector.fetchOHLCV(
      this.symbol1,
      timeframe,
      limit,
      since
    );
    
    const data2 = await this.dataCollector.fetchOHLCV(
      this.symbol2,
      timeframe,
      limit,
      since
    );
    
    const prices1 = this.dataCollector.getClosePrices(data1);
    const prices2 = this.dataCollector.getClosePrices(data2);
    const timestamps = data1.map(d => d.timestamp);
    
    logger.info('✅ 获取 ' + prices1.length + ' 条数据');
    
    return { prices1, prices2, timestamps };
  }

  /**
   * 单次回测（使用指定的lookbackPeriod）
   */
  async runSingleBacktest(prices1, prices2, timestamps, lookbackPeriod) {
    // 创建临时策略配置
    const tempConfig = {
      ...this.strategyConfig,
      lookbackPeriod
    };
    
    // 创建回测引擎
    const backtest = new Backtest({
      initialCapital: tempConfig.initialCapital || 10000,
      positionSize: tempConfig.positionSize || 0.5,
      commission: tempConfig.commission || 0.001,
      strategy: tempConfig
    });
    
    // 运行回测（不生成详细报告）
    const result = await backtest.run(
      this.symbol1,
      this.symbol2,
      prices1,
      prices2,
      timestamps,
      { generateReport: false }
    );
    
    return result;
  }

  /**
   * 测试多个lookbackPeriod值
   */
  async testLookbackValues(prices1, prices2, timestamps, lookbackValues) {
    logger.info('');
    logger.info('═'.repeat(60));
    logger.info('🔍 开始测试不同的 lookbackPeriod 值...');
    logger.info('═'.repeat(60));
    logger.info('');
    
    const results = [];
    let bestResult = null;
    let bestScore = -Infinity;
    
    logger.info('📊 将测试以下 lookbackPeriod 值: ' + lookbackValues.join(', '));
    logger.info('');
    
    // 测试每个lookbackPeriod值
    for (let i = 0; i < lookbackValues.length; i++) {
      const lookback = lookbackValues[i];
      
      logger.info('[' + (i + 1) + '/' + lookbackValues.length + '] 测试 lookbackPeriod = ' + lookback);
      
      try {
        const result = await this.runSingleBacktest(
          prices1,
          prices2,
          timestamps,
          lookback
        );
        
        // 计算综合得分
        const score = this.calculateScore(result);
        
        const resultWithParams = {
          lookbackPeriod: lookback,
          ...result,
          score
        };
        
        results.push(resultWithParams);
        
        logger.info('   收益率: ' + result.totalReturn.toFixed(2) + '%');
        logger.info('   夏普比率: ' + result.sharpeRatio.toFixed(2));
        logger.info('   胜率: ' + result.winRate.toFixed(1) + '%');
        logger.info('   交易次数: ' + result.totalTrades);
        logger.info('   最大回撤: ' + result.maxDrawdown.toFixed(2) + '%');
        logger.info('   综合得分: ' + score.toFixed(2));
        
        // 更新最佳结果
        if (score > bestScore) {
          bestScore = score;
          bestResult = resultWithParams;
          logger.info('   ⭐ 当前最佳 lookbackPeriod！');
        }
        
        logger.info('');
        
      } catch (error) {
        logger.error('   ❌ 回测失败: ' + error.message);
        logger.info('');
      }
    }
    
    return { results, bestResult };
  }

  /**
   * 计算综合得分
   * 权重：收益率(40%) + 夏普比率(30%) + 胜率(20%) + 交易次数适度性(10%)
   */
  calculateScore(result) {
    const returnScore = result.totalReturn * 0.4;  // 收益率权重40%
    const sharpeScore = result.sharpeRatio * 10 * 0.3;  // 夏普比率权重30%
    const winRateScore = (result.winRate - 50) * 0.2;  // 胜率权重20%
    
    // 交易次数适度性：5-30笔为最佳
    let tradeScore = 0;
    if (result.totalTrades >= 5 && result.totalTrades <= 30) {
      tradeScore = 5;
    } else if (result.totalTrades < 5) {
      tradeScore = result.totalTrades - 5;  // 负分
    } else if (result.totalTrades > 30) {
      tradeScore = Math.max(-5, 30 - result.totalTrades * 0.1);  // 负分
    }
    tradeScore *= 0.1;  // 交易次数权重10%
    
    return returnScore + sharpeScore + winRateScore + tradeScore;
  }

  /**
   * 打印优化结果
   */
  printResults(results, bestResult) {
    logger.info('');
    logger.info('═'.repeat(60));
    logger.info('📊 lookbackPeriod 优化结果');
    logger.info('═'.repeat(60));
    logger.info('');
    
    // 按得分排序
    const sortedResults = results.sort((a, b) => b.score - a.score);
    
    logger.info('🏆 TOP 10 lookbackPeriod 值:');
    logger.info('');
    
    sortedResults.slice(0, 10).forEach((result, index) => {
      logger.info((index + 1) + '. lookbackPeriod = ' + result.lookbackPeriod);
      logger.info('   收益率: ' + result.totalReturn.toFixed(2) + '%');
      logger.info('   夏普比率: ' + result.sharpeRatio.toFixed(2));
      logger.info('   胜率: ' + result.winRate.toFixed(1) + '%');
      logger.info('   交易次数: ' + result.totalTrades);
      logger.info('   最大回撤: ' + result.maxDrawdown.toFixed(2) + '%');
      logger.info('   综合得分: ' + result.score.toFixed(2));
      logger.info('');
    });
    
    logger.info('═'.repeat(60));
    logger.info('⭐ 最佳 lookbackPeriod:');
    logger.info('═'.repeat(60));
    logger.info('lookbackPeriod: ' + bestResult.lookbackPeriod);
    logger.info('');
    logger.info('收益率: ' + bestResult.totalReturn.toFixed(2) + '%');
    logger.info('夏普比率: ' + bestResult.sharpeRatio.toFixed(2));
    logger.info('胜率: ' + bestResult.winRate.toFixed(1) + '%');
    logger.info('交易次数: ' + bestResult.totalTrades);
    logger.info('最大回撤: ' + bestResult.maxDrawdown.toFixed(2) + '%');
    logger.info('综合得分: ' + bestResult.score.toFixed(2));
    logger.info('');
    
    // 可视化对比
    this.visualizeResults(sortedResults);
  }

  /**
   * 可视化结果（ASCII图表）
   */
  visualizeResults(results) {
    logger.info('');
    logger.info('═'.repeat(60));
    logger.info('📈 lookbackPeriod vs 收益率');
    logger.info('═'.repeat(60));
    logger.info('');
    
    // 找到最大和最小收益率用于缩放
    const maxReturn = Math.max(...results.map(r => r.totalReturn));
    const minReturn = Math.min(...results.map(r => r.totalReturn));
    const range = maxReturn - minReturn || 1;
    
    results.forEach(r => {
      const lookback = r.lookbackPeriod.toString().padStart(4, ' ');
      const returnStr = r.totalReturn.toFixed(2).padStart(7, ' ') + '%';
      
      // 生成柱状图（最多50个字符）
      const barLength = Math.round(((r.totalReturn - minReturn) / range) * 50);
      const bar = '█'.repeat(Math.max(0, barLength));
      
      logger.info(lookback + ' | ' + returnStr + ' | ' + bar);
    });
    
    logger.info('');
  }
}

// 主函数
async function main() {
  try {
    // 从命令行参数或配置文件获取交易对
    const args = process.argv.slice(2);
    let symbol1, symbol2;
    
    if (args.length >= 2) {
      symbol1 = args[0];
      symbol2 = args[1];
    } else {
      // 默认配对
      symbol1 = 'ETH/USDT';
      symbol2 = 'BNB/USDT';
    }
    
    logger.info('');
    logger.info('═'.repeat(60));
    logger.info('🎯 lookbackPeriod 优化 - ' + symbol1 + ' ↔ ' + symbol2);
    logger.info('═'.repeat(60));
    logger.info('');
    
    // 创建优化器
    const optimizer = new LookbackOptimizer(
      symbol1,
      symbol2,
      config.exchange,
      config.strategy
    );
    
    await optimizer.initialize();
    
    // 获取历史数据
    const timeframe = config.strategy.backtestTimeframe || '15m';
    
    // 根据配置的时间范围获取数据
    let since, limit;
    if (config.strategy.backtestStartDate && config.strategy.backtestEndDate) {
      const startDate = new Date(config.strategy.backtestStartDate);
      const endDate = new Date(config.strategy.backtestEndDate);
      since = startDate.getTime();
      const hours = (endDate.getTime() - since) / (60 * 60 * 1000);
      const timeframeMinutes = timeframe === '15m' ? 15 : timeframe === '1h' ? 60 : 15;
      limit = Math.ceil((hours * 60) / timeframeMinutes);
      
      logger.info('📅 使用配置的时间范围: ' + config.strategy.backtestStartDate + ' 至 ' + config.strategy.backtestEndDate);
    } else {
      const correlationHours = config.strategy.correlationPeriod || 720;
      since = Date.now() - (correlationHours * 60 * 60 * 1000);
      const timeframeMinutes = timeframe === '15m' ? 15 : timeframe === '1h' ? 60 : 15;
      limit = Math.ceil((correlationHours * 60) / timeframeMinutes);
    }
    
    logger.info('');
    
    const { prices1, prices2, timestamps } = await optimizer.fetchHistoricalData(
      timeframe,
      limit,
      since
    );
    
    // 定义要测试的lookbackPeriod值
    // 从20到300，步长为10
    const lookbackValues = [];
    for (let i = 20; i <= 300; i += 10) {
      lookbackValues.push(i);
    }
    
    // 添加一些特殊值
    lookbackValues.push(50, 75, 100, 120, 150, 200);
    // 排序并去重
    const uniqueLookbacks = [...new Set(lookbackValues)].sort((a, b) => a - b);
    
    // 执行测试
    const { results, bestResult } = await optimizer.testLookbackValues(
      prices1,
      prices2,
      timestamps,
      uniqueLookbacks
    );
    
    // 打印结果
    optimizer.printResults(results, bestResult);
    
    logger.info('✅ lookbackPeriod 优化完成！');
    logger.info('');
    logger.info('💡 提示: 请将最佳 lookbackPeriod 值更新到 src/statistical-arbitrage/config.js 中:');
    logger.info('   lookbackPeriod: ' + bestResult.lookbackPeriod + ',');
    logger.info('');
    
  } catch (error) {
    logger.error('lookbackPeriod 优化失败:', error);
    throw error;
  }
}

main();

