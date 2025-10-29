/**
 * 参数优化脚本 - 针对特定交易对进行参数拟合
 */

import ccxt from 'ccxt';
import dotenv from 'dotenv';
import { StatisticalAnalyzer } from './StatisticalAnalyzer.js';
import { PairsStrategy } from './PairsStrategy.js';
import { Backtest } from './Backtest.js';
import { DataCollector } from './DataCollector.js';
import { logger } from '../utils/logger.js';
import config from './config.js';

dotenv.config();

class ParameterOptimizer {
  constructor(symbol1, symbol2, exchangeConfig, strategyConfig) {
    this.symbol1 = symbol1;
    this.symbol2 = symbol2;
    this.exchangeConfig = exchangeConfig;
    this.strategyConfig = strategyConfig;
    this.exchange = null;
    this.dataCollector = null;
  }

  async initialize() {
    logger.info('🔧 初始化参数优化器...');
    
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
      logger.info(`📡 使用代理: ${this.exchangeConfig.httpsProxy}`);
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
    logger.info(`📊 获取 ${this.symbol1} 和 ${this.symbol2} 的历史数据...`);
    logger.info(`⏰ 时间周期: ${timeframe}`);
    logger.info(`📊 数据点数: ${limit}`);
    
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
    
    logger.info(`✅ 获取 ${prices1.length} 条数据`);
    
    return { prices1, prices2, timestamps };
  }

  /**
   * 单次回测（使用指定参数）
   */
  async runSingleBacktest(prices1, prices2, timestamps, params) {
    const { entryThreshold, exitThreshold, stopLossThreshold } = params;
    
    // 创建临时策略配置
    const tempConfig = {
      ...this.strategyConfig,
      entryThreshold,
      exitThreshold,
      stopLossThreshold
    };
    
    // 创建回测引擎
    const backtest = new Backtest({
      initialCapital: tempConfig.initialCapital || 10000,
      positionSize: tempConfig.positionSize || 0.5,
      commission: tempConfig.commission || 0.001,
      strategy: tempConfig
    });
    
    // 运行回测
    const result = await backtest.run(
      this.symbol1,
      this.symbol2,
      prices1,
      prices2,
      timestamps
    );
    
    return result;
  }

  /**
   * 网格搜索最优参数
   */
  async gridSearch(prices1, prices2, timestamps, paramGrid) {
    logger.info('');
    logger.info('═'.repeat(60));
    logger.info('🔍 开始网格搜索...');
    logger.info('═'.repeat(60));
    
    const results = [];
    let bestResult = null;
    let bestScore = -Infinity;
    
    // 生成所有参数组合
    const combinations = [];
    for (const entry of paramGrid.entryThreshold) {
      for (const exit of paramGrid.exitThreshold) {
        for (const stopLoss of paramGrid.stopLossThreshold) {
          // 确保参数合理性：开仓 > 平仓，止损 > 开仓
          if (entry > exit && stopLoss > entry) {
            combinations.push({
              entryThreshold: entry,
              exitThreshold: exit,
              stopLossThreshold: stopLoss
            });
          }
        }
      }
    }
    
    logger.info(`📊 总共需要测试 ${combinations.length} 个参数组合`);
    logger.info('');
    
    // 测试每个参数组合
    for (let i = 0; i < combinations.length; i++) {
      const params = combinations[i];
      
      logger.info(`[${i + 1}/${combinations.length}] 测试参数:`);
      logger.info(`   开仓阈值: ${params.entryThreshold}`);
      logger.info(`   平仓阈值: ${params.exitThreshold}`);
      logger.info(`   止损阈值: ${params.stopLossThreshold}`);
      
      try {
        const result = await this.runSingleBacktest(
          prices1,
          prices2,
          timestamps,
          params
        );
        
        // 计算综合得分（考虑收益率、夏普比率、胜率）
        const score = this.calculateScore(result);
        
        const resultWithParams = {
          ...params,
          ...result,
          score
        };
        
        results.push(resultWithParams);
        
        logger.info(`   收益率: ${result.totalReturn.toFixed(2)}%`);
        logger.info(`   夏普比率: ${result.sharpeRatio.toFixed(2)}`);
        logger.info(`   胜率: ${result.winRate.toFixed(1)}%`);
        logger.info(`   交易次数: ${result.totalTrades}`);
        logger.info(`   综合得分: ${score.toFixed(2)}`);
        
        // 更新最佳结果
        if (score > bestScore) {
          bestScore = score;
          bestResult = resultWithParams;
          logger.info(`   ⭐ 当前最佳参数组合！`);
        }
        
        logger.info('');
        
      } catch (error) {
        logger.error(`   ❌ 回测失败: ${error.message}`);
        logger.info('');
      }
    }
    
    return { results, bestResult };
  }

