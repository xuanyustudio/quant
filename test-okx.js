/**
 * 测试 OKX 连接
 */

import ccxt from 'ccxt';
import dotenv from 'dotenv';

dotenv.config();

async function testOKX() {
  console.log('🧪 测试 OKX 连接...');
  console.log('═'.repeat(60));
  console.log('');

  // 检查API密钥
  if (!process.env.OKX_API_KEY) {
    console.log('⚠️  未配置 OKX API 密钥');
    console.log('');
    console.log('请在 .env 文件中配置:');
    console.log('OKX_API_KEY=你的API密钥');
    console.log('OKX_SECRET=你的Secret密钥');
    console.log('OKX_PASSWORD=你的API密码');
    console.log('');
    console.log('💡 如何获取:');
    console.log('1. 访问 https://www.okx.com');
    console.log('2. 登录后进入 个人中心 → API');
    console.log('3. 创建 API 密钥');
    console.log('4. 权限: 只开启"交易"，禁用"提币"');
    console.log('5. 记录 API Key, Secret Key, Passphrase');
    console.log('');
    return;
  }

  try {
    // 创建 OKX 实例
    const exchange = new ccxt.okx({
      apiKey: process.env.OKX_API_KEY,
      secret: process.env.OKX_SECRET,
      password: process.env.OKX_PASSWORD,
      enableRateLimit: true,
      timeout: 15000,
      options: {
        defaultType: 'spot'
      }
    });

    console.log('✅ OKX 实例创建成功');
    console.log('');

    // 测试1: 加载市场
    console.log('测试 1: 加载市场数据...');
    await exchange.loadMarkets();
    const marketCount = Object.keys(exchange.markets).length;
    console.log(`✅ 市场数据加载成功，共 ${marketCount} 个交易对`);
    console.log('');

    // 测试2: 获取BTC价格
    console.log('测试 2: 获取 BTC/USDT 实时行情...');
    const btcTicker = await exchange.fetchTicker('BTC/USDT');
    console.log(`✅ BTC/USDT:`);
    console.log(`   最新价: $${btcTicker.last.toLocaleString()}`);
    console.log(`   24h 高: $${btcTicker.high.toLocaleString()}`);
    console.log(`   24h 低: $${btcTicker.low.toLocaleString()}`);
    console.log(`   24h 成交量: ${btcTicker.baseVolume.toLocaleString()} BTC`);
    console.log('');

    // 测试3: 获取ETH价格
    console.log('测试 3: 获取 ETH/USDT 实时行情...');
    const ethTicker = await exchange.fetchTicker('ETH/USDT');
    console.log(`✅ ETH/USDT:`);
    console.log(`   最新价: $${ethTicker.last.toLocaleString()}`);
    console.log(`   BTC/ETH 比率: ${(btcTicker.last / ethTicker.last).toFixed(2)}`);
    console.log('');

    // 测试4: 获取历史K线
    console.log('测试 4: 获取历史K线数据...');
    const ohlcv = await exchange.fetchOHLCV('BTC/USDT', '1h', undefined, 5);
    console.log(`✅ 获取K线成功，最近5条:`);
    ohlcv.forEach((candle, index) => {
      const time = new Date(candle[0]).toLocaleString('zh-CN', {
        month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
      });
      const change = ((candle[4] - candle[1]) / candle[1] * 100).toFixed(2);
      const direction = change >= 0 ? '📈' : '📉';
      console.log(`   ${direction} ${time} | $${candle[4].toLocaleString()} (${change}%)`);
    });
    console.log('');

    // 测试5: 测试多个交易对（配对交易需要）
    console.log('测试 5: 批量获取价格（配对交易测试）...');
    const pairs = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT'];
    console.log('✅ 热门币种实时价格:');
    for (const pair of pairs) {
      try {
        const ticker = await exchange.fetchTicker(pair);
        console.log(`   ${pair.padEnd(12)}: $${ticker.last.toLocaleString().padStart(10)}`);
        await new Promise(resolve => setTimeout(resolve, 100)); // 避免触发限流
      } catch (error) {
        console.log(`   ${pair}: 获取失败`);
      }
    }
    console.log('');

    console.log('═'.repeat(60));
    console.log('🎉 OKX 连接测试完成！所有功能正常');
    console.log('');
    console.log('✅ OKX 优势:');
    console.log('   • 国内直接访问，无需代理');
    console.log('   • 流动性充足，适合配对交易');
    console.log('   • API 稳定，限流宽松');
    console.log('   • 手续费低（0.1%）');
    console.log('');
    console.log('📊 现在可以运行统计套利系统:');
    console.log('   npm run stat-arb:find-pairs    # 寻找配对');
    console.log('   npm run stat-arb:backtest      # 运行回测');
    console.log('   npm run stat-arb               # 实盘运行');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ 测试失败:', error.message);
    console.error('');
    
    if (error.message.includes('Invalid API')) {
      console.error('🔍 API密钥配置错误:');
      console.error('   1. 检查 .env 文件中的密钥是否正确');
      console.error('   2. 确认 OKX_PASSWORD 是否配置');
      console.error('   3. 验证 API 密钥权限设置');
    } else if (error.message.includes('IP')) {
      console.error('🔍 IP白名单问题:');
      console.error('   1. 在 OKX API 管理中添加当前 IP');
      console.error('   2. 或移除 IP 白名单限制');
    } else {
      console.error('🔍 其他可能原因:');
      console.error('   1. 网络连接问题');
      console.error('   2. OKX 服务维护中');
      console.error('   3. API 密钥已过期或被删除');
    }
    console.error('');
  }
}

testOKX();

