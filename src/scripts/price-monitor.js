/**
 * 简单的价格监控脚本
 * 用于观察不同交易所的价格差异，不执行交易
 */

import dotenv from 'dotenv';
import ccxt from 'ccxt';
import { formatNumber, formatTimestamp } from '../utils/helpers.js';

dotenv.config();

const PAIRS = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT'];
// 国内用户推荐使用：okx, gate, huobi（无需翻墙）
// 如果有代理可以添加 'binance'
const EXCHANGES = ['okx', 'gate'];
const UPDATE_INTERVAL = 5000; // 5秒

class PriceMonitor {
  constructor() {
    this.exchanges = {};
    this.prices = {};
  }

  async initialize() {
    console.log('🚀 初始化价格监控...\n');

    for (const exchangeId of EXCHANGES) {
      try {
        const ExchangeClass = ccxt[exchangeId];
        this.exchanges[exchangeId] = new ExchangeClass({
          enableRateLimit: true
        });
        
        await this.exchanges[exchangeId].loadMarkets();
        console.log(`✅ ${exchangeId} 已连接`);
      } catch (error) {
        console.error(`❌ ${exchangeId} 连接失败:`, error.message);
      }
    }

    console.log('');
  }

  async fetchPrices() {
    const newPrices = {};

    for (const exchangeId of Object.keys(this.exchanges)) {
      newPrices[exchangeId] = {};
      
      for (const pair of PAIRS) {
        try {
          const ticker = await this.exchanges[exchangeId].fetchTicker(pair);
          newPrices[exchangeId][pair] = {
            bid: ticker.bid,
            ask: ticker.ask,
            last: ticker.last
          };
        } catch (error) {
          // 静默失败，不影响其他交易对
        }
      }
    }

    this.prices = newPrices;
  }

  displayPrices() {
    console.clear();
    console.log('═'.repeat(80));
    console.log(`📊 加密货币价格监控 - ${formatTimestamp(Date.now())}`);
    console.log('═'.repeat(80));
    console.log('');

    for (const pair of PAIRS) {
      console.log(`💰 ${pair}`);
      console.log('─'.repeat(80));

      const exchangeIds = Object.keys(this.prices);
      
      // 显示每个交易所的价格
      for (const exchangeId of exchangeIds) {
        const price = this.prices[exchangeId][pair];
        if (price) {
          console.log(
            `  ${exchangeId.padEnd(10)} | ` +
            `买: ${formatNumber(price.bid, 2).toString().padEnd(12)} | ` +
            `卖: ${formatNumber(price.ask, 2).toString().padEnd(12)} | ` +
            `最新: ${formatNumber(price.last, 2)}`
          );
        }
      }

      // 计算套利机会
      if (exchangeIds.length >= 2) {
        const opportunities = this.findArbitrage(pair);
        if (opportunities.length > 0) {
          console.log('');
          opportunities.forEach(opp => {
            console.log(
              `  🎯 套利机会: ${opp.buyExchange} (${opp.buyPrice}) -> ` +
              `${opp.sellExchange} (${opp.sellPrice}) | ` +
              `利润: ${formatNumber(opp.profit, 2)}%`
            );
          });
        }
      }

      console.log('');
    }

    console.log('═'.repeat(80));
    console.log('按 Ctrl+C 退出');
  }

  findArbitrage(pair) {
    const opportunities = [];
    const exchangeIds = Object.keys(this.prices);

    for (let i = 0; i < exchangeIds.length; i++) {
      for (let j = i + 1; j < exchangeIds.length; j++) {
        const ex1 = exchangeIds[i];
        const ex2 = exchangeIds[j];

        const price1 = this.prices[ex1][pair];
        const price2 = this.prices[ex2][pair];

        if (!price1 || !price2) continue;

        // 在 ex1 买，ex2 卖
        const profit1 = ((price2.bid - price1.ask) / price1.ask) * 100;
        if (profit1 > 0.1) {
          opportunities.push({
            buyExchange: ex1,
            sellExchange: ex2,
            buyPrice: formatNumber(price1.ask, 2),
            sellPrice: formatNumber(price2.bid, 2),
            profit: profit1
          });
        }

        // 在 ex2 买，ex1 卖
        const profit2 = ((price1.bid - price2.ask) / price2.ask) * 100;
        if (profit2 > 0.1) {
          opportunities.push({
            buyExchange: ex2,
            sellExchange: ex1,
            buyPrice: formatNumber(price2.ask, 2),
            sellPrice: formatNumber(price1.bid, 2),
            profit: profit2
          });
        }
      }
    }

    return opportunities.sort((a, b) => b.profit - a.profit);
  }

  async start() {
    await this.initialize();

    console.log('开始监控价格...\n');

    setInterval(async () => {
      try {
        await this.fetchPrices();
        this.displayPrices();
      } catch (error) {
        console.error('获取价格失败:', error.message);
      }
    }, UPDATE_INTERVAL);

    // 首次立即执行
    await this.fetchPrices();
    this.displayPrices();
  }
}

// 启动监控
const monitor = new PriceMonitor();
monitor.start().catch(error => {
  console.error('监控启动失败:', error);
  process.exit(1);
});