  /**
   * 计算综合得分
   * 权重：收益率(40%) + 夏普比率(30%) + 胜率(20%) + 交易次数惩罚(10%)
   */
  calculateScore(result) {
    const returnScore = result.totalReturn * 0.4;  // 收益率权重40%
    const sharpeScore = result.sharpeRatio * 10 * 0.3;  // 夏普比率权重30%（放大10倍）
    const winRateScore = (result.winRate - 50) * 0.2;  // 胜率权重20%（50%为基准）
    
    // 交易次数惩罚：太少(<5)或太多(>50)都不好
    let tradeScore = 0;
    if (result.totalTrades >= 5 && result.totalTrades <= 50) {
      tradeScore = 5;
    } else if (result.totalTrades < 5) {
      tradeScore = result.totalTrades - 5;  // 负分
    } else {
      tradeScore = 50 - result.totalTrades;  // 负分
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
    logger.info('📊 参数优化结果');
    logger.info('═'.repeat(60));
    logger.info('');
    
    // 按得分排序
    const sortedResults = results.sort((a, b) => b.score - a.score);
    
    logger.info('🏆 TOP 5 参数组合:');
    logger.info('');
    
    sortedResults.slice(0, 5).forEach((result, index) => {
      logger.info(`${index + 1}. 开仓=${result.entryThreshold} | 平仓=${result.exitThreshold} | 止损=${result.stopLossThreshold}`);
      logger.info(`   收益率: ${result.totalReturn.toFixed(2)}%`);
      logger.info(`   夏普比率: ${result.sharpeRatio.toFixed(2)}`);
      logger.info(`   胜率: ${result.winRate.toFixed(1)}%`);
      logger.info(`   交易次数: ${result.totalTrades}`);
      logger.info(`   最大回撤: ${result.maxDrawdown.toFixed(2)}%`);
      logger.info(`   综合得分: ${result.score.toFixed(2)}`);
      logger.info('');
    });
    
    logger.info('═'.repeat(60));
    logger.info('⭐ 最佳参数组合:');
    logger.info('═'.repeat(60));
    logger.info(`开仓阈值 (entryThreshold): ${bestResult.entryThreshold}`);
    logger.info(`平仓阈值 (exitThreshold): ${bestResult.exitThreshold}`);
    logger.info(`止损阈值 (stopLossThreshold): ${bestResult.stopLossThreshold}`);
    logger.info('');
    logger.info(`收益率: ${bestResult.totalReturn.toFixed(2)}%`);
    logger.info(`夏普比率: ${bestResult.sharpeRatio.toFixed(2)}`);
    logger.info(`胜率: ${bestResult.winRate.toFixed(1)}%`);
    logger.info(`交易次数: ${bestResult.totalTrades}`);
    logger.info(`最大回撤: ${bestResult.maxDrawdown.toFixed(2)}%`);
    logger.info(`综合得分: ${bestResult.score.toFixed(2)}`);
    logger.info('');
  }
}

// 主函数
async function main() {
  try {
    // 配置参数
    const symbol1 = 'FIL/USDT';
    const symbol2 = 'OP/USDT';
    
    logger.info('');
    logger.info('═'.repeat(60));
    logger.info(`🎯 参数优化 - ${symbol1} ↔ ${symbol2}`);
    logger.info('═'.repeat(60));
    logger.info('');
    
    // 创建优化器
    const optimizer = new ParameterOptimizer(
      symbol1,
      symbol2,
      config.exchange,
      config.strategy
    );
    
    await optimizer.initialize();
    
    // 获取历史数据
    const timeframe = config.strategy.backtestTimeframe || '15m';
    const correlationHours = config.strategy.correlationPeriod || 720;
    const since = Date.now() - (correlationHours * 60 * 60 * 1000);
    
    // 计算需要的数据点数
    const timeframeMinutes = timeframe === '15m' ? 15 : timeframe === '1h' ? 60 : 15;
    const limit = Math.min(Math.ceil((correlationHours * 60) / timeframeMinutes), 1000);
    
    const { prices1, prices2, timestamps } = await optimizer.fetchHistoricalData(
      timeframe,
      limit,
      since
    );
    
    // 定义参数网格（精细化搜索）
    const paramGrid = {
      // 开仓阈值：1.5-4.0，步长0.2（更宽范围，覆盖保守到激进策略）
      entryThreshold: [1.5, 1.7, 1.9, 2.1, 2.3, 2.5, 2.7, 2.9, 3.1, 3.3, 3.5, 3.7, 3.9],
      
      // 平仓阈值：0.2-1.2，步长0.1（细粒度，找到最佳平仓点）
      exitThreshold: [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2],
      
      // 止损阈值：3.0-5.5，步长0.25（更宽止损范围，平衡风险控制）
      stopLossThreshold: [3.0, 3.25, 3.5, 3.75, 4.0, 4.25, 4.5, 4.75, 5.0, 5.25, 5.5]
    };
    
    logger.info('📊 参数搜索范围:');
    logger.info(`   开仓阈值: ${paramGrid.entryThreshold.join(', ')}`);
    logger.info(`   平仓阈值: ${paramGrid.exitThreshold.join(', ')}`);
    logger.info(`   止损阈值: ${paramGrid.stopLossThreshold.join(', ')}`);
    logger.info('');
    
    // 执行网格搜索
    const { results, bestResult } = await optimizer.gridSearch(
      prices1,
      prices2,
      timestamps,
      paramGrid
    );
    
    // 打印结果
    optimizer.printResults(results, bestResult);
    
    logger.info('✅ 参数优化完成！');
    logger.info('');
    logger.info('💡 提示: 请将最佳参数更新到 src/statistical-arbitrage/config.js 中');
    logger.info('');
    
  } catch (error) {
    logger.error('参数优化失败:', error);
    throw error;
  }
}

main();

