/**
 * 测试交易对在 Gate.io 上的可用性
 */

import ccxt from 'ccxt';

// 用户提供的交易对列表（需要标准化）
const userSymbols = [
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ETHBTC', 'LTCUSDT', 'XRPUSDT',
  'BTC/ETH', 'BTC/BNB', 'BTC/SOL', 'ETH/BNB', 'ETH/SOL', 'ETH/ADA',
  'BNB/MATIC', 'SOL/AVAX', 'ADA/DOT', 'AVAX/SOL', 'BTC/ADA', 'BTC/MATIC',
  'ETH/AVAX', 'ETH/LTC', 'BNB/SOL', 'BNB/AVAX', 'ADA/MATIC', 'SOL/DOT',
  'ADA/SOL', 'DOT/AVAX', 'LTC/BCH', 'DOT/ADA', 'MATIC/SOL', 'BNB/ADA',
  'AVAX/DOT', 'LTC/ETH', 'BCH/BTC', 'XRP/ETH', 'XRP/BNB', 'DOGE/BNB'
];

// 标准化交易对格式
function normalizeSymbol(symbol) {
  if (symbol.includes('/')) {
    return symbol; // 已经是标准格式
  }
  
  // 处理类似 BTCUSDT 的格式
  const pairs = [
    ['USDT', '/USDT'],
    ['BTC', '/BTC'],
    ['ETH', '/ETH'],
    ['BNB', '/BNB'],
    ['BUSD', '/BUSD']
  ];
  
  for (const [quote, replacement] of pairs) {
    if (symbol.endsWith(quote)) {
      const base = symbol.slice(0, -quote.length);
      return `${base}/${quote}`;
    }
  }
  
  return symbol;
}

async function testSymbols() {
  console.log('🔍 测试交易对在 Gate.io 上的可用性');
  console.log('═'.repeat(70));
  console.log('');
  
  const exchange = new ccxt.gate({
    enableRateLimit: true,
    timeout: 15000,
    options: { defaultType: 'spot' }
  });
  
  await exchange.loadMarkets();
  console.log(`✅ 已加载 ${Object.keys(exchange.markets).length} 个交易对`);
  console.log('');
  
  const available = [];
  const unavailable = [];
  
  // 标准化并去重
  const normalizedSymbols = [...new Set(userSymbols.map(normalizeSymbol))];
  
  console.log(`📋 测试 ${normalizedSymbols.length} 个交易对:`);
  console.log('');
  
  for (const symbol of normalizedSymbols) {
    const exists = exchange.markets[symbol] !== undefined;
    
    if (exists) {
      available.push(symbol);
      console.log(`  ✅ ${symbol}`);
    } else {
      unavailable.push(symbol);
      console.log(`  ❌ ${symbol}`);
      
      // 尝试找到相似的交易对
      const [base, quote] = symbol.split('/');
      const alternatives = [];
      
      // 尝试反向
      const reversed = `${quote}/${base}`;
      if (exchange.markets[reversed]) {
        alternatives.push(reversed);
      }
      
      // 尝试其他报价货币
      const otherQuotes = ['USDT', 'BTC', 'ETH', 'BNB'];
      for (const q of otherQuotes) {
        if (q !== quote) {
          const alt = `${base}/${q}`;
          if (exchange.markets[alt]) {
            alternatives.push(alt);
          }
        }
      }
      
      if (alternatives.length > 0) {
        console.log(`     建议替代: ${alternatives.slice(0, 3).join(', ')}`);
      }
    }
  }
  
  console.log('');
  console.log('═'.repeat(70));
  console.log('');
  console.log('📊 统计结果:');
  console.log(`   ✅ 可用: ${available.length} 个`);
  console.log(`   ❌ 不可用: ${unavailable.length} 个`);
  console.log('');
  
  if (available.length > 0) {
    console.log('✅ 可用的交易对列表:');
    console.log('');
    console.log('```javascript');
    console.log('symbols: [');
    available.forEach(s => {
      console.log(`  '${s}',`);
    });
    console.log(']');
    console.log('```');
    console.log('');
  }
  
  if (unavailable.length > 0) {
    console.log('❌ 不可用的交易对:');
    unavailable.forEach(s => console.log(`   • ${s}`));
    console.log('');
    console.log('💡 提示: 这些交易对在 Gate.io 上不存在或已下架');
  }
}

testSymbols().catch(error => {
  console.error('测试失败:', error);
});

