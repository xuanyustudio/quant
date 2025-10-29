/**
 * 投资组合优化器 - 从回测结果中选择最佳配对组合并分配资金
 */

import { logger } from '../utils/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import ccxt from 'ccxt';

class PortfolioOptimizer {
  constructor(backtestResults, totalCapital, riskProfile = 'balanced', minLiquidity = 1000000) {
    this.results = backtestResults;
    this.totalCapital = totalCapital;
    this.riskProfile = riskProfile; // 'conservative', 'balanced', 'aggressive'
    this.minLiquidity = minLiquidity; // 最小日交易额（美元），默认$1M
    this.liquidityCache = {}; // 缓存流动性数据
  }

  /**
   * 配置不同风险偏好的参数
   */
  getRiskConfig() {
    const configs = {
      conservative: {
        name: '保守型',
        maxPairs: 5,
        reserveRatio: 0.20,    // 20%应急储备
        activeRatio: 0.60,     // 60%用于交易
        mobileRatio: 0.20,     // 20%机动资金
        minSharpe: 1.2,
        maxDrawdown: 15,
        minWinRate: 55,
        minTrades: 5
      },
      balanced: {
        name: '平衡型',
        maxPairs: 10,
        reserveRatio: 0.15,
        activeRatio: 0.70,
        mobileRatio: 0.15,
        minSharpe: 1.0,
        maxDrawdown: 20,
        minWinRate: 52,
        minTrades: 5
      },
      aggressive: {
        name: '激进型',
        maxPairs: 20,
        reserveRatio: 0.10,
        activeRatio: 0.80,
        mobileRatio: 0.10,
        minSharpe: 0.8,
        maxDrawdown: 25,
        minWinRate: 50,
        minTrades: 5
      }
    };
    
    return configs[this.riskProfile] || configs.balanced;
  }

  /**
   * 查询交易对流动性
   */
  async checkLiquidity(symbol) {
    // 如果已缓存，直接返回
    if (this.liquidityCache[symbol]) {
      return this.liquidityCache[symbol];
    }
    
    try {
      // 配置代理
      const proxyUrls = [
        process.env.HTTPS_PROXY,
        'http://127.0.0.1:7897',
        'http://127.0.0.1:7890',
        'http://127.0.0.1:7891',
        'http://127.0.0.1:1087',
        'http://127.0.0.1:10809',
      ].filter(Boolean);
      
      const exchangeConfig = {
        enableRateLimit: true,
        timeout: 10000,
      };
      
      if (proxyUrls.length > 0) {
        exchangeConfig.httpsProxy = proxyUrls[0];
      }
      
      const exchange = new ccxt.binance(exchangeConfig);
      const ticker = await exchange.fetchTicker(symbol);
      
      const liquidity = {
        volume24h: ticker.quoteVolume || 0,
        price: ticker.last || 0,
        timestamp: Date.now()
      };
      
      this.liquidityCache[symbol] = liquidity;
      return liquidity;
      
    } catch (error) {
      logger.warn(`⚠️  无法获取 ${symbol} 流动性数据: ${error.message}`);
      return { volume24h: 0, price: 0, timestamp: Date.now() };
    }
  }

