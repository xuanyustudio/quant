/**
 * 测试代理连接脚本
 */

import dotenv from 'dotenv';
import ccxt from 'ccxt';

dotenv.config();

const PROXY_URL = 'http://image.h4yx.com:3000';

async function testConnection() {
  console.log('🧪 测试币安代理连接...');
  console.log(`📡 代理地址: ${PROXY_URL}`);
  console.log('═'.repeat(60));
  console.log('');

  try {
    // 创建币安实例（通过代理）
    const exchange = new ccxt.binance({
      enableRateLimit: true,
      timeout: 10000,
      options: {
        adjustForTimeDifference: true,
        urls: {
          api: PROXY_URL
        }
      }
    });

    // 测试1: Ping
    console.log('测试 1: Ping...');
    try {
      const response = await fetch(`${PROXY_URL}/api/v3/ping`);
      const data = await response.json();
      console.log('✅ Ping 成功:', data);
    } catch (error) {
      console.log('❌ Ping 失败:', error.message);
    }
    console.log('');

    // 测试2: 获取服务器时间
    console.log('测试 2: 获取服务器时间...');
    try {
      const time = await exchange.fetchTime();
      console.log('✅ 服务器时间:', new Date(time).toLocaleString('zh-CN'));
    } catch (error) {
      console.log('❌ 获取时间失败:', error.message);
    }
    console.log('');

    // 测试3: 加载市场数据
    console.log('测试 3: 加载市场数据...');
    try {
      await exchange.loadMarkets();
      const marketCount = Object.keys(exchange.markets).length;
      console.log(`✅ 市场数据加载成功，共 ${marketCount} 个交易对`);
    } catch (error) {
      console.log('❌ 加载市场失败:', error.message);
    }
    console.log('');

    // 测试4: 获取BTC价格
    console.log('测试 4: 获取 BTC/USDT 价格...');
    try {
      const ticker = await exchange.fetchTicker('BTC/USDT');
      console.log('✅ BTC/USDT 当前价格:', ticker.last, 'USDT');
      console.log('   买价:', ticker.bid);
      console.log('   卖价:', ticker.ask);
    } catch (error) {
      console.log('❌ 获取价格失败:', error.message);
    }
    console.log('');

    // 测试5: 获取历史K线
    console.log('测试 5: 获取历史K线数据...');
    try {
      const ohlcv = await exchange.fetchOHLCV('BTC/USDT', '1h', undefined, 5);
      console.log(`✅ 获取K线成功，共 ${ohlcv.length} 条数据`);
      console.log('   最新K线:');
      const latest = ohlcv[ohlcv.length - 1];
      console.log(`   时间: ${new Date(latest[0]).toLocaleString('zh-CN')}`);
      console.log(`   开盘: ${latest[1]}, 收盘: ${latest[4]}`);
    } catch (error) {
      console.log('❌ 获取K线失败:', error.message);
    }
    console.log('');

    console.log('═'.repeat(60));
    console.log('🎉 代理连接测试完成！');
    console.log('');
    console.log('如果所有测试都通过，说明代理配置正确。');
    console.log('现在可以运行统计套利系统了：');
    console.log('  npm run stat-arb:find-pairs');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ 测试失败:', error.message);
    console.error('');
    console.error('可能的原因:');
    console.error('1. 代理服务器未启动或无法访问');
    console.error('2. 代理地址配置错误');
    console.error('3. 网络连接问题');
    console.error('');
    console.error('请检查:');
    console.error(`- 代理服务器是否在运行: ${PROXY_URL}`);
    console.error('- 防火墙是否开放 3000 端口');
    console.error('- 网络连接是否正常');
    console.error('');
  }
}

testConnection().catch(error => {
  console.error('测试脚本错误:', error);
  process.exit(1);
});

