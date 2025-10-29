/**
 * 回测引擎
 * 用于测试配对交易策略的历史表现
 */

import { logger } from '../utils/logger.js';
import { PairsStrategy } from './PairsStrategy.js';
import { FuturesStrategy } from './FuturesStrategy.js';
import { StatisticalAnalyzer } from './StatisticalAnalyzer.js';
import BacktestVisualizer from './BacktestVisualizer.js';
import fs from 'fs';
import path from 'path';

export class Backtest {
  constructor(config = {}) {
    this.config = config;
    this.strategyConfig = config.strategy || {};  // 保存策略配置用于报告
    
    // ⭐ 支持选择策略类型：spot（现货）或 futures（合约）
    const strategyType = this.strategyConfig.strategyType || 'spot';
    
    if (strategyType === 'futures') {
      this.strategy = new FuturesStrategy(this.strategyConfig);
      this.strategyType = 'futures';
    } else {
      this.strategy = new PairsStrategy(this.strategyConfig);
      this.strategyType = 'spot';
    }
    
    this.analyzer = new StatisticalAnalyzer(this.strategyConfig);
    this.visualizer = new BacktestVisualizer('./output');
    
    // 回测参数
    this.initialCapital = config.initialCapital || 10000;
    this.positionSize = config.positionSize || 0.5; // 每次使用资金的比例
    this.commission = config.commission || 0.001; // 手续费 0.1%
    
    // 回测结果
    this.results = {
      trades: [],
      equity: [],
      drawdown: []
    };
  }

