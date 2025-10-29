/**
 * 直接测试 DataCollector
 */

import ccxt from 'ccxt';
import { DataCollector } from './src/statistical-arbitrage/DataCollector.js';

async function test() {
  console.log('🧪 测试 DataCollector');
  console.log('');
  
  // 创建交易所实例
  const exchange = new ccxt.gate({
    enableRateLimit: true,
    timeout: 15000,
    options: { defaultType: 'spot' }
  });
  
  await exchange.loadMarkets();
  console.log('✅ 交易所已连接');
  console.log('');
  
  // 创建 DataCollector
  const collector = new DataCollector(exchange, {
    dataDir: './data/test'
  });
  
  await collector.initialize();
  console.log('✅ DataCollector 已初始化');
  console.log('');
  
  // 测试单个交易对
  console.log('测试获取单个交易对...');
  try {
    const data = await collector.fetchOHLCV('BTC/USDT', '1h', 10);
    console.log(`✅ 成功: 获取了 ${data.length} 条数据`);
    console.log(`   最新价格: $${data[data.length - 1].close}`);
  } catch (error) {
    console.log(`❌ 失败: ${error.message}`);
    console.log('完整错误:', error);
  }
  
  console.log('');
  
  // 测试多个交易对
  console.log('测试获取多个交易对...');
  const symbols = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'];
  try {
    const results = await collector.fetchMultipleOHLCV(symbols, '1h', 10);
    
    for (const symbol of symbols) {
      if (results[symbol]) {
        console.log(`✅ ${symbol}: ${results[symbol].length} 条数据`);
      } else {
        console.log(`❌ ${symbol}: 失败`);
      }
    }
  } catch (error) {
    console.log(`❌ 失败: ${error.message}`);
    console.log('完整错误:', error);
  }
}

test().catch(error => {
  console.error('测试错误:', error);
});

