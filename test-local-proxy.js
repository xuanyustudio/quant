/**
 * 测试本地代理服务器
 */

import ccxt from 'ccxt';

async function testLocalProxy() {
  console.log('🧪 测试本地 CONNECT 代理...');
  console.log('═'.repeat(60));
  console.log('');

  // 测试1: 不使用代理
  console.log('测试 1: 直接访问币安（不使用代理）...');
  try {
    const exchange1 = new ccxt.binance({
      enableRateLimit: true,
      timeout: 10000
    });
    const time1 = await exchange1.fetchTime();
    console.log('✅ 直接访问成功:', new Date(time1).toLocaleString('zh-CN'));
  } catch (error) {
    console.log('❌ 直接访问失败:', error.message);
    console.log('   这是正常的（国内无法直接访问币安）');
  }
  console.log('');

  // 测试2: 使用本地代理 (localhost)
  console.log('测试 2: 通过本地代理访问（localhost:7897...');
  try {
    const exchange2 = new ccxt.binance({
      httpsProxy: 'http://localhost:7897',
      enableRateLimit: true,
      timeout: 15000
    });
    const time2 = await exchange2.fetchTime();
    console.log('✅ 代理访问成功:', new Date(time2).toLocaleString('zh-CN'));
    console.log('   💡 本地代理工作正常！');
  } catch (error) {
    console.log('❌ 代理访问失败:', error.message);
    console.log('');
    console.log('可能的原因:');
    console.log('1. 本地代理服务器未启动');
    console.log('2. 代理服务器端口不是 3000');
    console.log('3. 代理服务器配置错误');
    console.log('');
    console.log('解决方法:');
    console.log('1. 在另一个终端运行: cd proxy && node server.js');
    console.log('2. 等待看到 "🚀 币安 API 代理服务器已启动" 消息');
    console.log('3. 然后重新运行此测试');
  }
  console.log('');

  // 测试3: 使用远程代理
  console.log('测试 3: 通过远程代理访问（image.h4yx.com:3000）...');
  try {
    const exchange3 = new ccxt.binance({
      httpsProxy: 'http://image.h4yx.com:3000',
      enableRateLimit: true,
      timeout: 15000
    });
    const time3 = await exchange3.fetchTime();
    console.log('✅ 远程代理访问成功:', new Date(time3).toLocaleString('zh-CN'));
    console.log('   💡 远程代理工作正常！可以运行统计套利了');
  } catch (error) {
    console.log('❌ 远程代理访问失败:', error.message);
    console.log('');
    console.log('可能的原因:');
    console.log('1. 服务器上的代理未更新到新版本');
    console.log('2. 服务器上的代理未运行');
    console.log('3. 防火墙阻止连接');
    console.log('');
    console.log('解决方法:');
    console.log('1. SSH 到服务器: ssh root@image.h4yx.com');
    console.log('2. 上传新版本: scp proxy/server.js root@image.h4yx.com:/opt/proxy/');
    console.log('3. 重启代理: pm2 restart binance-proxy');
    console.log('   或: cd /opt/proxy && node server.js');
  }
  console.log('');

  console.log('═'.repeat(60));
  console.log('');
}

testLocalProxy().catch(error => {
  console.error('测试错误:', error);
});

