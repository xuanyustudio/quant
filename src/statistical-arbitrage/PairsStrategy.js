/**
 * 配对交易策略
 * 基于统计套利的配对交易策略实现
 */

import { logger } from '../utils/logger.js';
import { StatisticalAnalyzer } from './StatisticalAnalyzer.js';

export class PairsStrategy {
  constructor(config = {}) {
    this.config = config;
    this.analyzer = new StatisticalAnalyzer(config);
    
    // 策略参数
    this.entryThreshold = config.entryThreshold || 2.0;    // 开仓Z-score阈值
    this.exitThreshold = config.exitThreshold || 0.5;      // 平仓Z-score阈值
    this.stopLossThreshold = config.stopLossThreshold || 3.5; // 止损Z-score阈值
    this.lookbackPeriod = config.lookbackPeriod || 100;    // 回看周期
    this.minCorrelation = config.minCorrelation || 0.7;    // 最小相关系数
    this.enforceCorrelation = config.enforceCorrelation !== undefined ? config.enforceCorrelation : true; // 是否强制检查相关性
    
    // 持仓记录
    this.positions = new Map();
    this.trades = [];
  }

  /**
   * 分析配对
   * @param {string} pairKey - 配对键（用于查询当前持仓）
   */
  analyzePair(symbol1, symbol2, prices1, prices2, pairKey = null) {
    try {
      // 1. 计算相关性
      const correlation = this.analyzer.calculateCorrelation(prices1, prices2);
      
      // 🔧 测试模式：如果 enforceCorrelation=false，则跳过相关性检查
      if (this.enforceCorrelation && Math.abs(correlation) < this.minCorrelation) {
        return {
          viable: false,
          reason: `相关性不足: ${correlation.toFixed(3)}`
        };
      }

      // 2. 检验协整性
      const cointegration = this.analyzer.calculateCointegration(prices1, prices2);
      
      // 3. 计算价差（使用归一化方法，解决初始价差大的问题）
      const spread = this.analyzer.calculateSpread(prices1, prices2, 'normalized_ratio');
      
      // 4. 计算Z-Score
      const zScores = this.analyzer.calculateZScore(spread, this.lookbackPeriod);
      const currentZScore = zScores[zScores.length - 1];
      
      // 5. 计算半衰期
      const halfLife = this.analyzer.calculateHalfLife(spread);
      
      // 6. 检查当前持仓类型
      let positionType = null;
      if (pairKey) {
        const position = this.positions.get(pairKey);
        if (position) {
          positionType = position.type;
        }
      }
      
      return {
        viable: true,
        pair: [symbol1, symbol2],
        correlation,
        cointegration,
        spread: {
          current: spread[spread.length - 1],
          mean: this.analyzer.mean(spread),
          std: this.analyzer.standardDeviation(spread),
          series: spread
        },
        zScore: {
          current: currentZScore,
          series: zScores
        },
        halfLife,
        signal: this.generateSignal(currentZScore, positionType),
        timestamp: Date.now()
      };

    } catch (error) {
      logger.error(`分析配对失败 [${symbol1}, ${symbol2}]:`, error.message);
      return {
        viable: false,
        reason: error.message
      };
    }
  }

  /**
   * 生成交易信号
   * @param {number} zScore - 当前Z-Score
   * @param {string|null} positionType - 当前持仓类型 ('OPEN_LONG', 'OPEN_SHORT', null)
   */
  generateSignal(zScore, positionType = null) {
    const absZScore = Math.abs(zScore);
    
    // 止损信号 - 需要根据持仓方向判断
    if (positionType) {
      // 有持仓时，根据方向判断止损
      if (positionType === 'OPEN_LONG') {
        // 做多价差：如果Z继续下降（更负），超过止损阈值则止损
        if (zScore < -this.stopLossThreshold) {
          return {
            action: 'STOP_LOSS',
            zScore,
            reason: `价差继续下跌，触发止损: Z=${zScore.toFixed(2)}`
          };
        }
      } else if (positionType === 'OPEN_SHORT') {
        // 做空价差：如果Z继续上升（更正），超过止损阈值则止损
        if (zScore > this.stopLossThreshold) {
          return {
            action: 'STOP_LOSS',
            zScore,
            reason: `价差继续上涨，触发止损: Z=${zScore.toFixed(2)}`
          };
        }
      }
    }
    
    // 开仓信号（无持仓时）
    if (!positionType) {
      if (zScore > this.entryThreshold) {
        return {
          action: 'OPEN_SHORT',
          zScore,
          reason: `价差偏高，做空价差: Z=${zScore.toFixed(2)}`
        };
      } else if (zScore < -this.entryThreshold) {
        return {
          action: 'OPEN_LONG',
          zScore,
          reason: `价差偏低，做多价差: Z=${zScore.toFixed(2)}`
        };
      }
    }
    
    // 平仓信号（有持仓时）
    if (positionType && absZScore < this.exitThreshold) {
      return {
        action: 'CLOSE',
        zScore,
        reason: `价差回归均值: Z=${zScore.toFixed(2)}`
      };
    }
    
    // 持有
    return {
      action: 'HOLD',
      zScore,
      reason: positionType ? `持有当前仓位: Z=${zScore.toFixed(2)}` : `观望: Z=${zScore.toFixed(2)}`
    };
  }

