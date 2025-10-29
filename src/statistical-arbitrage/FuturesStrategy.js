/**
 * 配对交易策略 - 合约版本
 * 使用永续合约（1x杠杆）实现真正的做空
 * 解决现货策略在市场单边下跌时的风险问题
 */

import { logger } from '../utils/logger.js';
import { PairsStrategy } from './PairsStrategy.js';

export class FuturesStrategy extends PairsStrategy {
  constructor(config = {}) {
    super(config);
    
    // 合约特有配置
    this.leverage = config.leverage || 1;  // 默认1x杠杆（不加杠杆）
    this.marginType = config.marginType || 'cross';  // 逐仓或全仓
    this.useContractForShort = config.useContractForShort !== false;  // 默认使用合约做空
  }

  /**
   * 计算持仓比例（合约版本）
   * 关键区别：做空时使用合约而非卖出现货
   */
  calculatePositionRatio(price1, price2, capital) {
    const ratio = super.calculatePositionRatio(price1, price2, capital);
    
    // 添加合约相关信息
    ratio.leverage = this.leverage;
    ratio.marginType = this.marginType;
    
    return ratio;
  }

  /**
   * 开仓（合约版本）
   * 支持混合现货+合约的配对交易
   */
  openPosition(pairKey, symbol1, symbol2, signal, price1, price2, capital, timestamp = null) {
    const ratio = this.calculatePositionRatio(price1, price2, capital);
    
    // 确定每个币种的交易类型（现货 or 合约）
    let symbol1Type, symbol2Type, symbol1Side, symbol2Side;
    
    if (signal.action === 'OPEN_LONG') {
      // 做多价差：买入symbol1，卖出symbol2
      symbol1Type = 'spot';      // 买入现货
      symbol1Side = 'buy';
      
      if (this.useContractForShort) {
        symbol2Type = 'future';   // 做空合约（真正的做空）
        symbol2Side = 'sell';      // 开空单
      } else {
        symbol2Type = 'spot';     // 卖出现货（传统方式）
        symbol2Side = 'sell';
      }
      
    } else {
      // 做空价差：卖出symbol1，买入symbol2
      if (this.useContractForShort) {
        symbol1Type = 'future';   // 做空合约
        symbol1Side = 'sell';      // 开空单
      } else {
        symbol1Type = 'spot';     // 卖出现货
        symbol1Side = 'sell';
      }
      
      symbol2Type = 'spot';      // 买入现货
      symbol2Side = 'buy';
    }
    
    const position = {
      pairKey,
      symbol1,
      symbol2,
      type: signal.action,
      entryTime: timestamp || Date.now(),
      entryZScore: signal.zScore,
      entryPrice1: price1,
      entryPrice2: price2,
      quantity1: ratio.symbol1Quantity,
      quantity2: ratio.symbol2Quantity,
      capital,
      priceRatio: ratio.priceRatio,
      status: 'OPEN',
      
      // 合约特有信息
      symbol1Type,    // 'spot' or 'future'
      symbol2Type,
      symbol1Side,    // 'buy' or 'sell'
      symbol2Side,
      leverage: this.leverage,
      marginType: this.marginType
    };

    this.positions.set(pairKey, position);
    
    logger.info(`📈 开仓: ${pairKey}`);
    logger.info(`   类型: ${signal.action}`);
    logger.info(`   Z-Score: ${signal.zScore.toFixed(2)}`);
    logger.info('');
    logger.info(`   ${symbol1}:`);
    logger.info(`     交易类型: ${symbol1Type === 'future' ? '🔮 合约' : '💵 现货'}`);
    logger.info(`     方向: ${symbol1Side.toUpperCase()}`);
    logger.info(`     价格: $${price1.toFixed(8)}`);
    logger.info(`     数量: ${ratio.symbol1Quantity.toFixed(8)}`);
    logger.info(`     价值: $${ratio.actualCapital1.toFixed(2)}`);
    if (symbol1Type === 'future') {
      logger.info(`     杠杆: ${this.leverage}x`);
      logger.info(`     保证金: $${(ratio.actualCapital1 / this.leverage).toFixed(2)}`);
    }
    logger.info('');
    logger.info(`   ${symbol2}:`);
    logger.info(`     交易类型: ${symbol2Type === 'future' ? '🔮 合约' : '💵 现货'}`);
    logger.info(`     方向: ${symbol2Side.toUpperCase()}`);
    logger.info(`     价格: $${price2.toFixed(8)}`);
    logger.info(`     数量: ${ratio.symbol2Quantity.toFixed(8)}`);
    logger.info(`     价值: $${ratio.actualCapital2.toFixed(2)}`);
    if (symbol2Type === 'future') {
      logger.info(`     杠杆: ${this.leverage}x`);
      logger.info(`     保证金: $${(ratio.actualCapital2 / this.leverage).toFixed(2)}`);
    }
    logger.info('');
    
    return position;
  }