  /**
   * 运行回测
   */
  async run(symbol1, symbol2, prices1, prices2, timestamps, options = {}) {
    const startTime = new Date();
    const dataStartTime = new Date(timestamps[0]);
    const dataEndTime = new Date(timestamps[timestamps.length - 1]);
    const generateReport = options.generateReport !== false; // 默认生成报告
    
    // 获取初始价格（第一个数据点）
    const initialPrice1 = prices1[0];
    const initialPrice2 = prices2[0];
    
    // 计算相关系数
    const correlation = this.analyzer.calculateCorrelation(prices1, prices2);
    
    // 只在生成详细报告时打印详细信息
    if (generateReport) {
      logger.info('');
      logger.info('═'.repeat(60));
      logger.info(`📊 开始回测: ${symbol1} vs ${symbol2}`);
      logger.info('═'.repeat(60));
      
      // ⭐ 显示策略类型
      if (this.strategyType === 'futures') {
        logger.info('🔮 策略类型: 合约策略（市场中性对冲）');
        logger.info(`   杠杆倍数: ${this.strategyConfig.leverage || 1}x`);
        logger.info(`   保证金模式: ${this.strategyConfig.marginType || 'cross'}`);
        logger.info('   做空方式: 使用永续合约真正做空 ✅');
      } else {
        logger.info('💵 策略类型: 现货策略（传统模式）');
        logger.info('   做空方式: 卖出现货（非真正做空）⚠️');
      }
      logger.info('');
      
      logger.info(`⏰ 回测开始时间: ${startTime.toLocaleString('zh-CN')}`);
      logger.info(`📅 数据时间范围: ${dataStartTime.toLocaleString('zh-CN')} - ${dataEndTime.toLocaleString('zh-CN')}`);
      logger.info(`📊 数据点数量: ${prices1.length} 个`);
      logger.info(`📈 相关系数: ${correlation.toFixed(3)}`);
      
      // 🔧 测试模式提示
      if (!this.strategyConfig.enforceCorrelation) {
        logger.info('');
        logger.info('⚠️  测试模式：相关性检查已禁用！');
        logger.info('   所有Z-Score偏离都会触发交易，无需满足相关性要求');
        logger.info('');
      }
      
      logger.info(`💰 初始资金: ${this.initialCapital.toFixed(2)} USDT`);
      logger.info(`💵 初始价格:`);
      logger.info(`   ${symbol1}: $${initialPrice1.toFixed(8)}`);
      logger.info(`   ${symbol2}: $${initialPrice2.toFixed(8)}`);
      logger.info(`   价格比率: ${(initialPrice1 / initialPrice2).toFixed(6)}`);
      logger.info('');
    }
    
    // 初始化
    this.strategy.reset();
    let capital = this.initialCapital;
    let peakCapital = capital;
    const equity = [capital];
    const drawdown = [0];
    let tradeCount = 0;
    
    const lookback = this.strategy.lookbackPeriod;
    
    // 计算预热期时长
    const warmupPeriodMinutes = lookback * this.getTimeframeMinutes(timestamps);
    const warmupEndTime = new Date(timestamps[lookback]);
    if (generateReport) {
      logger.info(`🔥 回测预热期: 前${lookback}个数据点 (约${(warmupPeriodMinutes/60).toFixed(1)}小时)`);
      logger.info(`   预热结束时间: ${warmupEndTime.toLocaleString('zh-CN')}`);
      logger.info(`   从此时间开始执行交易逻辑`);
      logger.info('');
    }
    
    // 遍历历史数据
    for (let i = lookback; i < prices1.length; i++) {
      // ⚠️ 注意：传入lookback+1个点（包含当前点），用于计算价差和Z-score
      // analyzePair内部会正确处理：使用前lookback个点的统计特征来计算当前点的Z-score
      const window1 = prices1.slice(i - lookback, i + 1);
      const window2 = prices2.slice(i - lookback, i + 1);
      
      const pairKey = `${symbol1}_${symbol2}`;
      
      // 分析配对（传入pairKey以便检查当前持仓）
      const analysis = this.strategy.analyzePair(
        symbol1, 
        symbol2, 
        window1, 
        window2,
        pairKey
      );
      
      if (!analysis.viable) {
        // ⚠️ 修复：记录所有因相关性不足而跳过的高Z-score点
        // 先计算Z-score看看是否值得记录
        const tempSpread = this.analyzer.calculateSpread(window1, window2, 'normalized_ratio');
        const tempZScores = this.analyzer.calculateZScore(tempSpread, this.strategy.lookbackPeriod);
        const tempZScore = tempZScores[tempZScores.length - 1];
        
        if (generateReport && Math.abs(tempZScore) > this.strategyConfig.entryThreshold) {
          const timestamp = new Date(timestamps[i]).toLocaleString('zh-CN');
          logger.warn(`⚠️  Z-Score超过阈值但被跳过 [${timestamp}] (索引: ${i})`);
          logger.warn(`   Z-Score: ${tempZScore.toFixed(3)}`);
          logger.warn(`   跳过原因: ${analysis.reason}`);
          logger.warn('');
        } else if (generateReport && (i === lookback || (i % 100 === 0))) {
          logger.debug(`⏭️  跳过 ${new Date(timestamps[i]).toLocaleString('zh-CN')}: ${analysis.reason}`);
        }
        continue;
      }
      
      const currentPrice1 = prices1[i];
      const currentPrice2 = prices2[i];
      const currentZScore = analysis.zScore.current;
      const signal = analysis.signal;
      
      // 记录所有Z-score超过阈值的时刻（便于调试）
      if (generateReport && Math.abs(currentZScore) > this.strategyConfig.entryThreshold) {
        const timestamp = new Date(timestamps[i]).toLocaleString('zh-CN');
        logger.info(`🎯 检测到强信号 [${timestamp}] (数据索引: ${i})`);
        logger.info(`   Z-Score: ${currentZScore.toFixed(3)}`);
        logger.info(`   信号: ${signal.action} - ${signal.reason}`);
        logger.info(`   价格: ${symbol1}=$${currentPrice1.toFixed(8)}, ${symbol2}=$${currentPrice2.toFixed(8)}`);
        logger.info(`   相关性: ${analysis.correlation.toFixed(3)}`);
        logger.info(`   价差: 当前=${analysis.spread.current.toFixed(6)}, 均值=${analysis.spread.mean.toFixed(6)}, 标准差=${analysis.spread.std.toFixed(6)}`);
      }
      
      // 检查当前持仓
      const position = this.strategy.getPosition(pairKey);
      
      if (position) {
        // 已有持仓，检查是否需要平仓
        if (generateReport && Math.abs(currentZScore) > this.strategyConfig.entryThreshold) {
          logger.info(`   ⚠️  已有持仓，无法开新仓`);
          logger.info(`   当前持仓: ${position.type}, 开仓时间: ${new Date(position.entryTime).toLocaleString('zh-CN')}`);
          logger.info(`   开仓Z-Score: ${position.entryZScore.toFixed(3)}, 当前盈亏: ${position.currentPnL ? position.currentPnL.toFixed(2) : 'N/A'} USDT`);
          logger.info('');
        }
        const updated = this.strategy.updatePosition(
          pairKey,
          currentPrice1,
          currentPrice2,
          currentZScore,
          timestamps[i]  // 传入回测时间戳
        );
        
        if (updated && updated.status === 'CLOSED') {
          // 平仓完成
          tradeCount++;
          
          // 计算手续费详情
          const commissionDetails = this.calculateCommissionDetails(
            updated,
            currentPrice1,
            currentPrice2
          );
          
          const pnl = this.calculatePnLWithCommission(
            updated,
            currentPrice1,
            currentPrice2
          );
          
          capital += pnl;
          
          if (generateReport) {
            logger.info('');
            logger.info('─'.repeat(60));
            logger.info(`💼 第 ${tradeCount} 笔交易完成`);
            logger.info('─'.repeat(60));
            logger.info(`📅 开仓时间: ${new Date(updated.entryTime).toLocaleString('zh-CN')}`);
            logger.info(`📅 平仓时间: ${new Date(timestamps[i]).toLocaleString('zh-CN')}`);
            logger.info(`⏱️  持仓时长: ${((timestamps[i] - updated.entryTime) / 1000 / 60).toFixed(0)} 分钟`);
            logger.info('');
            logger.info(`📈 开仓价格:`);
            logger.info(`   ${symbol1}: $${updated.entryPrice1.toFixed(8)} × ${updated.quantity1.toFixed(2)} = $${(updated.entryPrice1 * updated.quantity1).toFixed(2)}`);
            logger.info(`   ${symbol2}: $${updated.entryPrice2.toFixed(8)} × ${updated.quantity2.toFixed(2)} = $${(updated.entryPrice2 * updated.quantity2).toFixed(2)}`);
            logger.info(`   开仓手续费: $${commissionDetails.entryFee.toFixed(2)}`);
            logger.info('');
            logger.info(`📉 平仓价格:`);
            logger.info(`   ${symbol1}: $${currentPrice1.toFixed(8)} × ${updated.quantity1.toFixed(2)} = $${(currentPrice1 * updated.quantity1).toFixed(2)}`);
            logger.info(`   ${symbol2}: $${currentPrice2.toFixed(8)} × ${updated.quantity2.toFixed(2)} = $${(currentPrice2 * updated.quantity2).toFixed(2)}`);
            logger.info(`   平仓手续费: $${commissionDetails.exitFee.toFixed(2)}`);
            logger.info('');
            logger.info(`💰 盈亏详情:`);
            logger.info(`   价格变动盈亏: $${commissionDetails.pnlBeforeFee.toFixed(2)}`);
            logger.info(`   总手续费: $${commissionDetails.totalFee.toFixed(2)}`);
            logger.info(`   净盈亏: $${pnl.toFixed(2)} (${((pnl / updated.capital) * 100).toFixed(2)}%)`);
            logger.info(`   账户余额: $${capital.toFixed(2)}`);
            logger.info('');
          }
          
          this.results.trades.push({
            ...updated,
            pnl,
            capital,
            timestamp: timestamps[i],
            tradeNumber: tradeCount,
            commissionDetails
          });
        }
      } else {
        // 无持仓，检查是否有开仓信号
        if (signal.action === 'OPEN_LONG' || signal.action === 'OPEN_SHORT') {
          const positionCapital = capital * this.positionSize;
          
          if (generateReport) {
            logger.info('');
            logger.info('─'.repeat(60));
            logger.info(`📅 开仓时间: ${new Date(timestamps[i]).toLocaleString('zh-CN')}`);
            logger.info(`💵 账户余额: ${capital.toFixed(2)} USDT`);
            logger.info(`📊 Z-Score: ${signal.zScore.toFixed(2)}`);
            logger.info(`📈 信号类型: ${signal.action === 'OPEN_LONG' ? '做多价差（买入低估，卖出高估）' : '做空价差（卖出高估，买入低估）'}`);
            logger.info('');
          }
          
          // 开仓（传入时间戳）
          this.strategy.openPosition(
            pairKey,
            symbol1,
            symbol2,
            signal,
            currentPrice1,
            currentPrice2,
            positionCapital,
            timestamps[i]
          );
        } else if (generateReport && Math.abs(currentZScore) > this.strategyConfig.entryThreshold) {
          // Z-score超过阈值但没有开仓信号，记录原因
          logger.warn(`   ⚠️  Z-Score超过阈值但无开仓信号`);
          logger.warn(`   当前信号: ${signal.action}`);
          logger.warn(`   可能原因: 信号生成逻辑问题`);
          logger.info('');
        }
      }
      
      // 记录权益曲线
      equity.push(capital);
      
      // 计算回撤
      if (capital > peakCapital) {
        peakCapital = capital;
      }
      const currentDrawdown = ((peakCapital - capital) / peakCapital) * 100;
      drawdown.push(currentDrawdown);
    }
    
    // 强制平仓所有未平仓的持仓
    const openPositions = this.strategy.getAllPositions();
    for (const position of openPositions) {
      const lastPrice1 = prices1[prices1.length - 1];
      const lastPrice2 = prices2[prices2.length - 1];
      
      // ⚠️ 修复：需要传入足够的历史数据来计算最后一个Z-score
      // 因为calculateZScore需要lookback个历史点来计算当前点的Z-score
      // 所以我们传入最后(lookback+1)个点，这样能正确计算最后一个点的Z-score
      const dataLength = Math.min(lookback + 1, prices1.length);
      const lastZScore = this.analyzer.calculateZScore(
        this.analyzer.calculateSpread(
          prices1.slice(-dataLength),
          prices2.slice(-dataLength)
        ),
        lookback
      ).pop();
      
      const closed = this.strategy.closePosition(
        position.pairKey,
        lastPrice1,
        lastPrice2,
        { action: 'CLOSE', zScore: lastZScore, reason: '回测结束' },
        timestamps[timestamps.length - 1]  // 传入最后一个时间戳
      );
      
      if (closed) {
        tradeCount++;
        
        // 计算手续费详情
        const commissionDetails = this.calculateCommissionDetails(closed, lastPrice1, lastPrice2);
        const pnl = this.calculatePnLWithCommission(closed, lastPrice1, lastPrice2);
        capital += pnl;
        
        if (generateReport) {
          logger.info('');
          logger.info('─'.repeat(60));
          logger.info(`💼 第 ${tradeCount} 笔交易完成（强制平仓）`);
          logger.info('─'.repeat(60));
          logger.info(`📅 开仓时间: ${new Date(closed.entryTime).toLocaleString('zh-CN')}`);
          logger.info(`📅 平仓时间: ${dataEndTime.toLocaleString('zh-CN')}`);
          logger.info(`⏱️  持仓时长: ${((timestamps[timestamps.length - 1] - closed.entryTime) / 1000 / 60).toFixed(0)} 分钟`);
          logger.info('');
          logger.info(`📈 开仓价格:`);
          logger.info(`   ${closed.symbol1}: $${closed.entryPrice1.toFixed(8)} × ${closed.quantity1.toFixed(2)} = $${(closed.entryPrice1 * closed.quantity1).toFixed(2)}`);
          logger.info(`   ${closed.symbol2}: $${closed.entryPrice2.toFixed(8)} × ${closed.quantity2.toFixed(2)} = $${(closed.entryPrice2 * closed.quantity2).toFixed(2)}`);
          logger.info(`   开仓手续费: $${commissionDetails.entryFee.toFixed(2)}`);
          logger.info('');
          logger.info(`📉 平仓价格:`);
          logger.info(`   ${closed.symbol1}: $${lastPrice1.toFixed(8)} × ${closed.quantity1.toFixed(2)} = $${(lastPrice1 * closed.quantity1).toFixed(2)}`);
          logger.info(`   ${closed.symbol2}: $${lastPrice2.toFixed(8)} × ${closed.quantity2.toFixed(2)} = $${(lastPrice2 * closed.quantity2).toFixed(2)}`);
          logger.info(`   平仓手续费: $${commissionDetails.exitFee.toFixed(2)}`);
          logger.info('');
          logger.info(`💰 盈亏详情:`);
          logger.info(`   价格变动盈亏: $${commissionDetails.pnlBeforeFee.toFixed(2)}`);
          logger.info(`   总手续费: $${commissionDetails.totalFee.toFixed(2)}`);
          logger.info(`   净盈亏: $${pnl.toFixed(2)} (${((pnl / closed.capital) * 100).toFixed(2)}%)`);
          logger.info(`   最终余额: $${capital.toFixed(2)}`);
          logger.info('');
        }
        
        this.results.trades.push({
          ...closed,
          pnl,
          capital,
          timestamp: timestamps[timestamps.length - 1],
          tradeNumber: tradeCount,
          commissionDetails
        });
      }
    }
    
    // 保存结果
    this.results.equity = equity;
    this.results.drawdown = drawdown;
    this.results.finalCapital = capital;
    this.results.timestamps = timestamps;
    this.results.totalTrades = tradeCount;
    
    const endTime = new Date();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    // 生成报告
    const report = this.generateReport();
    
    logger.info('');
    logger.info('═'.repeat(60));
    logger.info('📈 回测完成');
    logger.info('═'.repeat(60));
    logger.info(`⏰ 回测结束时间: ${endTime.toLocaleString('zh-CN')}`);
    logger.info(`⏱️  回测用时: ${duration} 秒`);
    logger.info(`🔄 总交易次数: ${tradeCount} 笔`);
    
    // 生成可视化图表
    let reportFilename = '';
    if (generateReport) {
      try {
        const chartResult = this.visualizer.generateChart(
          symbol1,
          symbol2,
          prices1,
          prices2,
          timestamps,
          this.results.trades,
          report
        );
        reportFilename = chartResult.filename;
        logger.info(`📊 图表已保存: ${chartResult.filepath}`);
      } catch (error) {
        logger.error('生成图表失败:', error.message);
      }
    }
    
    return {
      ...report,
      correlation,  // 相关系数
      reportFilename,  // 实际生成的文件名
      trades: this.results.trades,
      equity: this.results.equity,
      drawdown: this.results.drawdown,
      timestamps: this.results.timestamps
    };
  }