  /**
   * 计算持仓比例
   * 根据价格比率确定两个资产的持仓比例
   */
  calculatePositionRatio(price1, price2, capital) {
    // 价格比率
    const priceRatio = price1 / price2;
    
    // ⚠️ 修复：对于极低价格的币（如SHIB），限制最大交易价值
    const MIN_PRICE = 0.00001; // 最小价格阈值
    const MAX_QUANTITY_VALUE = 1000000; // 单边最大交易价值（USDT）
    
    // 检查价格是否太低
    if (price1 < MIN_PRICE || price2 < MIN_PRICE) {
      logger.warn(`⚠️  价格过低: ${price1} / ${price2}，可能影响计算精度`);
    }
    
    // ⚠️ 配对交易核心原则：两边资金必须相等，才能实现市场中性对冲
    // 使用一半资金买入/卖出 symbol1，另一半买入/卖出 symbol2
    const halfCapital = capital / 2;
    
    // 计算数量（两边资金完全相等）
    let quantity1 = halfCapital / price1;
    let quantity2 = halfCapital / price2;
    
    // ⚠️ 修复：限制数量，避免超低价币导致的巨大数量
    const maxQuantity1 = MAX_QUANTITY_VALUE / price1;
    const maxQuantity2 = MAX_QUANTITY_VALUE / price2;
    
    if (quantity1 > maxQuantity1) {
      logger.warn(`⚠️  数量1过大: ${quantity1.toFixed(2)}，限制为: ${maxQuantity1.toFixed(2)}`);
      quantity1 = maxQuantity1;
    }
    
    if (quantity2 > maxQuantity2) {
      logger.warn(`⚠️  数量2过大: ${quantity2.toFixed(2)}，限制为: ${maxQuantity2.toFixed(2)}`);
      quantity2 = maxQuantity2;
    }
    
    // 配对交易要求：actualCapital1 应该等于 actualCapital2
    const actualCapital1 = quantity1 * price1;
    const actualCapital2 = quantity2 * price2;
    
    return {
      symbol1Quantity: quantity1,
      symbol2Quantity: quantity2,
      priceRatio,
      capital: capital,
      actualCapital1: actualCapital1,
      actualCapital2: actualCapital2
    };
  }

  /**
   * 开仓
   */
  openPosition(pairKey, symbol1, symbol2, signal, price1, price2, capital, timestamp = null) {
    const ratio = this.calculatePositionRatio(price1, price2, capital);
    
    const position = {
      pairKey,
      symbol1,
      symbol2,
      type: signal.action, // 'OPEN_LONG' or 'OPEN_SHORT'
      entryTime: timestamp || Date.now(),
      entryZScore: signal.zScore,
      entryPrice1: price1,
      entryPrice2: price2,
      quantity1: ratio.symbol1Quantity,
      quantity2: ratio.symbol2Quantity,
      capital,
      priceRatio: ratio.priceRatio,
      status: 'OPEN'
    };

    this.positions.set(pairKey, position);
    
    logger.info(`📈 开仓: ${pairKey}`);
    logger.info(`   类型: ${signal.action}`);
    logger.info(`   Z-Score: ${signal.zScore.toFixed(2)}`);
    logger.info(`   价格: ${symbol1}=$${price1.toFixed(8)} / ${symbol2}=$${price2.toFixed(8)}`);
    logger.info(`   数量: ${symbol1}=${ratio.symbol1Quantity.toFixed(2)} / ${symbol2}=${ratio.symbol2Quantity.toFixed(2)}`);
    logger.info(`   价值: ${symbol1}=$${ratio.actualCapital1.toFixed(2)} / ${symbol2}=$${ratio.actualCapital2.toFixed(2)}`);
    
    return position;
  }

  /**
   * 平仓
   */
  closePosition(pairKey, price1, price2, signal, timestamp = null) {
    const position = this.positions.get(pairKey);
    
    if (!position) {
      logger.warn(`未找到持仓: ${pairKey}`);
      return null;
    }

    // 计算盈亏
    const pnl = this.calculatePnL(position, price1, price2);
    
    position.exitTime = timestamp || Date.now();  // 使用传入的时间戳（回测）或当前时间（实盘）
    position.exitZScore = signal.zScore;
    position.exitPrice1 = price1;
    position.exitPrice2 = price2;
    position.pnl = pnl.total;
    position.pnlPercent = pnl.percent;
    position.pnl1 = pnl.pnl1;
    position.pnl2 = pnl.pnl2;
    position.side1 = pnl.side1;
    position.side2 = pnl.side2;
    position.status = 'CLOSED';
    position.closeReason = signal.reason;
    
    // 记录交易
    this.trades.push({ ...position });
    
    // 删除持仓
    this.positions.delete(pairKey);
    
    logger.info(`📉 平仓: ${pairKey}`);
    logger.info(`   原因: ${signal.reason}`);
    logger.info(`   ${position.symbol1} (${pnl.side1}): ${pnl.pnl1 > 0 ? '+' : ''}${pnl.pnl1.toFixed(2)} USDT`);
    logger.info(`   ${position.symbol2} (${pnl.side2}): ${pnl.pnl2 > 0 ? '+' : ''}${pnl.pnl2.toFixed(2)} USDT`);
    logger.info(`   总盈亏: ${pnl.total.toFixed(2)} USDT (${pnl.percent.toFixed(2)}%)`);
    logger.info(`   持仓时间: ${((position.exitTime - position.entryTime) / 1000 / 60).toFixed(0)}分钟`);
    
    return position;
  }

