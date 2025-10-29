/**
 * 测试代理连接脚本 v2 - 正确配置proxy参数
 */

import dotenv from 'dotenv';
import ccxt from 'ccxt';

dotenv.config();

const PROXY_URL = 'http://image.h4yx.com:3000';

async function testConnection() {
  console.log('🧪 测试币安代理连接 (v2)...');
  console.log(`📡 代理地址: ${PROXY_URL}`);
  console.log('═'.repeat(60));
  console.log('');

  try {
    // 创建币安实例 - 正确配置proxy
    const exchange = new ccxt.binance({
      enableRateLimit: true,
      timeout: 15000,
      proxy: PROXY_URL,  // ← 关键：使用 proxy 参数
      options: {
        adjustForTimeDifference: true,
        urls: {
          api: PROXY_URL  // 同时配置 urls
        }
      }
    });

    console.log('配置信息:');
    console.log(`- Proxy: ${exchange.proxy}`);
    console.log(`- API URL: ${exchange.urls?.api}`);
    console.log('');

    // 测试1: Ping（直接HTTP请求）
    console.log('测试 1: Ping (直接HTTP)...');
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

    // 测试2: 获取服务器时间（通过CCXT）
    console.log('测试 2: 获取服务器时间 (CCXT)...');
    try {
      const time = await exchange.fetchTime();
      console.log('✅ 服务器时间:', new Date(time).toLocaleString('zh-CN'));
      console.log('   时间戳:', time);
    } catch (error) {
      console.log('❌ 获取时间失败:', error.message);
      if (error.message.includes('timed out')) {
        console.log('   提示: 可能是代理服务器响应慢或未正确转发');
      }
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
      const popularPairs = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT'];
      console.log('   热门交易对:');
      popularPairs.forEach(pair => {
        if (exchange.markets[pair]) {
          console.log(`   - ${pair} ✓`);
        }
      });
    } catch (error) {
      console.log('❌ 加载市场失败:', error.message);
    }
    console.log('');

    // 测试4: 获取BTC价格
    console.log('测试 4: 获取 BTC/USDT 价格...');
    try {
      const ticker = await exchange.fetchTicker('BTC/USDT');
      console.log('✅ BTC/USDT 当前价格:', ticker.last, 'USDT');
      console.log(`   买价: ${ticker.bid} | 卖价: ${ticker.ask}`);
      console.log(`   24h 高: ${ticker.high} | 低: ${ticker.low}`);
      console.log(`   24h 成交量: ${ticker.baseVolume.toFixed(2)} BTC`);
    } catch (error) {
      console.log('❌ 获取价格失败:', error.message);
    }
    console.log('');

    // 测试5: 获取历史K线
    console.log('测试 5: 获取历史K线数据 (1小时，最近10条)...');
    try {
      const ohlcv = await exchange.fetchOHLCV('BTC/USDT', '1h', undefined, 10);
      console.log(`✅ 获取K线成功，共 ${ohlcv.length} 条数据`);
      
      // 显示最新3条
      console.log('   最新3条K线:');
      ohlcv.slice(-3).forEach((candle, index) => {
        const time = new Date(candle[0]).toLocaleString('zh-CN', { 
          month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' 
        });
        console.log(`   ${index + 1}. ${time} | 开: ${candle[1]} | 收: ${candle[4]}`);
      });
    } catch (error) {
      console.log('❌ 获取K线失败:', error.message);
    }
    console.log('');

    console.log('═'.repeat(60));
    console.log('✅ 代理连接测试完成！');
    console.log('');
    console.log('✨ 如果所有测试都通过，说明代理配置正确。');
    console.log('');
    console.log('📊 现在可以运行统计套利系统了：');
    console.log('  npm run stat-arb:find-pairs    # 寻找配对');
    console.log('  npm run stat-arb:backtest      # 运行回测');
    console.log('  npm run stat-arb               # 实盘运行');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ 测试失败:', error.message);
    console.error('');
    console.error('🔍 可能的原因:');
    console.error('1. 代理服务器未启动或无法访问');
    console.error('2. 代理地址配置错误');
    console.error('3. 防火墙阻止了连接');
    console.error('4. 网络连接问题');
    console.error('');
    console.error('🛠️  排查步骤:');
    console.error(`1. 测试代理是否可访问: curl ${PROXY_URL}/health`);
    console.error(`2. 测试币安API: curl ${PROXY_URL}/api/v3/ping`);
    console.error('3. 检查代理服务器日志');
    console.error('4. 确认防火墙开放 3000 端口');
    console.error('');
  }
}

testConnection().catch(error => {
  console.error('❌ 测试脚本错误:', error);
  process.exit(1);
});

