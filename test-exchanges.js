/**
 * 测试多个交易所的连通性
 */

import ccxt from 'ccxt';

const EXCHANGES_TO_TEST = [
  { id: 'binance', proxy: 'http://image.h4yx.com:3000', name: '币安（通过代理）' },
  { id: 'binance', proxy: null, name: '币安（直连）' },
  { id: 'okx', proxy: null, name: 'OKX' },
  { id: 'gate', proxy: null, name: 'Gate.io' },
  { id: 'huobi', proxy: null, name: '火币 HTX' },
  { id: 'mexc', proxy: null, name: 'MEXC' },
  { id: 'bybit', proxy: null, name: 'Bybit' }
];

async function testExchange(exchangeId, proxy = null, name = null) {
  const displayName = name || exchangeId;
  
  try {
    const ExchangeClass = ccxt[exchangeId];
    if (!ExchangeClass) {
      console.log(`  ⚠️  ${displayName}: 交易所类不存在`);
      return { success: false, error: '不支持' };
    }
    
    const config = {
      enableRateLimit: true,
      timeout: 10000,
      options: { defaultType: 'spot' }
    };
    
    if (proxy) {
      config.httpsProxy = proxy;
    }
    
    const exchange = new ExchangeClass(config);
    
    // 测试连接
    await exchange.loadMarkets();
    
    // 获取 BTC 价格
    let price = 'N/A';
    if (exchange.markets['BTC/USDT']) {
      const ticker = await exchange.fetchTicker('BTC/USDT');
      price = `$${ticker.last.toFixed(2)}`;
    }
    
    console.log(`  ✅ ${displayName}: 连接成功，BTC 价格: ${price}`);
    return { success: true, exchange: exchangeId, price };
    
  } catch (error) {
    const errorMsg = error.message.substring(0, 60);
    console.log(`  ❌ ${displayName}: ${errorMsg}`);
    return { success: false, error: errorMsg };
  }
}

async function main() {
  console.log('🌐 测试交易所连通性');
  console.log('═'.repeat(70));
  console.log('');
  console.log('正在测试多个交易所，请稍候...');
  console.log('');
  
  const results = [];
  
  for (const { id, proxy, name } of EXCHANGES_TO_TEST) {
    const result = await testExchange(id, proxy, name);
    results.push({ id, proxy, name, ...result });
  }
  
  console.log('');
  console.log('═'.repeat(70));
  console.log('');
  console.log('📊 测试结果汇总:');
  console.log('');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  if (successful.length > 0) {
    console.log(`✅ 可用的交易所 (${successful.length} 个):`);
    successful.forEach(r => {
      console.log(`   • ${r.name} ${r.proxy ? '(代理)' : ''}`);
      console.log(`     ID: ${r.id}${r.proxy ? `, 代理: ${r.proxy}` : ''}`);
    });
    console.log('');
  }
  
  if (failed.length > 0) {
    console.log(`❌ 不可用的交易所 (${failed.length} 个):`);
    failed.forEach(r => {
      console.log(`   • ${r.name}: ${r.error}`);
    });
    console.log('');
  }
  
  console.log('═'.repeat(70));
  console.log('');
  
  if (successful.length > 0) {
    const best = successful[0];
    console.log('💡 推荐配置:');
    console.log('');
    console.log(`在 src/statistical-arbitrage/config.js 中设置:`);
    console.log('');
    console.log('```javascript');
    console.log('exchange: {');
    console.log(`  id: '${best.id}',`);
    if (best.proxy) {
      console.log(`  // 使用代理`);
      console.log(`  httpsProxy: '${best.proxy}',`);
    }
    console.log(`  apiKey: process.env.${best.id.toUpperCase()}_API_KEY || '',`);
    console.log(`  secret: process.env.${best.id.toUpperCase()}_SECRET || '',`);
    console.log('  enableRateLimit: true,');
    console.log('  options: { defaultType: \'spot\' }');
    console.log('}');
    console.log('```');
    console.log('');
    console.log(`然后运行: npm run stat-arb:find-pairs`);
  } else {
    console.log('❌ 所有交易所都无法连接！');
    console.log('');
    console.log('可能的原因:');
    console.log('1. 网络问题');
    console.log('2. 防火墙阻止');
    console.log('3. DNS 解析问题');
    console.log('');
    console.log('建议:');
    console.log('1. 检查网络连接');
    console.log('2. 尝试使用 VPN');
    console.log('3. 检查防火墙设置');
  }
  
  console.log('');
}

main().catch(error => {
  console.error('测试失败:', error);
});

