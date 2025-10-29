import { ExchangeManager } from '../exchanges/ExchangeManager.js';
import { ArbitrageDetector } from '../strategies/ArbitrageDetector.js';
import { TradeExecutor } from '../execution/TradeExecutor.js';
import { RiskManager } from '../risk/RiskManager.js';
import { logger } from '../utils/logger.js';

export class ArbitrageEngine {
  constructor(config) {
    this.config = config;
    this.isRunning = false;
    this.exchangeManager = new ExchangeManager(config.exchanges);
    this.arbitrageDetector = new ArbitrageDetector(config.arbitrage);
    this.tradeExecutor = new TradeExecutor(config.execution);
    this.riskManager = new RiskManager(config.risk);
    this.opportunities = [];
  }

  async start() {
    if (this.isRunning) {
      logger.warn('引擎已在运行中');
      return;
    }

    try {
      logger.info('🔄 初始化交易所连接...');
      await this.exchangeManager.initialize();
      
      logger.info('✅ 所有交易所连接成功');
      logger.info(`📊 监控交易对: ${this.config.tradingPairs.join(', ')}`);
      
      this.isRunning = true;
      
      // 开始主循环
      this.mainLoop();
      
    } catch (error) {
      logger.error('引擎启动失败:', error);
      throw error;
    }
  }

  async mainLoop() {
    while (this.isRunning) {
      try {
        // 1. 获取所有交易所的价格数据
        const priceData = await this.fetchPrices();
        
        // 2. 检测套利机会
        const opportunities = this.arbitrageDetector.detectOpportunities(priceData);
        
        if (opportunities.length > 0) {
          logger.info(`💰 发现 ${opportunities.length} 个套利机会`);
          
          // 3. 风险评估
          const validOpportunities = opportunities.filter(opp => 
            this.riskManager.validateOpportunity(opp)
          );
          
          if (validOpportunities.length > 0) {
            logger.info(`✓ 通过风险验证的机会: ${validOpportunities.length} 个`);
            
            // 4. 执行交易（如果启用自动交易）
            if (this.config.execution.autoTrade) {
              for (const opportunity of validOpportunities) {
                await this.tradeExecutor.execute(opportunity, this.exchangeManager);
              }
            } else {
              // 仅记录机会，不执行交易
              validOpportunities.forEach(opp => {
                logger.info(`[模拟模式] 套利机会: ${opp.pair} | ${opp.buyExchange} -> ${opp.sellExchange} | 利润: ${opp.profitPercent.toFixed(2)}%`);
              });
            }
          }
        }
        
        // 等待下一次迭代
        await this.sleep(this.config.scanInterval);
        
      } catch (error) {
        logger.error('主循环错误:', error);
        await this.sleep(5000); // 错误后等待5秒
      }
    }
  }

  async fetchPrices() {
    const exchanges = this.exchangeManager.getExchanges();
    const priceData = {};
    
    for (const exchangeName of Object.keys(exchanges)) {
      priceData[exchangeName] = {};
      
      for (const pair of this.config.tradingPairs) {
        try {
          const ticker = await exchanges[exchangeName].fetchTicker(pair);
          priceData[exchangeName][pair] = {
            bid: ticker.bid,
            ask: ticker.ask,
            timestamp: ticker.timestamp
          };
        } catch (error) {
          logger.error(`获取价格失败 [${exchangeName}] ${pair}:`, error.message);
        }
      }
    }
    
    return priceData;
  }

  async stop() {
    logger.info('正在停止引擎...');
    this.isRunning = false;
    await this.exchangeManager.close();
    logger.info('✅ 引擎已停止');
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

