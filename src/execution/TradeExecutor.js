import { logger } from '../utils/logger.js';

export class TradeExecutor {
  constructor(config) {
    this.config = config;
    this.minOrderAmount = config.minOrderAmount || 10; // 最小订单金额（USDT）
    this.maxOrderAmount = config.maxOrderAmount || 1000; // 最大订单金额（USDT）
    this.orderType = config.orderType || 'limit'; // limit 或 market
    this.slippageTolerance = config.slippageTolerance || 0.001; // 滑点容忍度
    this.tradeHistory = [];
  }

  /**
   * 执行套利交易
   */
  async execute(opportunity, exchangeManager) {
    try {
      logger.info(`🎯 准备执行套利: ${opportunity.pair}`);
      logger.info(`   买入: ${opportunity.buyExchange} @ ${opportunity.buyPrice}`);
      logger.info(`   卖出: ${opportunity.sellExchange} @ ${opportunity.sellPrice}`);
      logger.info(`   预期利润: ${opportunity.profitPercent.toFixed(2)}%`);

      // 1. 验证账户余额
      const canTrade = await this.validateBalances(
        opportunity, 
        exchangeManager
      );

      if (!canTrade) {
        logger.warn('❌ 余额不足，跳过此次交易');
        return false;
      }

      // 2. 计算交易数量
      const amount = this.calculateTradeAmount(opportunity);
      
      logger.info(`   交易数量: ${amount} ${opportunity.pair.split('/')[0]}`);

      // 3. 同时下单（减少时间延迟）
      const [buyOrder, sellOrder] = await Promise.all([
        this.placeBuyOrder(
          exchangeManager,
          opportunity.buyExchange,
          opportunity.pair,
          amount,
          opportunity.buyPrice
        ),
        this.placeSellOrder(
          exchangeManager,
          opportunity.sellExchange,
          opportunity.pair,
          amount,
          opportunity.sellPrice
        )
      ]);

      // 4. 记录交易
      const trade = {
        timestamp: Date.now(),
        opportunity,
        buyOrder,
        sellOrder,
        amount,
        status: 'executed'
      };

      this.tradeHistory.push(trade);

      logger.info('✅ 套利交易执行成功!');
      
      return true;

    } catch (error) {
      logger.error('❌ 交易执行失败:', error.message);
      return false;
    }
  }

  /**
   * 验证余额是否充足
   */
  async validateBalances(opportunity, exchangeManager) {
    try {
      const [baseCurrency, quoteCurrency] = opportunity.pair.split('/');
      
      // 检查买入交易所的报价货币余额
      const buyBalance = await exchangeManager.fetchBalance(opportunity.buyExchange);
      const availableQuote = buyBalance.free[quoteCurrency] || 0;
      
      const requiredAmount = this.calculateTradeAmount(opportunity) * opportunity.buyPrice;
      
      if (availableQuote < requiredAmount) {
        logger.warn(`${opportunity.buyExchange} ${quoteCurrency} 余额不足: ${availableQuote} < ${requiredAmount}`);
        return false;
      }

      // 检查卖出交易所的基础货币余额
      const sellBalance = await exchangeManager.fetchBalance(opportunity.sellExchange);
      const availableBase = sellBalance.free[baseCurrency] || 0;
      
      const requiredBase = this.calculateTradeAmount(opportunity);
      
      if (availableBase < requiredBase) {
        logger.warn(`${opportunity.sellExchange} ${baseCurrency} 余额不足: ${availableBase} < ${requiredBase}`);
        return false;
      }

      return true;

    } catch (error) {
      logger.error('余额验证失败:', error.message);
      return false;
    }
  }

  /**
   * 计算交易数量
   */
  calculateTradeAmount(opportunity) {
    // 根据配置的金额范围计算交易数量
    const baseAmount = this.config.tradeAmount || 100; // 默认100 USDT
    const amount = baseAmount / opportunity.buyPrice;
    
    // 可以根据利润率动态调整交易量
    // 利润率越高，可以适当增加交易量
    
    return parseFloat(amount.toFixed(8));
  }

  /**
   * 下买单
   */
  async placeBuyOrder(exchangeManager, exchangeName, symbol, amount, price) {
    try {
      const orderType = this.orderType;
      const finalPrice = orderType === 'limit' ? price * (1 + this.slippageTolerance) : null;
      
      const order = await exchangeManager.createOrder(
        exchangeName,
        symbol,
        orderType,
        'buy',
        amount,
        finalPrice
      );

      logger.info(`📈 买单已下: ${exchangeName} | ${order.id}`);
      return order;

    } catch (error) {
      logger.error(`买单失败 [${exchangeName}]:`, error.message);
      throw error;
    }
  }

  /**
   * 下卖单
   */
  async placeSellOrder(exchangeManager, exchangeName, symbol, amount, price) {
    try {
      const orderType = this.orderType;
      const finalPrice = orderType === 'limit' ? price * (1 - this.slippageTolerance) : null;
      
      const order = await exchangeManager.createOrder(
        exchangeName,
        symbol,
        orderType,
        'sell',
        amount,
        finalPrice
      );

      logger.info(`📉 卖单已下: ${exchangeName} | ${order.id}`);
      return order;

    } catch (error) {
      logger.error(`卖单失败 [${exchangeName}]:`, error.message);
      throw error;
    }
  }

  /**
   * 获取交易历史
   */
  getTradeHistory() {
    return this.tradeHistory;
  }
}

