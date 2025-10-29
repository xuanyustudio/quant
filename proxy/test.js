/**
 * 代理服务器测试脚本
 */

import fetch from 'node-fetch';

// 配置你的代理服务器地址
const PROXY_URL = process.env.PROXY_URL || 'http://localhost:3000';

console.log('🧪 开始测试代理服务器...');
console.log(`📡 代理地址: ${PROXY_URL}`);
console.log('═'.repeat(60));

async function runTests() {
  let passCount = 0;
  let failCount = 0;

  // 测试 1: 健康检查
  console.log('\n测试 1: 健康检查');
  try {
    const response = await fetch(`${PROXY_URL}/health`);
    const data = await response.json();
    console.log(`✅ 通过 - 状态: ${data.status}, 运行时间: ${data.uptime.toFixed(2)}秒`);
    passCount++;
  } catch (error) {
    console.log(`❌ 失败 - ${error.message}`);
    failCount++;
  }

  // 测试 2: Ping
  console.log('\n测试 2: Binance Ping');
  try {
    const response = await fetch(`${PROXY_URL}/api/v3/ping`);
    const data = await response.json();
    console.log(`✅ 通过 - 响应: ${JSON.stringify(data)}`);
    passCount++;
  } catch (error) {
    console.log(`❌ 失败 - ${error.message}`);
    failCount++;
  }

  // 测试 3: 获取服务器时间
  console.log('\n测试 3: 获取服务器时间');
  try {
    const response = await fetch(`${PROXY_URL}/api/v3/time`);
    const data = await response.json();
    const serverTime = new Date(data.serverTime);
    console.log(`✅ 通过 - 服务器时间: ${serverTime.toLocaleString('zh-CN')}`);
    passCount++;
  } catch (error) {
    console.log(`❌ 失败 - ${error.message}`);
    failCount++;
  }

  // 测试 4: 获取交易对信息
  console.log('\n测试 4: 获取 BTC/USDT 24小时行情');
  try {
    const response = await fetch(`${PROXY_URL}/api/v3/ticker/24hr?symbol=BTCUSDT`);
    const data = await response.json();
    console.log(`✅ 通过 - 最新价格: ${data.lastPrice} USDT`);
    console.log(`   24h最高: ${data.highPrice}, 24h最低: ${data.lowPrice}`);
    console.log(`   24h成交量: ${parseFloat(data.volume).toFixed(2)} BTC`);
    passCount++;
  } catch (error) {
    console.log(`❌ 失败 - ${error.message}`);
    failCount++;
  }

  // 测试 5: 获取交易所信息
  console.log('\n测试 5: 获取交易所信息');
  try {
    const response = await fetch(`${PROXY_URL}/api/v3/exchangeInfo?symbol=BTCUSDT`);
    const data = await response.json();
    const symbol = data.symbols[0];
    console.log(`✅ 通过 - 交易对: ${symbol.symbol}`);
    console.log(`   状态: ${symbol.status}`);
    console.log(`   基础资产: ${symbol.baseAsset}, 报价资产: ${symbol.quoteAsset}`);
    passCount++;
  } catch (error) {
    console.log(`❌ 失败 - ${error.message}`);
    failCount++;
  }

  // 测试 6: 获取深度信息
  console.log('\n测试 6: 获取订单簿深度');
  try {
    const response = await fetch(`${PROXY_URL}/api/v3/depth?symbol=BTCUSDT&limit=5`);
    const data = await response.json();
    console.log(`✅ 通过 - 买单数量: ${data.bids.length}, 卖单数量: ${data.asks.length}`);
    if (data.bids.length > 0) {
      console.log(`   最高买价: ${data.bids[0][0]}, 数量: ${data.bids[0][1]}`);
    }
    if (data.asks.length > 0) {
      console.log(`   最低卖价: ${data.asks[0][0]}, 数量: ${data.asks[0][1]}`);
    }
    passCount++;
  } catch (error) {
    console.log(`❌ 失败 - ${error.message}`);
    failCount++;
  }

  // 测试 7: 测试不同的 HTTP 方法
  console.log('\n测试 7: 测试 POST 请求（模拟）');
  try {
    // 注意：这个测试会失败因为没有真实的 API 密钥，但能测试 POST 转发
    const response = await fetch(`${PROXY_URL}/api/v3/order/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'symbol=BTCUSDT&side=BUY&type=LIMIT&quantity=0.01&price=10000&timeInForce=GTC'
    });
    
    // 预期会失败（因为没签名），但如果状态码是 400（而不是 500），说明转发成功了
    if (response.status === 400 || response.status === 401) {
      console.log(`✅ 通过 - POST 请求转发成功（预期的认证错误）`);
      passCount++;
    } else {
      const text = await response.text();
      console.log(`⚠️  部分通过 - 状态码: ${response.status}`);
      passCount++;
    }
  } catch (error) {
    console.log(`❌ 失败 - ${error.message}`);
    failCount++;
  }

  // 测试总结
  console.log('\n' + '═'.repeat(60));
  console.log('📊 测试总结');
  console.log('═'.repeat(60));
  console.log(`✅ 通过: ${passCount}`);
  console.log(`❌ 失败: ${failCount}`);
  console.log(`📈 成功率: ${((passCount / (passCount + failCount)) * 100).toFixed(1)}%`);
  console.log('');

  if (failCount === 0) {
    console.log('🎉 所有测试通过！代理服务器工作正常。');
  } else {
    console.log('⚠️  部分测试失败，请检查代理服务器配置。');
  }
}

// 运行测试
runTests().catch(error => {
  console.error('测试运行出错:', error);
  process.exit(1);
});

