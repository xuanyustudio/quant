/**
 * 测试币安本地代理连接
 */

import ccxt from 'ccxt';

async function testProxy() {
  console.log('🔍 测试币安本地代理连接...\n');
  
  // 测试本地代理
  const proxyUrl = 'http://localhost:7897';
  console.log(`代理地址: ${proxyUrl}`);
  
  try {
    const exchange = new ccxt.binance({
      httpsProxy: proxyUrl,
      enableRateLimit: true,
      timeout: 30000  // 30秒超时
    });
    
    console.log('⏳ 正在连接币安交易所...');
    
    const time = await exchange.fetchTime();
    const serverTime = new Date(time);
    const localTime = new Date();
    
    console.log('✅ 连接成功！');
    console.log(`服务器时间: ${serverTime.toISOString()}`);
    console.log(`本地时间: ${localTime.toISOString()}`);
    console.log(`时间差: ${Math.abs(time - localTime.getTime())} ms`);
    
    // 测试获取市场信息
    console.log('\n⏳ 测试获取市场信息...');
    await exchange.loadMarkets();
    console.log(`✅ 成功加载 ${Object.keys(exchange.markets).length} 个交易对`);
    
    // 测试获取ticker
    console.log('\n⏳ 测试获取 BTC/USDT ticker...');
    const ticker = await exchange.fetchTicker('BTC/USDT');
    console.log(`✅ BTC/USDT 当前价格: $${ticker.last}`);
    
    console.log('\n🎉 所有测试通过！本地代理工作正常！');
    
  } catch (error) {
    console.error('\n❌ 连接失败:', error.message);
    console.error('\n💡 可能的原因:');
    console.error('   1. 本地代理 localhost:7897 未启动');
    console.error('   2. 代理端口配置错误');
    console.error('   3. 代理无法访问币安API');
    console.error('\n请检查您的本地代理是否正常运行。');
    process.exit(1);
  }
}

testProxy();