  /**
   * 计算手续费详情
   */
  calculateCommissionDetails(position, exitPrice1, exitPrice2) {
    const { type, entryPrice1, entryPrice2, quantity1, quantity2 } = position;
    
    // 入场手续费
    const entryCommission1 = quantity1 * entryPrice1 * this.commission;
    const entryCommission2 = quantity2 * entryPrice2 * this.commission;
    const entryFee = entryCommission1 + entryCommission2;
    
    // 出场手续费
    const exitCommission1 = quantity1 * exitPrice1 * this.commission;
    const exitCommission2 = quantity2 * exitPrice2 * this.commission;
    const exitFee = exitCommission1 + exitCommission2;
    
    // 总手续费
    const totalFee = entryFee + exitFee;
    
    // 计算盈亏（不含手续费）
    const pnlCalc = this.strategy.calculatePnL(position, exitPrice1, exitPrice2);
    
    return {
      entryFee,
      exitFee,
      totalFee,
      pnlBeforeFee: pnlCalc.total,
      netPnl: pnlCalc.total - totalFee
    };
  }

  /**
   * 计算包含手续费的盈亏
   */
  calculatePnLWithCommission(position, exitPrice1, exitPrice2) {
    const { type, entryPrice1, entryPrice2, quantity1, quantity2 } = position;
    
    // 入场手续费
    const entryCommission1 = quantity1 * entryPrice1 * this.commission;
    const entryCommission2 = quantity2 * entryPrice2 * this.commission;
    
    // 出场手续费
    const exitCommission1 = quantity1 * exitPrice1 * this.commission;
    const exitCommission2 = quantity2 * exitPrice2 * this.commission;
    
    // 总手续费
    const totalCommission = entryCommission1 + entryCommission2 + 
                           exitCommission1 + exitCommission2;
    
    // 计算盈亏（不含手续费）
    const pnlCalc = this.strategy.calculatePnL(position, exitPrice1, exitPrice2);
    
    // 扣除手续费
    return pnlCalc.total - totalCommission;
  }

