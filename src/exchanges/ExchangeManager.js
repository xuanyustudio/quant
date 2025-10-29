import ccxt from 'ccxt';
import { logger } from '../utils/logger.js';

export class ExchangeManager {
  constructor(exchangeConfigs) {
    this.configs = exchangeConfigs;
    this.exchanges = {};
  }

  async initialize() {
    for (const [name, config] of Object.entries(this.configs)) {
      if (!config.enabled) {
        logger.info(`⏭️  跳过禁用的交易所: ${name}`);
        continue;
      }

      try {
        // 创建交易所实例
        const ExchangeClass = ccxt[config.id];
        if (!ExchangeClass) {
          throw new Error(`不支持的交易所: ${config.id}`);
        }

        // 配置交易所参数
        const exchangeConfig = {
          apiKey: config.apiKey,
          secret: config.secret,
          password: config.password, // 某些交易所需要
          enableRateLimit: true,
          options: {
            defaultType: config.defaultType || 'spot',
            ...config.options
          }
        };

        // 如果配置了代理（用于国内访问币安等）
        if (process.env.PROXY_URL || config.options?.proxy) {
          exchangeConfig.proxy = process.env.PROXY_URL || config.options.proxy;
          logger.info(`${name} 使用代理: ${exchangeConfig.proxy}`);
        }

        this.exchanges[name] = new ExchangeClass(exchangeConfig);

        // 加载市场数据
        await this.exchanges[name].loadMarkets();
        
        // 测试连接
        if (config.apiKey && config.secret) {
          const balance = await this.exchanges[name].fetchBalance();
          logger.info(`✅ ${name} 连接成功 | 账户资金已加载`);
        } else {
          logger.info(`✅ ${name} 连接成功 (只读模式)`);
        }

      } catch (error) {
        logger.error(`❌ ${name} 连接失败:`, error.message);
        throw error;
      }
    }

    if (Object.keys(this.exchanges).length < 2) {
      throw new Error('至少需要2个交易所才能进行套利');
    }
  }

  getExchanges() {
    return this.exchanges;
  }

  getExchange(name) {
    return this.exchanges[name];
  }

  async fetchBalance(exchangeName) {
    try {
      const exchange = this.exchanges[exchangeName];
      return await exchange.fetchBalance();
    } catch (error) {
      logger.error(`获取余额失败 [${exchangeName}]:`, error.message);
      throw error;
    }
  }

  async fetchOrderBook(exchangeName, symbol, limit = 20) {
    try {
      const exchange = this.exchanges[exchangeName];
      return await exchange.fetchOrderBook(symbol, limit);
    } catch (error) {
      logger.error(`获取订单簿失败 [${exchangeName}] ${symbol}:`, error.message);
      throw error;
    }
  }

  async createOrder(exchangeName, symbol, type, side, amount, price = null) {
    try {
      const exchange = this.exchanges[exchangeName];
      return await exchange.createOrder(symbol, type, side, amount, price);
    } catch (error) {
      logger.error(`创建订单失败 [${exchangeName}]:`, error.message);
      throw error;
    }
  }

  async close() {
    for (const [name, exchange] of Object.entries(this.exchanges)) {
      try {
        if (exchange.close) {
          await exchange.close();
        }
        logger.info(`已关闭交易所连接: ${name}`);
      } catch (error) {
        logger.error(`关闭交易所连接失败 [${name}]:`, error.message);
      }
    }
  }
}

