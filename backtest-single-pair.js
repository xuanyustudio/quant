/**
 * 单个交易对回测 - 显示详细信息
 */

import ccxt from 'ccxt';
import { config } from 'dotenv';
import { Backtest } from './src/statistical-arbitrage/Backtest.js';
import { DataCollector } from './src/statistical-arbitrage/DataCollector.js';
import { logger } from './src/utils/logger.js';
import statArbConfig from './src/statistical-arbitrage/config.js';

config();

async function main() {
  const symbol1 = 'ADA/USDT';
  const symbol2 = 'ARB/USDT';
  
  logger.info('');
  logger.info('═'.repeat(60));
  logger.info(`🎯 单个交易对详细回测`);
  logger.info('═'.repeat(60));
  logger.info(`配对: ${symbol1} ↔ ${symbol2}`);
  logger.info('');

  // 初始化交易所
  const exchange = new ccxt[statArbConfig.exchange.id]({
    apiKey: statArbConfig.exchange.apiKey,
    secret: statArbConfig.exchange.secret,
    enableRateLimit: statArbConfig.exchange.enableRateLimit,
    timeout: statArbConfig.exchange.timeout,
    options: statArbConfig.exchange.options
  });

  // 数据收集器
  const dataCollector = new DataCollector(exchange, {
    dataDir: './data'
  });
  
  // 获取历史数据
  const timeframe = statArbConfig.strategy.timeframe || '1h';
  const limit = statArbConfig.strategy.lookbackPeriod * 2 || 200;
  
  // 计算开始时间
  function getTimeframeMs(tf) {
    const units = {
      'm': 60 * 1000,
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000,
      'w': 7 * 24 * 60 * 60 * 1000
    };
    const value = parseInt(tf);
    const unit = tf.replace(/\d+/, '');
    return value * (units[unit] || units['h']);
  }
  
  const since = Date.now() - (limit * getTimeframeMs(timeframe));
  
  logger.info(`📊 获取 ${symbol1} 的历史数据...`);
  const data1 = await dataCollector.fetchOHLCV(symbol1, timeframe, limit, since);
  
  logger.info(`📊 获取 ${symbol2} 的历史数据...`);
  const data2 = await dataCollector.fetchOHLCV(symbol2, timeframe, limit, since);
  
  if (!data1 || !data2) {
    logger.error('❌ 获取数据失败');
    return;
  }
  
  // 提取价格和时间戳
  const prices1 = data1.map(d => d.close);
  const prices2 = data2.map(d => d.close);
  const timestamps = data1.map(d => d.timestamp);
  
  // 运行回测
  const backtest = new Backtest({
    initialCapital: 10000,
    positionSize: 0.5,
    commission: 0.001,
    strategy: statArbConfig.strategy
  });
  
  const results = await backtest.run(symbol1, symbol2, prices1, prices2, timestamps);
  
  logger.info('');
  logger.info('═'.repeat(60));
  logger.info('🏁 回测完成');
  logger.info('═'.repeat(60));
}

main().catch(error => {
  logger.error('执行失败:', error);
  process.exit(1);
});

