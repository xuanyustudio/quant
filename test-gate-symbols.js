/**
 * 测试 Gate.io 交易对格式
 */

import ccxt from 'ccxt';

async function test() {
  console.log('🔍 检查 Gate.io 交易对...');
  console.log('');
  
  const exchange = new ccxt.gate({
    enableRateLimit: true,
    timeout: 15000,
    options: { defaultType: 'spot' }
  });
  
  await exchange.loadMarkets();
  
  const testSymbols = [
    'BTC/USDT',
    'ETH/USDT',
    'BNB/USDT',
    'SOL/USDT',
    'XRP/USDT'
  ];
  
  console.log('📋 测试交易对是否存在:');
  console.log('');
  
  for (const symbol of testSymbols) {
    const exists = exchange.markets[symbol] !== undefined;
    console.log(`  ${exists ? '✅' : '❌'} ${symbol}`);
    
    if (!exists) {
      // 搜索相似的交易对
      const similar = Object.keys(exchange.markets).filter(s => 
        s.includes(symbol.split('/')[0])
      ).slice(0, 3);
      
      if (similar.length > 0) {
        console.log(`     可能的替代: ${similar.join(', ')}`);
      }
    }
  }
  
  console.log('');
  console.log('📊 Gate.io 总交易对数量:', Object.keys(exchange.markets).length);
  console.log('');
  
  // 测试获取 K 线数据
  console.log('📈 测试获取 K 线数据:');
  try {
    const ohlcv = await exchange.fetchOHLCV('BTC/USDT', '1h', undefined, 10);
    console.log(`  ✅ 成功获取 BTC/USDT 数据: ${ohlcv.length} 条`);
    console.log(`  最新价格: $${ohlcv[ohlcv.length - 1][4]}`);
  } catch (error) {
    console.log(`  ❌ 失败: ${error.message}`);
  }
  
  console.log('');
}

test().catch(error => {
  console.error('测试失败:', error);
});

