/**
 * 测试代理连接脚本 v3 - 正确配置 urls.api
 */

import dotenv from 'dotenv';
import ccxt from 'ccxt';

dotenv.config();

const PROXY_URL = 'http://image.h4yx.com:3000';

async function testConnection() {
  console.log('🧪 测试币安代理连接 (v3)...');
  console.log(`📡 代理地址: ${PROXY_URL}`);
  console.log('═'.repeat(60));
  console.log('');

  try {
    // 创建币安实例 - 直接替换API地址
    const exchange = new ccxt.binance({
      enableRateLimit: true,
      timeout: 15000,
      options: {
        adjustForTimeDifference: true,
        defaultType: 'spot'
      },
      urls: {
        api: {
          public: PROXY_URL,
          private: PROXY_URL
        }
      }
    });

    console.log('配置信息:');
    console.log(`- Public API: ${exchange.urls.api.public}`);
    console.log(`- Private API: ${exchange.urls.api.private}`);
    console.log('');

    // 测试1: Ping
    console.log('测试 1: Ping...');
    try {
      const response = await fetch(`${PROXY_URL}/api/v3/ping`);
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Ping 成功:', data);
      } else {
        console.log('❌ Ping 失败，状态码:', response.status);
      }
    } catch (error) {
      console.log('❌ Ping 失败:', error.message);
    }
    console.log('');

    // 测试2: 获取服务器时间
    console.log('测试 2: 获取服务器时间...');
    try {
      const time = await exchange.fetchTime();
      const serverDate = new Date(time);
      const localDate = new Date();
      const timeDiff = Math.abs(serverDate - localDate) / 1000;
      
      console.log('✅ 服务器时间:', serverDate.toLocaleString('zh-CN'));
      console.log('   本地时间:', localDate.toLocaleString('zh-CN'));
      console.log('   时间差:', timeDiff.toFixed(1), '秒');
    } catch (error) {
      console.log('❌ 获取时间失败:', error.message);
    }
    console.log('');

    // 测试3: 加载市场数据
    console.log('测试 3: 加载市场数据...');
    try {
      console.log('   (这可能需要10-20秒，请耐心等待...)');
      await exchange.loadMarkets();
      const marketCount = Object.keys(exchange.markets).length;
      console.log(`✅ 市场数据加载成功，共 ${marketCount} 个交易对`);
      
      // 显示一些热门交易对
      const popularPairs = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT', 'XRP/USDT'];
      console.log('   验证热门交易对:');
      popularPairs.forEach(pair => {
        if (exchange.markets[pair]) {
          console.log(`   ✓ ${pair}`);
        } else {
          console.log(`   ✗ ${pair} (未找到)`);
        }
      });
    } catch (error) {
      console.log('❌ 加载市场失败:', error.message);
    }
    console.log('');

    // 测试4: 获取BTC价格
    console.log('测试 4: 获取 BTC/USDT 实时行情...');
    try {
      const ticker = await exchange.fetchTicker('BTC/USDT');
      console.log('✅ BTC/USDT 实时数据:');
      console.log(`   最新价: $${ticker.last.toLocaleString()}`);
      console.log(`   买价: $${ticker.bid.toLocaleString()} | 卖价: $${ticker.ask.toLocaleString()}`);
      console.log(`   24h 最高: $${ticker.high.toLocaleString()}`);
      console.log(`   24h 最低: $${ticker.low.toLocaleString()}`);
      console.log(`   24h 涨跌: ${ticker.percentage ? ticker.percentage.toFixed(2) + '%' : 'N/A'}`);
      console.log(`   24h 成交量: ${ticker.baseVolume.toLocaleString(undefined, {maximumFractionDigits: 2})} BTC`);
    } catch (error) {
      console.log('❌ 获取价格失败:', error.message);
    }
    console.log('');

    // 测试5: 获取历史K线
    console.log('测试 5: 获取历史K线数据 (1小时，最近5条)...');
    try {
      const ohlcv = await exchange.fetchOHLCV('BTC/USDT', '1h', undefined, 5);
      console.log(`✅ 获取K线成功，共 ${ohlcv.length} 条数据`);
      
      console.log('   最新K线数据:');
      ohlcv.forEach((candle, index) => {
        const time = new Date(candle[0]).toLocaleString('zh-CN', { 
          month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' 
        });
        const change = ((candle[4] - candle[1]) / candle[1] * 100).toFixed(2);
        const direction = change >= 0 ? '📈' : '📉';
        console.log(`   ${direction} ${time} | 开: $${candle[1].toLocaleString()} | 收: $${candle[4].toLocaleString()} | 涨跌: ${change}%`);
      });
    } catch (error) {
      console.log('❌ 获取K线失败:', error.message);
    }
    console.log('');

    // 测试6: 测试多个交易对
    console.log('测试 6: 批量获取价格 (测试配对交易所需的数据)...');
    try {
      const testPairs = ['BTC/USDT', 'ETH/USDT'];
      const results = {};
      
      for (const pair of testPairs) {
        const ticker = await exchange.fetchTicker(pair);
        results[pair] = ticker.last;
        await new Promise(resolve => setTimeout(resolve, 100)); // 避免触发限流
      }
      
      console.log('✅ 批量获取成功:');
      for (const [pair, price] of Object.entries(results)) {
        console.log(`   ${pair}: $${price.toLocaleString()}`);
      }
      
      // 计算BTC/ETH比率（配对交易示例）
      const ratio = results['BTC/USDT'] / results['ETH/USDT'];
      console.log(`   BTC/ETH 价格比率: ${ratio.toFixed(2)}`);
    } catch (error) {
      console.log('❌ 批量获取失败:', error.message);
    }
    console.log('');

    console.log('═'.repeat(60));
    console.log('🎉 代理连接测试完成！');
    console.log('');
    console.log('✨ 如果所有测试都通过，说明代理配置正确。');
    console.log('');
    console.log('📊 下一步操作:');
    console.log('  1. npm run stat-arb:find-pairs    # 分析相关性，寻找配对');
    console.log('  2. npm run stat-arb:backtest      # 运行历史回测');
    console.log('  3. npm run stat-arb               # 实盘运行（谨慎）');
    console.log('');
    console.log('💡 提示: 配对交易是市场中性策略，不依赖涨跌方向');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ 测试失败:', error.message);
    console.error('');
    console.error('🔍 可能的原因:');
    console.error('1. 代理服务器未启动');
    console.error('2. 代理服务器地址错误');
    console.error('3. 防火墙阻止了连接');
    console.error('4. 代理服务器没有正确转发请求');
    console.error('');
    console.error('🛠️  排查步骤:');
    console.error('1. 在服务器上检查代理是否运行:');
    console.error(`   ssh root@image.h4yx.com "pm2 status"`);
    console.error('');
    console.error('2. 测试代理健康检查:');
    console.error(`   curl ${PROXY_URL}/health`);
    console.error('');
    console.error('3. 测试代理转发:');
    console.error(`   curl ${PROXY_URL}/api/v3/time`);
    console.error('');
    console.error('4. 查看代理服务器日志:');
    console.error('   ssh root@image.h4yx.com "pm2 logs binance-proxy --lines 50"');
    console.error('');
  }
}

testConnection().catch(error => {
  console.error('❌ 测试脚本错误:', error);
  process.exit(1);
});