  /**
   * 计算盈亏（合约版本）
   * 考虑合约的双向盈利特性
   */
  calculatePnL(position, currentPrice1, currentPrice2) {
    const { 
      type, 
      entryPrice1, 
      entryPrice2, 
      quantity1, 
      quantity2, 
      capital,
      symbol1Type,
      symbol2Type,
      symbol1Side,
      symbol2Side
    } = position;
    
    let pnl1 = 0;
    let pnl2 = 0;
    let side1, side2;
    
    // 计算symbol1的盈亏和方向
    if (symbol1Type === 'spot') {
      // 现货：根据买卖方向判断
      if (symbol1Side === 'buy') {
        // 买入开仓 → 卖出平仓（做多）
        pnl1 = quantity1 * (currentPrice1 - entryPrice1);
        side1 = 'LONG';
      } else {
        // 卖出开仓 → 买入平仓（做空现货）
        pnl1 = quantity1 * (entryPrice1 - currentPrice1);
        side1 = 'SHORT';
      }
    } else {
      // 合约：双向都有盈亏
      if (symbol1Side === 'buy') {
        // 做多合约：价格上涨盈利
        pnl1 = quantity1 * (currentPrice1 - entryPrice1);
        side1 = 'LONG';
      } else {
        // 做空合约：价格下跌盈利 ✅
        pnl1 = quantity1 * (entryPrice1 - currentPrice1);
        side1 = 'SHORT';
      }
    }
    
    // 计算symbol2的盈亏和方向（同理）
    if (symbol2Type === 'spot') {
      if (symbol2Side === 'buy') {
        pnl2 = quantity2 * (currentPrice2 - entryPrice2);
        side2 = 'LONG';
      } else {
        pnl2 = quantity2 * (entryPrice2 - currentPrice2);
        side2 = 'SHORT';
      }
    } else {
      if (symbol2Side === 'buy') {
        pnl2 = quantity2 * (currentPrice2 - entryPrice2);
        side2 = 'LONG';
      } else {
        pnl2 = quantity2 * (entryPrice2 - currentPrice2);
        side2 = 'SHORT';
      }
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
      currentPrice1,
      currentPrice2,
      entryPrice1,
      entryPrice2
    };
  }

  /**
   * 平仓（合约版本）
   */
  closePosition(pairKey, price1, price2, signal, timestamp = null) {
    const position = this.positions.get(pairKey);
    
    if (!position) {
      logger.warn(`未找到持仓: ${pairKey}`);
      return null;
    }

    // 计算盈亏
    const pnl = this.calculatePnL(position, price1, price2);
    
    position.exitTime = timestamp || Date.now();
    position.exitZScore = signal.zScore;
    position.exitPrice1 = price1;
    position.exitPrice2 = price2;
    position.pnl = pnl.total;
    position.pnlPercent = pnl.percent;
    position.pnl1 = pnl.pnl1;
    position.pnl2 = pnl.pnl2;
    position.status = 'CLOSED';
    position.closeReason = signal.reason;
    
    // 记录交易
    this.trades.push({ ...position });
    
    // 删除持仓
    this.positions.delete(pairKey);
    
    logger.info(`📉 平仓: ${pairKey}`);
    logger.info(`   原因: ${signal.reason}`);
    logger.info(`   ${position.symbol1} 盈亏: ${pnl.pnl1 > 0 ? '+' : ''}${pnl.pnl1.toFixed(2)} USDT`);
    logger.info(`   ${position.symbol2} 盈亏: ${pnl.pnl2 > 0 ? '+' : ''}${pnl.pnl2.toFixed(2)} USDT`);
    logger.info(`   总盈亏: ${pnl.total > 0 ? '+' : ''}${pnl.total.toFixed(2)} USDT (${pnl.percent.toFixed(2)}%)`);
    logger.info(`   持仓时间: ${((position.exitTime - position.entryTime) / 1000 / 60).toFixed(0)}分钟`);
    
    return position;
  }
}

