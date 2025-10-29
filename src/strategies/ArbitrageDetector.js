import { logger } from '../utils/logger.js';

export class ArbitrageDetector {
  constructor(config) {
    this.config = config;
    this.minProfitPercent = config.minProfitPercent || 0.5; // 最小利润百分比
    this.includeFees = config.includeFees !== false; // 是否包含手续费
  }

  /**
   * 检测套利机会
   * @param {Object} priceData - 格式: { exchangeName: { pair: { bid, ask, timestamp } } }
   * @returns {Array} 套利机会列表
   */
  detectOpportunities(priceData) {
    const opportunities = [];
    const exchanges = Object.keys(priceData);

    if (exchanges.length < 2) {
      return opportunities;
    }

    // 获取所有交易对
    const pairs = new Set();
    for (const exchange of exchanges) {
      Object.keys(priceData[exchange]).forEach(pair => pairs.add(pair));
    }

    // 检测每个交易对的套利机会
    for (const pair of pairs) {
      // 找出所有有此交易对数据的交易所
      const validExchanges = exchanges.filter(ex => 
        priceData[ex][pair] && 
        priceData[ex][pair].bid && 
        priceData[ex][pair].ask
      );

      if (validExchanges.length < 2) {
        continue;
      }

      // 比较所有交易所组合
      for (let i = 0; i < validExchanges.length; i++) {
        for (let j = i + 1; j < validExchanges.length; j++) {
          const ex1 = validExchanges[i];
          const ex2 = validExchanges[j];

          // 机会1: 在ex1买入，在ex2卖出
          const opp1 = this.calculateArbitrage(
            pair,
            ex1,
            ex2,
            priceData[ex1][pair].ask, // 买入价
            priceData[ex2][pair].bid  // 卖出价
          );

          if (opp1 && opp1.profitPercent >= this.minProfitPercent) {
            opportunities.push(opp1);
          }

          // 机会2: 在ex2买入，在ex1卖出
          const opp2 = this.calculateArbitrage(
            pair,
            ex2,
            ex1,
            priceData[ex2][pair].ask, // 买入价
            priceData[ex1][pair].bid  // 卖出价
          );

          if (opp2 && opp2.profitPercent >= this.minProfitPercent) {
            opportunities.push(opp2);
          }
        }
      }
    }

    // 按利润排序
    opportunities.sort((a, b) => b.profitPercent - a.profitPercent);

    return opportunities;
  }

  /**
   * 计算套利利润
   */
  calculateArbitrage(pair, buyExchange, sellExchange, buyPrice, sellPrice) {
    if (!buyPrice || !sellPrice || buyPrice <= 0 || sellPrice <= 0) {
      return null;
    }

    // 基础利润
    let profit = sellPrice - buyPrice;
    let profitPercent = (profit / buyPrice) * 100;

    // 如果包含手续费
    if (this.includeFees) {
      const buyFee = this.config.fees[buyExchange] || 0.001; // 默认0.1%
      const sellFee = this.config.fees[sellExchange] || 0.001;
      
      const totalFeePercent = (buyFee + sellFee) * 100;
      profitPercent -= totalFeePercent;
    }

    if (profitPercent < 0) {
      return null;
    }

    return {
      pair,
      buyExchange,
      sellExchange,
      buyPrice,
      sellPrice,
      profit,
      profitPercent,
      timestamp: Date.now()
    };
  }

  /**
   * 三角套利检测（同一交易所内）
   */
  detectTriangularArbitrage(exchange, markets) {
    // 实现三角套利逻辑
    // 例如: BTC/USDT -> ETH/BTC -> ETH/USDT
    // 这是一个更高级的功能，可以后续实现
    logger.debug('三角套利检测功能待实现');
    return [];
  }
}