  /**
   * 生成回测报告
   */
  generateReport() {
    const trades = this.results.trades;
    const equity = this.results.equity;
    const drawdown = this.results.drawdown;
    
    if (trades.length === 0) {
      return {
        totalTrades: 0,
        message: '没有产生交易'
      };
    }

    // 基础统计
    const stats = this.strategy.getStatistics();
    
    // 盈利交易
    const winningTrades = trades.filter(t => t.pnl > 0);
    const losingTrades = trades.filter(t => t.pnl <= 0);
    
    // 总盈亏
    const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
    const totalReturn = ((this.results.finalCapital - this.initialCapital) / this.initialCapital) * 100;
    
    // 最大回撤
    const maxDrawdown = Math.max(...drawdown);
    
    // 夏普比率（简化版）
    const returns = [];
    for (let i = 1; i < equity.length; i++) {
      const ret = (equity[i] - equity[i - 1]) / equity[i - 1];
      returns.push(ret);
    }
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const stdReturn = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    );
    const sharpeRatio = stdReturn !== 0 ? (avgReturn / stdReturn) * Math.sqrt(252) : 0;
    
    // 盈亏比
    const avgWin = winningTrades.length > 0
      ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length
      : 0;
    const avgLoss = losingTrades.length > 0
      ? Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length)
      : 0;
    const profitFactor = avgLoss !== 0 ? avgWin / avgLoss : 0;
    
    const report = {
      // 基础信息
      initialCapital: this.initialCapital,
      finalCapital: this.results.finalCapital,
      totalPnL,
      totalReturn,
      
      // 交易统计
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: (winningTrades.length / trades.length) * 100,
      
      // 盈亏统计
      avgPnL: totalPnL / trades.length,
      avgWin,
      avgLoss,
      profitFactor,
      maxWin: Math.max(...trades.map(t => t.pnl)),
      maxLoss: Math.min(...trades.map(t => t.pnl)),
      
      // 风险指标
      maxDrawdown,
      sharpeRatio,
      
      // 交易时长
      avgTradeDuration: this.calculateAvgTradeDuration(trades),
      
      // 策略参数
      strategyParams: {
        entryThreshold: this.strategyConfig.entryThreshold,
        exitThreshold: this.strategyConfig.exitThreshold,
        stopLossThreshold: this.strategyConfig.stopLossThreshold,
        positionSize: this.positionSize,
        initialCapital: this.initialCapital,
        lookbackPeriod: this.strategyConfig.lookbackPeriod || 100,
        minCorrelation: this.strategyConfig.minCorrelation || 0.75
      }
    };
    
    this.printReport(report);
    
    return report;
  }

  /**
   * 计算平均交易时长
   */
  calculateAvgTradeDuration(trades) {
    if (trades.length === 0) return 0;
    
    const durations = trades.map(t => 
      (t.exitTime - t.entryTime) / 1000 / 60 // 转换为分钟
    );
    
    return durations.reduce((sum, d) => sum + d, 0) / durations.length;
  }

  /**
   * 打印回测报告
   */
  printReport(report) {
    logger.info('');
    logger.info('📊 回测结果:');
    logger.info('─'.repeat(60));
    logger.info(`初始资金: ${report.initialCapital.toFixed(2)} USDT`);
    logger.info(`最终资金: ${report.finalCapital.toFixed(2)} USDT`);
    logger.info(`总盈亏: ${report.totalPnL.toFixed(2)} USDT (${report.totalReturn.toFixed(2)}%)`);
    logger.info('');
    logger.info('📈 交易统计:');
    logger.info(`总交易次数: ${report.totalTrades}`);
    logger.info(`盈利交易: ${report.winningTrades} (${report.winRate.toFixed(1)}%)`);
    logger.info(`亏损交易: ${report.losingTrades}`);
    logger.info(`平均盈利: ${report.avgWin.toFixed(2)} USDT`);
    logger.info(`平均亏损: ${report.avgLoss.toFixed(2)} USDT`);
    logger.info(`盈亏比: ${report.profitFactor.toFixed(2)}`);
    logger.info('');
    logger.info('⚠️  风险指标:');
    logger.info(`最大回撤: ${report.maxDrawdown.toFixed(2)}%`);
    logger.info(`夏普比率: ${report.sharpeRatio.toFixed(2)}`);
    logger.info(`平均持仓时间: ${report.avgTradeDuration.toFixed(0)} 分钟`);
    logger.info('');
  }

  /**
   * 批量回测多个配对
   */
  async runMultiplePairs(pairsList, priceMatrix, timestamps, options = {}) {
    logger.info('');
    logger.info('═'.repeat(60));
    logger.info('🔄 批量回测多个配对');
    logger.info('═'.repeat(60));
    logger.info(`📊 总配对数: ${pairsList.length}`);
    logger.info('');
    
    const results = [];
    const totalPairs = pairsList.length;
    const maxReportsToGenerate = options.maxReportsToGenerate || 3; // 新手模式：只为收益前3名生成详细报告
    
    // 第一阶段：快速回测所有配对（不生成详细报告）
    logger.info('🔍 第一阶段：快速回测所有配对，计算收益率...');
    logger.info('');
    
    for (let i = 0; i < pairsList.length; i++) {
      const [symbol1, symbol2] = pairsList[i];
      
      try {
        // 显示进度
        const progress = ((i + 1) / totalPairs * 100).toFixed(1);
        logger.info(`[${i + 1}/${totalPairs}] (${progress}%) 回测: ${symbol1} / ${symbol2}`);
        
        const prices1 = priceMatrix[symbol1];
        const prices2 = priceMatrix[symbol2];
        
        if (!prices1 || !prices2) {
          logger.warn(`⏭️  跳过: ${symbol1}/${symbol2} - 数据不完整`);
          continue;
        }
        
        // 第一遍不生成详细报告，只计算结果
        const result = await this.run(symbol1, symbol2, prices1, prices2, timestamps, {
          generateReport: false
        });
        
        results.push({
          pair: [symbol1, symbol2],
          prices1,
          prices2,
          ...result
        });
        
        // 显示简要结果
        logger.info(`   ✅ 收益: ${result.totalReturn.toFixed(2)}% | 胜率: ${result.winRate.toFixed(1)}% | 交易次数: ${result.totalTrades}`);
        
        // 重置策略
        this.strategy.reset();
        this.results = {
          trades: [],
          equity: [],
          drawdown: []
        };
        
      } catch (error) {
        logger.error(`回测失败 [${symbol1}/${symbol2}]:`, error.message);
      }
    }
    
    // 排序结果（按收益率降序）
    results.sort((a, b) => b.totalReturn - a.totalReturn);
    
    logger.info('');
    logger.info('═'.repeat(60));
    logger.info('📊 第二阶段：为收益最高的前50名生成详细HTML报告...');
    logger.info('═'.repeat(60));
    logger.info('');
    
    // 为收益最高的前N名生成详细报告
    const topResults = results.slice(0, Math.min(maxReportsToGenerate, results.length));
    
    for (let i = 0; i < topResults.length; i++) {
      const result = topResults[i];
      const [symbol1, symbol2] = result.pair;
      
      try {
        logger.info(`[${i + 1}/${topResults.length}] 生成报告: ${symbol1} / ${symbol2} (收益: ${result.totalReturn.toFixed(2)}%)`);
        
        // 重新运行回测，这次生成详细报告
        const detailedResult = await this.run(
          symbol1, 
          symbol2, 
          result.prices1, 
          result.prices2, 
          timestamps, 
          { generateReport: true }
        );
        
        // 更新结果中的报告文件名
        result.reportFilename = detailedResult.reportFilename;
        
        if (result.reportFilename) {
          logger.info(`   📊 HTML报告: ${result.reportFilename}`);
        }
        
        // 重置策略
        this.strategy.reset();
        this.results = {
          trades: [],
          equity: [],
          drawdown: []
        };
        
      } catch (error) {
        logger.error(`生成报告失败 [${symbol1}/${symbol2}]:`, error.message);
      }
    }
    
    logger.info('');
    logger.info('═'.repeat(60));
    logger.info('🏆 批量回测结果汇总（按收益率排序）');
    logger.info('═'.repeat(60));
    
    // 清理价格数据（节省内存）
    results.forEach(r => {
      delete r.prices1;
      delete r.prices2;
    });
    
    results.forEach((r, index) => {
      const hasReport = r.reportFilename ? ' 📊' : '';
      logger.info(`${index + 1}. ${r.pair[0]} / ${r.pair[1]}${hasReport}`);
      logger.info(`   收益率: ${r.totalReturn.toFixed(2)}%`);
      logger.info(`   胜率: ${r.winRate.toFixed(1)}%`);
      logger.info(`   最大回撤: ${r.maxDrawdown.toFixed(2)}%`);
      if (r.reportFilename) {
        logger.info(`   HTML: ${r.reportFilename}`);
      }
      logger.info('');
    });
    
    // 统计生成了多少个详细报告
    const generatedReports = results.filter(r => r.reportFilename).length;
    if (generatedReports > 0) {
      logger.info('');
      logger.info(`📝 已为收益最高的前 ${generatedReports} 个配对生成详细HTML报告`);
      logger.info(`   报告位置: ./output/ 目录`);
    }
    
    // 生成对比图表
    if (results.length > 0) {
      try {
        const comparisonPath = this.visualizer.generateComparisonChart(results);
        logger.info('');
        logger.info(`📊 对比图表已保存: ${comparisonPath}`);
      } catch (error) {
        logger.error('生成对比图表失败:', error.message);
      }
    }
    
    // 保存回测结果JSON（用于投资组合优化）
    if (results.length > 0) {
      try {
        // 确保output目录存在
        if (!fs.existsSync('./output')) {
          fs.mkdirSync('./output', { recursive: true });
        }
        
        const filename = `backtest_results_${Date.now()}.json`;
        const filepath = path.join('./output', filename);
        
        fs.writeFileSync(filepath, JSON.stringify(results, null, 2));
        logger.info('');
        logger.info('═'.repeat(60));
        logger.info(`📁 回测结果已保存: ${filepath}`);
        logger.info('═'.repeat(60));
        logger.info('');
        logger.info('💡 下一步：使用以下命令优化投资组合（自动筛选流动性）');
        logger.info('');
        logger.info('   npm run stat-arb:portfolio ' + filepath + ' 1000 conservative 1000000');
        logger.info('');
        logger.info('   参数说明:');
        logger.info('   - ' + filepath + ' : 回测结果文件');
        logger.info('   - 1000 : 你的总资金（美元）');
        logger.info('   - conservative : 保守型风险偏好 (可选: balanced/aggressive)');
        logger.info('   - 1000000 : 最小日交易额$1M (可选: 5000000=$5M更安全)');
        logger.info('');
        logger.info('   💡 系统会自动检查流动性，过滤掉交易量不足的配对！');
        logger.info('');
      } catch (error) {
        logger.error('保存回测结果失败:', error.message);
        logger.error('错误详情:', error);
      }
    }
    
    return results;
  }

  /**
   * 导出结果到JSON
   */
  exportResults(filename = 'backtest_results.json') {
    const fs = require('fs');
    fs.writeFileSync(filename, JSON.stringify(this.results, null, 2));
    logger.info(`📁 结果已导出: ${filename}`);
  }

  /**
   * 根据时间戳数组推断时间框架（分钟）
   */
  getTimeframeMinutes(timestamps) {
    if (timestamps.length < 2) return 15; // 默认15分钟
    
    // 计算前几个时间戳的间隔
    const intervals = [];
    for (let i = 1; i < Math.min(10, timestamps.length); i++) {
      intervals.push((timestamps[i] - timestamps[i-1]) / 60000); // 转换为分钟
    }
    
    // 取平均值
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    return Math.round(avgInterval);
  }
}

