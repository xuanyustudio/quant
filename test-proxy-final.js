/**
 * 最终测试 - 使用 httpsProxy 参数
 */

import dotenv from 'dotenv';
import ccxt from 'ccxt';

dotenv.config();

const PROXY_URL = 'http://image.h4yx.com:3000';

async function testConnection() {
  console.log('🧪 测试币安代理连接 (最终版)...');
  console.log(`📡 代理地址: ${PROXY_URL}`);
  console.log('═'.repeat(60));
  console.log('');

  try {
    // 使用 httpsProxy 参数
    const exchange = new ccxt.binance({
      enableRateLimit: true,
      timeout: 15000,
      httpsProxy: PROXY_URL,
      httpProxy: PROXY_URL,
      options: {
        adjustForTimeDifference: true,
        defaultType: 'spot'
      }
    });

    console.log('配置信息:');
    console.log(`- HTTPS Proxy: ${exchange.httpsProxy}`);
    console.log(`- HTTP Proxy: ${exchange.httpProxy}`);
    console.log('');

    // 测试1: 获取服务器时间
    console.log('测试 1: 获取服务器时间...');
    try {
      const time = await exchange.fetchTime();
      const serverDate = new Date(time);
      console.log('✅ 服务器时间:', serverDate.toLocaleString('zh-CN'));
    } catch (error) {
      console.log('❌ 失败:', error.message);
      if (error.message.includes('Protocol')) {
        console.log('   提示: CCXT 可能不支持HTTP代理到HTTPS的转发');
        console.log('   建议: 代理服务器需要配置为HTTPS或使用其他方法');
      }
    }
    console.log('');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testConnection();

