/**
 * 查找 Gate.io 上可用的交易对
 */

import ccxt from 'ccxt';

async function findPairs() {
  console.log('🔍 查找 Gate.io 上的可用交易对');
  console.log('═'.repeat(70));
  console.log('');
  
  const exchange = new ccxt.gate({
    enableRateLimit: true,
    timeout: 15000,
    options: { defaultType: 'spot' }
  });
  
  await exchange.loadMarkets();
  
  // 我们关注的币种
  const coins = [
    'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 
    'MATIC', 'DOT', 'AVAX', 'LINK', 'UNI', 'LTC', 'BCH', 
    'ATOM', 'TRX', 'SHIB', 'LEO', 'WBTC', 'NEAR', 
    'FIL', 'APT', 'ARB', 'OP', 'ICP', 'HBAR', 
    'VET', 'ALGO', 'ETC', 'XLM', 'AAVE', 'MKR'
  ];
  
  const results = {
    'USDT': [],
    'BTC': [],
    'ETH': []
  };
  
  // 查找所有可用的交易对
  for (const coin of coins) {
    for (const quote of ['USDT', 'BTC', 'ETH']) {
      const symbol = `${coin}/${quote}`;
      if (exchange.markets[symbol]) {
        results[quote].push(symbol);
      }
    }
  }
  
  console.log('📊 找到的交易对:');
  console.log('');
  
  for (const [quote, symbols] of Object.entries(results)) {
    console.log(`${quote} 计价 (${symbols.length} 个):`);
    symbols.forEach(s => console.log(`  • ${s}`));
    console.log('');
  }
  
  // 生成推荐配置
  const recommended = [
    ...results['USDT'].slice(0, 20),  // 前20个USDT对
    ...results['BTC'].slice(0, 10),   // 前10个BTC对
    ...results['ETH'].slice(0, 5)     // 前5个ETH对
  ];
  
  console.log('═'.repeat(70));
  console.log('');
  console.log('💡 推荐配置（包含多种计价货币）:');
  console.log('');
  console.log('```javascript');
  console.log('symbols: [');
  recommended.forEach(s => {
    console.log(`  '${s}',`);
  });
  console.log(']');
  console.log('```');
  console.log('');
  console.log(`总计: ${recommended.length} 个交易对`);
}

findPairs().catch(error => {
  console.error('查找失败:', error);
});