  /**
   * 计算盈亏（现货策略）
   * 配对交易是完整的交易周期：开仓建立两个方向，平仓同时平掉
   */
  calculatePnL(position, currentPrice1, currentPrice2) {
    const { type, entryPrice1, entryPrice2, quantity1, quantity2, capital } = position;
    
    // 当前市值
    const currentValue1 = quantity1 * currentPrice1;
    const currentValue2 = quantity2 * currentPrice2;
    
    // 入场市值
    const entryValue1 = quantity1 * entryPrice1;
    const entryValue2 = quantity2 * entryPrice2;
    
    let pnl1, pnl2, side1, side2;
    
    if (type === 'OPEN_LONG') {
      // 做多价差：
      // symbol1：买入开仓 → 卖出平仓（做多）
      // symbol2：卖出开仓 → 买入平仓（做空）
      pnl1 = currentValue1 - entryValue1;  // 做多盈亏
      pnl2 = entryValue2 - currentValue2;  // 做空盈亏
      side1 = 'LONG';   // 做多
      side2 = 'SHORT';  // 做空
    } else {
      // 做空价差：
      // symbol1：卖出开仓 → 买入平仓（做空）
      // symbol2：买入开仓 → 卖出平仓（做多）
      pnl1 = entryValue1 - currentValue1;  // 做空盈亏
      pnl2 = currentValue2 - entryValue2;  // 做多盈亏
      side1 = 'SHORT';  // 做空
      side2 = 'LONG';   // 做多
    }
    
    const totalPnl = pnl1 + pnl2;
    const pnlPercent = (totalPnl / capital) * 100;
    
    return {
      total: totalPnl,
      percent: pnlPercent,
      pnl1,
      pnl2,
      side1,
      side2,
      currentValue1,
      currentValue2,
      entryValue1,
      entryValue2
    };
  }

  /**
   * 更新持仓
   */
  updatePosition(pairKey, price1, price2, zScore, timestamp = null) {
    const position = this.positions.get(pairKey);
    
    if (!position) return null;
    
    const pnl = this.calculatePnL(position, price1, price2);
    // ⚠️ 修复：传入当前持仓类型，以便正确判断平仓和止损条件
    const signal = this.generateSignal(zScore, position.type);
    
    // 检查是否需要止损或平仓
    if (signal.action === 'STOP_LOSS' || signal.action === 'CLOSE') {
      return this.closePosition(pairKey, price1, price2, signal, timestamp);
    }
    
    // 更新持仓信息
    position.currentPrice1 = price1;
    position.currentPrice2 = price2;
    position.currentZScore = zScore;
    position.currentPnL = pnl.total;
    position.currentPnLPercent = pnl.percent;
    position.lastUpdate = timestamp || Date.now();  // 使用传入的时间戳（回测）或当前时间（实盘）
    
    return position;
  }

  /**
   * 获取当前持仓
   */
  getPosition(pairKey) {
    return this.positions.get(pairKey);
  }

  /**
   * 获取所有持仓
   */
  getAllPositions() {
    return Array.from(this.positions.values());
  }

  /**
   * 获取交易历史
   */
  getTradeHistory() {
    return this.trades;
  }

  /**
   * 计算策略统计
   */
  getStatistics() {
    const trades = this.trades;
    
    if (trades.length === 0) {
      return {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        totalPnL: 0,
        avgPnL: 0,
        maxPnL: 0,
        minPnL: 0
      };
    }

    const winningTrades = trades.filter(t => t.pnl > 0);
    const losingTrades = trades.filter(t => t.pnl <= 0);
    const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
    const pnls = trades.map(t => t.pnl);

    return {
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: (winningTrades.length / trades.length) * 100,
      totalPnL,
      avgPnL: totalPnL / trades.length,
      maxPnL: Math.max(...pnls),
      minPnL: Math.min(...pnls),
      avgWin: winningTrades.length > 0 
        ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length 
        : 0,
      avgLoss: losingTrades.length > 0
        ? losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length
        : 0
    };
  }

  /**
   * 重置策略状态
   */
  reset() {
    this.positions.clear();
    this.trades = [];
    logger.info('策略状态已重置');
  }
}