  /**
   * 批量检查配对流动性
   */
  async checkPairsLiquidity(pairs) {
    logger.info('');
    logger.info('💧 检查配对流动性...');
    logger.info(`   最小日交易额要求: $${(this.minLiquidity / 1000000).toFixed(1)}M`);
    logger.info('');
    
    const results = [];
    
    for (const pair of pairs) {
      const [symbol1, symbol2] = pair.pair;
      
      logger.info(`   查询 ${symbol1} 和 ${symbol2}...`);
      
      const [liq1, liq2] = await Promise.all([
        this.checkLiquidity(symbol1),
        this.checkLiquidity(symbol2)
      ]);
      
      const avgVolume = (liq1.volume24h + liq2.volume24h) / 2;
      const passesLiquidity = avgVolume >= this.minLiquidity;
      
      results.push({
        ...pair,
        liquidity: {
          symbol1: liq1.volume24h,
          symbol2: liq2.volume24h,
          average: avgVolume,
          passes: passesLiquidity
        }
      });
      
      const volumeText = `$${(avgVolume / 1000000).toFixed(2)}M`;
      const status = passesLiquidity ? '✅' : '❌';
      logger.info(`   ${status} 平均交易额: ${volumeText}`);
      
      // 添加延迟避免API限流
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    const passed = results.filter(r => r.liquidity.passes);
    const failed = results.length - passed.length;
    
    logger.info('');
    logger.info(`✅ 流动性检查完成: ${passed.length} 个通过, ${failed} 个被过滤`);
    
    return results;
  }

  /**
   * 筛选符合标准的配对（包括流动性检查）
   */
  async filterQualifiedPairs() {
    const config = this.getRiskConfig();
    
    logger.info('');
    logger.info('🔍 筛选符合标准的配对...');
    logger.info('   最小夏普比率: ' + config.minSharpe);
    logger.info('   最大回撤: ' + config.maxDrawdown + '%');
    logger.info('   最小胜率: ' + config.minWinRate + '%');
    logger.info('   最小交易次数: ' + config.minTrades);
    logger.info('');
    
    // 第一步：基本指标筛选
    const basicQualified = this.results.filter(r => {
      return r.totalReturn > 0 &&
             r.sharpeRatio >= config.minSharpe &&
             r.maxDrawdown <= config.maxDrawdown &&
             r.winRate >= config.minWinRate &&
             r.totalTrades >= config.minTrades;
    });
    
    logger.info(`✅ 基本指标筛选: ${basicQualified.length} 个配对符合标准`);
    
    if (basicQualified.length === 0) {
      return [];
    }
    
    // 第二步：流动性筛选
    const withLiquidity = await this.checkPairsLiquidity(basicQualified);
    const qualified = withLiquidity.filter(r => r.liquidity.passes);
    
    return qualified;
  }

  /**
   * 计算综合得分
   */
  calculateScore(result) {
    // 权重分配
    const weights = {
      return: 0.25,      // 收益率 25%
      sharpe: 0.35,      // 夏普比率 35% (最重要)
      winRate: 0.15,     // 胜率 15%
      drawdown: 0.15,    // 回撤 15% (负向)
      trades: 0.10       // 交易次数适度性 10%
    };
    
    // 归一化分数
    const returnScore = result.totalReturn;  // 0-100
    const sharpeScore = Math.min(result.sharpeRatio * 20, 100);  // 归一化到0-100
    const winRateScore = result.winRate;  // 0-100
    const drawdownScore = Math.max(0, 100 - result.maxDrawdown * 5);  // 回撤越小越好
    
    // 交易次数适度性：10-25次最佳
    let tradeScore = 0;
    if (result.totalTrades >= 10 && result.totalTrades <= 25) {
      tradeScore = 100;
    } else if (result.totalTrades >= 5 && result.totalTrades < 10) {
      tradeScore = 50 + (result.totalTrades - 5) * 10;
    } else if (result.totalTrades > 25) {
      tradeScore = Math.max(0, 100 - (result.totalTrades - 25) * 2);
    } else {
      tradeScore = result.totalTrades * 10;
    }
    
    const totalScore = 
      returnScore * weights.return +
      sharpeScore * weights.sharpe +
      winRateScore * weights.winRate +
      drawdownScore * weights.drawdown +
      tradeScore * weights.trades;
    
    return totalScore;
  }

  /**
   * 检查配对重叠度（避免选择高度重叠的配对）
   */
  checkOverlap(selectedPairs, newPair) {
    const newSymbols = newPair.pair;
    
    // 计算与已选配对的重叠度
    let overlapCount = 0;
    for (const selected of selectedPairs) {
      const selectedSymbols = selected.pair;
      const overlap = newSymbols.filter(s => selectedSymbols.includes(s));
      overlapCount += overlap.length;
    }
    
    // 如果重叠度太高（超过50%），返回false
    const overlapRatio = overlapCount / (selectedPairs.length * 2);
    return overlapRatio < 0.5;
  }

  /**
   * 选择最佳配对组合
   */
  selectOptimalPairs(qualifiedPairs) {
    const config = this.getRiskConfig();
    const maxPairs = Math.min(config.maxPairs, qualifiedPairs.length);
    
    logger.info('');
    logger.info('🎯 选择最佳 ' + maxPairs + ' 个配对...');
    logger.info('');
    
    // 计算每个配对的综合得分
    const scored = qualifiedPairs.map(r => ({
      ...r,
      compositeScore: this.calculateScore(r)
    }));
    
    // 按得分排序
    scored.sort((a, b) => b.compositeScore - a.compositeScore);
    
    // 选择配对，考虑多样性（避免重叠）
    const selected = [];
    for (const pair of scored) {
      if (selected.length >= maxPairs) break;
      
      // 检查是否与已选配对重叠太多
      if (selected.length === 0 || this.checkOverlap(selected, pair)) {
        selected.push(pair);
      }
    }
    
    return selected;
  }

  /**
   * 分配资金
   */
  allocateCapital(selectedPairs) {
    const config = this.getRiskConfig();
    
    // 计算各部分资金
    const reserveFund = this.totalCapital * config.reserveRatio;
    const activeFund = this.totalCapital * config.activeRatio;
    const mobileFund = this.totalCapital * config.mobileRatio;
    
    logger.info('');
    logger.info('💰 资金分配方案：');
    logger.info('   总资金: $' + this.totalCapital.toLocaleString());
    logger.info('   应急储备 (' + (config.reserveRatio * 100) + '%): $' + reserveFund.toLocaleString());
    logger.info('   活跃交易 (' + (config.activeRatio * 100) + '%): $' + activeFund.toLocaleString());
    logger.info('   机动资金 (' + (config.mobileRatio * 100) + '%): $' + mobileFund.toLocaleString());
    logger.info('');
    
    // 计算总得分用于加权分配
    const totalScore = selectedPairs.reduce((sum, p) => sum + p.compositeScore, 0);
    
    // 为每个配对分配资金（按得分比例）
    const allocations = selectedPairs.map((pair, index) => {
      const allocation = (pair.compositeScore / totalScore) * activeFund;
      const positionSize = 0.5; // 50%仓位比例
      const tradeAmount = allocation * positionSize;
      
      return {
        rank: index + 1,
        pair: pair.pair,
        allocation: allocation,
        tradeAmount: tradeAmount,
        scoreWeight: (pair.compositeScore / totalScore * 100),
        liquidity: pair.liquidity, // 保留流动性信息
        metrics: {
          return: pair.totalReturn,
          sharpe: pair.sharpeRatio,
          winRate: pair.winRate,
          maxDrawdown: pair.maxDrawdown,
          trades: pair.totalTrades,
          score: pair.compositeScore
        }
      };
    });
    
    return {
      reserveFund,
      activeFund,
      mobileFund,
      allocations
    };
  }

  /**
   * 生成投资组合报告
   */
  async generateReport() {
    logger.info('');
    logger.info('═'.repeat(70));
    logger.info('📊 投资组合优化报告');
    logger.info('═'.repeat(70));
    logger.info('');
    
    const config = this.getRiskConfig();
    logger.info('🎯 风险偏好: ' + config.name);
    logger.info('💰 总资金: $' + this.totalCapital.toLocaleString());
    logger.info('');
    
    // 步骤1: 筛选合格配对（包括流动性检查）
    const qualified = await this.filterQualifiedPairs();
    
    if (qualified.length === 0) {
      logger.warn('⚠️  没有找到符合标准的配对！');
      logger.warn('建议：');
      logger.warn('1. 降低筛选标准（流动性/夏普比率等）');
      logger.warn('2. 增加回测的交易对数量');
      logger.warn('3. 优化策略参数');
      return null;
    }
    
    // 步骤2: 选择最佳组合
    const selected = this.selectOptimalPairs(qualified);
    
    // 步骤3: 分配资金
    const portfolio = this.allocateCapital(selected);
    
    // 步骤4: 打印详细信息
    this.printDetailedReport(portfolio);
    
    // 步骤5: 生成配置文件
    this.generateConfigFile(portfolio);
    
    return portfolio;
  }

  /**
   * 打印详细报告
   */
  printDetailedReport(portfolio) {
    logger.info('═'.repeat(70));
    logger.info('💼 选定配对详情');
    logger.info('═'.repeat(70));
    logger.info('');
    
    portfolio.allocations.forEach(alloc => {
      logger.info('【排名 #' + alloc.rank + '】' + alloc.pair[0] + ' / ' + alloc.pair[1]);
      logger.info('  💰 分配资金: $' + alloc.allocation.toFixed(2) + 
                  ' (占活跃资金 ' + alloc.scoreWeight.toFixed(1) + '%)');
      logger.info('  📊 每笔交易: $' + alloc.tradeAmount.toFixed(2));
      
      // 显示流动性信息
      if (alloc.liquidity) {
        const liq1 = (alloc.liquidity.symbol1 / 1000000).toFixed(2);
        const liq2 = (alloc.liquidity.symbol2 / 1000000).toFixed(2);
        const avgLiq = (alloc.liquidity.average / 1000000).toFixed(2);
        const impact = ((alloc.tradeAmount / alloc.liquidity.average) * 100).toFixed(3);
        logger.info(`  💧 流动性: $${liq1}M / $${liq2}M (平均: $${avgLiq}M)`);
        logger.info(`  📊 市场影响: ${impact}% ${parseFloat(impact) < 0.05 ? '✅' : parseFloat(impact) < 0.1 ? '⚠️' : '❌'}`);
      }
      
      logger.info('  📈 收益率: ' + alloc.metrics.return.toFixed(2) + '%');
      logger.info('  🎯 夏普比率: ' + alloc.metrics.sharpe.toFixed(2));
      logger.info('  ✅ 胜率: ' + alloc.metrics.winRate.toFixed(1) + '%');
      logger.info('  📉 最大回撤: ' + alloc.metrics.maxDrawdown.toFixed(2) + '%');
      logger.info('  🔄 交易次数: ' + alloc.metrics.trades);
      logger.info('  ⭐ 综合得分: ' + alloc.metrics.score.toFixed(2));
      logger.info('');
    });
    
    // 投资组合预期表现
    logger.info('═'.repeat(70));
    logger.info('📈 投资组合预期表现（基于回测）');
    logger.info('═'.repeat(70));
    logger.info('');
    
    const weightedReturn = portfolio.allocations.reduce(
      (sum, a) => sum + a.metrics.return * (a.scoreWeight / 100), 0
    );
    const avgSharpe = portfolio.allocations.reduce(
      (sum, a) => sum + a.metrics.sharpe, 0
    ) / portfolio.allocations.length;
    const maxDrawdown = Math.max(...portfolio.allocations.map(a => a.metrics.maxDrawdown));
    const avgWinRate = portfolio.allocations.reduce(
      (sum, a) => sum + a.metrics.winRate, 0
    ) / portfolio.allocations.length;
    
    logger.info('  预期月收益率: ' + weightedReturn.toFixed(2) + '%');
    logger.info('  平均夏普比率: ' + avgSharpe.toFixed(2));
    logger.info('  组合最大回撤: ' + maxDrawdown.toFixed(2) + '%');
    logger.info('  平均胜率: ' + avgWinRate.toFixed(1) + '%');
    logger.info('');
    logger.info('  ⚠️  注意：实盘表现通常为回测的60-80%');
    logger.info('');
  }

  /**
   * 生成实盘配置文件
   */
  generateConfigFile(portfolio) {
    const config = {
      // 基本设置
      totalCapital: this.totalCapital,
      riskProfile: this.riskProfile,
      
      // 资金分配
      funds: {
        reserve: portfolio.reserveFund,
        active: portfolio.activeFund,
        mobile: portfolio.mobileFund
      },
      
      // 配对列表
      pairs: portfolio.allocations.map(a => ({
        symbols: a.pair,
        allocation: a.allocation,
        tradeAmount: a.tradeAmount,
        weight: a.scoreWeight
      })),
      
      // 风险控制
      riskControl: {
        maxDrawdown: 15,        // 最大回撤限制
        maxDailyLoss: this.totalCapital * 0.05,  // 5%
        maxPositions: portfolio.allocations.length,
        stopLossMultiplier: 1.5  // 止损为回测最大回撤的1.5倍
      },
      
      // 生成时间
      generatedAt: new Date().toISOString()
    };
    
    const filename = 'live_trading_config_' + Date.now() + '.json';
    const filepath = path.join('./output', filename);
    
    fs.writeFileSync(filepath, JSON.stringify(config, null, 2));
    
    logger.info('═'.repeat(70));
    logger.info('📁 实盘配置已保存');
    logger.info('═'.repeat(70));
    logger.info('');
    logger.info('  文件路径: ' + filepath);
    logger.info('');
    logger.info('💡 下一步：');
    logger.info('  1. 仔细审查配置文件');
    logger.info('  2. 使用小额资金进行纸上交易测试');
    logger.info('  3. 确认无误后再开始实盘交易');
    logger.info('');
  }
}

// 主函数 - 可以作为独立脚本运行
async function main() {
  try {
    // 从命令行参数获取回测结果文件和资金
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
      logger.info('');
      logger.info('用法: node portfolio-optimizer.js <回测结果文件> <总资金> [风险偏好] [最小流动性]');
      logger.info('');
      logger.info('示例: node portfolio-optimizer.js ./output/backtest_results.json 1000 balanced 1000000');
      logger.info('');
      logger.info('参数说明:');
      logger.info('  回测结果文件: backtest_results_*.json 文件路径');
      logger.info('  总资金: 投入的总资金（美元）');
      logger.info('  风险偏好: conservative | balanced | aggressive [默认: balanced]');
      logger.info('  最小流动性: 最小日交易额（美元） [默认: 1000000 = $1M]');
      logger.info('');
      logger.info('风险偏好选项:');
      logger.info('  - conservative: 保守型（5个配对，80%资金利用率）');
      logger.info('  - balanced:     平衡型（10个配对，85%资金利用率）');
      logger.info('  - aggressive:   激进型（20个配对，90%资金利用率）');
      logger.info('');
      logger.info('流动性建议:');
      logger.info('  - 新手: 5000000 ($5M) - 更安全');
      logger.info('  - 进阶: 1000000 ($1M) - 平衡');
      logger.info('  - 激进: 500000 ($500K) - 更多机会但风险更高');
      logger.info('');
      return;
    }
    
    const resultsFile = args[0];
    const totalCapital = parseFloat(args[1]);
    const riskProfile = args[2] || 'balanced';
    const minLiquidity = args[3] ? parseFloat(args[3]) : 500000; // 默认$1M
    
    // 读取回测结果
    logger.info('📖 读取回测结果...');
    const resultsData = JSON.parse(fs.readFileSync(resultsFile, 'utf-8'));
    
    logger.info(`✅ 已读取 ${resultsData.length} 个回测结果`);
    logger.info('');
    
    // 创建优化器
    const optimizer = new PortfolioOptimizer(resultsData, totalCapital, riskProfile, minLiquidity);
    
    // 生成报告（异步）
    await optimizer.generateReport();
    
    logger.info('✅ 投资组合优化完成！');
    logger.info('');
    
  } catch (error) {
    logger.error('投资组合优化失败:', error);
    throw error;
  }
}

// 如果直接运行此脚本（兼容Windows）
const __filename = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] && (
  process.argv[1] === __filename ||
  process.argv[1].replace(/\\/g, '/') === __filename.replace(/\\/g, '/') ||
  process.argv[1].endsWith('portfolio-optimizer.js')
);

if (isMainModule) {
  main();
}

export default PortfolioOptimizer;

