/**
 * 调试统计套利系统
 */

import dotenv from 'dotenv';
import ccxt from 'ccxt';
import config from './src/statistical-arbitrage/config.js';

dotenv.config();

async function test() {
  console.log('🔍 调试统计套利系统');
  console.log('═'.repeat(60));
  console.log('');
  
  // 测试 1: 检查配置
  console.log('📋 检查配置:');
  console.log(`  交易所: ${config.exchange.id}`);
  console.log(`  API Key: ${config.exchange.apiKey ? '已配置 (' + config.exchange.apiKey.substring(0, 8) + '...)' : '❌ 未配置'}`);
  console.log(`  Secret: ${config.exchange.secret ? '已配置' : '❌ 未配置'}`);
  
  if (config.exchange.id === 'okx') {
    console.log(`  Password: ${config.exchange.password ? '已配置' : '❌ 未配置'}`);
  }
  
  console.log(`  交易对数量: ${config.strategy.symbols.length}`);
  console.log('');
  
  // 测试 2: 检查环境变量
  console.log('🔐 检查环境变量:');
  console.log(`  OKX_API_KEY: ${process.env.OKX_API_KEY ? '已设置' : '❌ 未设置'}`);
  console.log(`  OKX_SECRET: ${process.env.OKX_SECRET ? '已设置' : '❌ 未设置'}`);
  console.log(`  OKX_PASSWORD: ${process.env.OKX_PASSWORD ? '已设置' : '❌ 未设置'}`);
  console.log(`  BINANCE_API_KEY: ${process.env.BINANCE_API_KEY ? '已设置' : '❌ 未设置'}`);
  console.log(`  BINANCE_PROXY_URL: ${process.env.BINANCE_PROXY_URL || '未设置'}`);
  console.log('');
  
  // 测试 3: 测试交易所连接（无需 API key）
  console.log('🌐 测试交易所连接（公开 API）:');
  try {
    const ExchangeClass = ccxt[config.exchange.id];
    if (!ExchangeClass) {
      console.log(`  ❌ 交易所 '${config.exchange.id}' 不存在`);
      console.log(`  可用的交易所: binance, okx, gate, huobi...`);
      return;
    }
    
    // 不使用 API key 创建交易所实例（只测试公开 API）
    const exchange = new ExchangeClass({
      enableRateLimit: true,
      timeout: 15000,
      options: config.exchange.options || {}
    });
    
    console.log(`  正在连接 ${config.exchange.id}...`);
    await exchange.loadMarkets();
    console.log(`  ✅ 连接成功！`);
    console.log(`  可用交易对: ${Object.keys(exchange.markets).length} 个`);
    
    // 测试获取行情
    const testSymbol = 'BTC/USDT';
    if (exchange.markets[testSymbol]) {
      console.log(`  测试获取 ${testSymbol} 行情...`);
      const ticker = await exchange.fetchTicker(testSymbol);
      console.log(`  ✅ 当前价格: $${ticker.last}`);
    }
    
    console.log('');
    
  } catch (error) {
    console.log(`  ❌ 连接失败: ${error.message}`);
    console.log('');
    
    if (error.message.includes('binance') && error.message.includes('timed out')) {
      console.log('💡 提示:');
      console.log('  币安在国内无法直接访问，需要代理。');
      console.log('  建议使用 OKX（国内可访问）。');
      console.log('');
      console.log('解决方案:');
      console.log('  1. 修改 src/statistical-arbitrage/config.js:');
      console.log(`     exchange: { id: 'okx', ... }`);
      console.log('  2. 或配置代理: HTTPS_PROXY=http://image.h4yx.com:3000');
    }
    
    if (error.message.includes('API')) {
      console.log('💡 提示:');
      console.log('  某些功能需要 API 密钥，但寻找配对不需要。');
      console.log('  公开 API 可以获取市场数据。');
    }
    
    return;
  }
  
  // 测试 4: 测试数据获取
  console.log('📊 测试历史数据获取:');
  try {
    const ExchangeClass = ccxt[config.exchange.id];
    const exchange = new ExchangeClass({
      enableRateLimit: true,
      timeout: 15000,
      options: config.exchange.options || {}
    });
    
    await exchange.loadMarkets();
    
    const symbol = config.strategy.symbols[0];
    console.log(`  获取 ${symbol} 的 1 小时 K 线数据...`);
    
    const ohlcv = await exchange.fetchOHLCV(symbol, '1h', undefined, 10);
    console.log(`  ✅ 获取成功: ${ohlcv.length} 条数据`);
    console.log(`  最新收盘价: $${ohlcv[ohlcv.length - 1][4]}`);
    console.log('');
    
  } catch (error) {
    console.log(`  ❌ 获取失败: ${error.message}`);
    console.log('');
  }
  
  // 总结
  console.log('═'.repeat(60));
  console.log('');
  console.log('📝 诊断结果:');
  console.log('');
  
  if (!config.exchange.apiKey && !process.env[`${config.exchange.id.toUpperCase()}_API_KEY`]) {
    console.log('⚠️  未配置 API 密钥（但寻找配对不需要）');
    console.log('');
    console.log('如果要进行交易（实盘或回测），需要配置 API:');
    console.log('');
    console.log('1. 创建 .env 文件，添加:');
    if (config.exchange.id === 'okx') {
      console.log('   OKX_API_KEY=your_key');
      console.log('   OKX_SECRET=your_secret');
      console.log('   OKX_PASSWORD=your_password');
    } else if (config.exchange.id === 'binance') {
      console.log('   BINANCE_API_KEY=your_key');
      console.log('   BINANCE_SECRET=your_secret');
    }
    console.log('');
    console.log('2. 但**寻找配对**功能不需要 API，应该可以运行');
  } else {
    console.log('✅ API 已配置');
  }
  
  console.log('');
  console.log('下一步:');
  console.log('  如果上面的测试都通过了，运行:');
  console.log('  npm run stat-arb:find-pairs');
  console.log('');
}

test().catch(error => {
  console.error('❌ 测试失败:', error);
  console.error('');
  console.error('完整错误:');
  console.error(error);
});

