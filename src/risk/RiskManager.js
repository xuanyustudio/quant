import { logger } from '../utils/logger.js';

export class RiskManager {
  constructor(config) {
    this.config = config;
    this.maxDailyLoss = config.maxDailyLoss || 100; // 最大每日亏损（USDT）
    this.maxPositionSize = config.maxPositionSize || 1000; // 最大持仓（USDT）
    this.maxSlippage = config.maxSlippage || 0.005; // 最大滑点 0.5%
    this.minLiquidity = config.minLiquidity || 10000; // 最小流动性（USDT）
    this.dailyPnL = 0;
    this.lastResetDate = new Date().toDateString();
    this.tradeCount = 0;
    this.maxTradesPerHour = config.maxTradesPerHour || 10;
    this.recentTrades = [];
  }

  /**
   * 验证套利机会是否通过风险控制
   */
  validateOpportunity(opportunity) {
    // 1. 检查利润率是否合理（避免异常数据）
    if (opportunity.profitPercent > 10) {
      logger.warn(`⚠️  利润率异常高 (${opportunity.profitPercent.toFixed(2)}%)，可能是数据错误`);
      return false;
    }

    // 2. 检查价格是否合理
    if (!this.validatePrice(opportunity)) {
      logger.warn('⚠️  价格验证失败');
      return false;
    }

    // 3. 检查每日亏损限制
    if (!this.checkDailyLoss()) {
      logger.warn('⚠️  已达到每日最大亏损限制');
      return false;
    }

    // 4. 检查交易频率
    if (!this.checkTradeFrequency()) {
      logger.warn('⚠️  交易频率过高');
      return false;
    }

    // 5. 检查数据新鲜度
    if (!this.checkDataFreshness(opportunity)) {
      logger.warn('⚠️  价格数据过时');
      return false;
    }

    return true;
  }

  /**
   * 验证价格合理性
   */
  validatePrice(opportunity) {
    // 检查价格是否为正数
    if (opportunity.buyPrice <= 0 || opportunity.sellPrice <= 0) {
      return false;
    }

    // 检查买卖价格差异是否在合理范围内
    const priceDiff = Math.abs(opportunity.sellPrice - opportunity.buyPrice);
    const avgPrice = (opportunity.sellPrice + opportunity.buyPrice) / 2;
    const diffPercent = (priceDiff / avgPrice) * 100;

    // 如果价格差异超过20%，可能是数据错误
    if (diffPercent > 20) {
      return false;
    }

    return true;
  }

  /**
   * 检查每日亏损
   */
  checkDailyLoss() {
    const currentDate = new Date().toDateString();
    
    // 新的一天，重置计数
    if (currentDate !== this.lastResetDate) {
      this.dailyPnL = 0;
      this.lastResetDate = currentDate;
      this.tradeCount = 0;
    }

    // 检查是否超过最大亏损
    if (Math.abs(this.dailyPnL) >= this.maxDailyLoss) {
      return false;
    }

    return true;
  }

  /**
   * 检查交易频率
   */
  checkTradeFrequency() {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    // 清理1小时前的交易记录
    this.recentTrades = this.recentTrades.filter(t => t > oneHourAgo);

    // 检查是否超过每小时最大交易次数
    if (this.recentTrades.length >= this.maxTradesPerHour) {
      return false;
    }

    return true;
  }

  /**
   * 检查数据新鲜度
   */
  checkDataFreshness(opportunity) {
    const now = Date.now();
    const maxAge = 10000; // 数据最大年龄：10秒

    if (opportunity.timestamp && (now - opportunity.timestamp) > maxAge) {
      return false;
    }

    return true;
  }

  /**
   * 记录交易结果
   */
  recordTrade(profit) {
    this.dailyPnL += profit;
    this.tradeCount += 1;
    this.recentTrades.push(Date.now());
    
    logger.info(`📊 风险统计 | 今日盈亏: ${this.dailyPnL.toFixed(2)} USDT | 交易次数: ${this.tradeCount}`);
  }

  /**
   * 获取风险报告
   */
  getRiskReport() {
    return {
      dailyPnL: this.dailyPnL,
      tradeCount: this.tradeCount,
      maxDailyLoss: this.maxDailyLoss,
      recentTradesCount: this.recentTrades.length,
      lastResetDate: this.lastResetDate
    };
  }

  /**
   * 紧急止损
   */
  emergencyStop() {
    logger.error('🚨 触发紧急止损！');
    // 这里可以添加关闭所有持仓、发送通知等逻辑
    return true;
  }
}

