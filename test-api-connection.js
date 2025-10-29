/**
 * 测试币安API连接
 */

import ccxt from 'ccxt';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

async function testConnection() {
  console.log('🔍 测试币安API连接...\n');
  
  // 检查环境变量
  if (!process.env.BINANCE_API_KEY || !process.env.BINANCE_SECRET) {
    console.error('❌ 未找到API密钥！请检查 .env 文件');
    return;
  }
  
  console.log('✅ API密钥已配置');
  
  const useProxy = process.env.USE_PROXY !== 'false';
  if (!useProxy) {
    console.log('🌐 直连模式（不使用代理）');
  } else if (process.env.HTTPS_PROXY) {
    console.log(`✅ 代理已配置: ${process.env.HTTPS_PROXY}`);
  } else {
    console.log('⚠️  USE_PROXY=true 但未配置代理地址（国内用户需要）');
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    // 创建交易所实例
    const exchangeConfig = {
      apiKey: process.env.BINANCE_API_KEY,
      secret: process.env.BINANCE_SECRET,
      timeout: 30000,
      options: {
        defaultType: 'spot',
        adjustForTimeDifference: true
      }
    };
    
    // 根据 USE_PROXY 决定是否添加代理
    if (useProxy && process.env.HTTPS_PROXY) {
      exchangeConfig.httpsProxy = process.env.HTTPS_PROXY;
    }
    
    const exchange = new ccxt.binance(exchangeConfig);
    
    console.log('第1步: 测试公开API（不需要密钥）...');
    const serverTime = await exchange.fetchTime();
    console.log(`✅ 服务器时间: ${new Date(serverTime).toLocaleString('zh-CN')}`);
    
    console.log('\n第2步: 加载市场数据...');
    await exchange.loadMarkets();
    console.log(`✅ 成功加载 ${Object.keys(exchange.markets).length} 个交易对`);
    
    console.log('\n第3步: 测试认证API（需要密钥）...');
    const balance = await exchange.fetchBalance();
    console.log(`✅ 账户余额查询成功`);
    console.log(`   总资产（USDT等值）: ${balance.total.USDT || 0} USDT`);
    
    // 显示主要币种余额
    console.log('\n主要币种余额:');
    const mainCoins = ['USDT', 'BTC', 'ETH', 'BNB'];
    mainCoins.forEach(coin => {
      if (balance.total[coin] && balance.total[coin] > 0) {
        console.log(`   ${coin}: ${balance.total[coin]}`);
      }
    });
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 所有测试通过！可以开始交易！');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
  } catch (error) {
    console.error('\n❌ 连接失败！');
    console.error('\n错误信息:', error.message);
    
    console.error('\n可能的原因:');
    if (error.message.includes('fetch failed')) {
      console.error('  1. ❌ 代理未启动或配置错误');
      console.error('  2. ❌ 网络连接问题');
      console.error('  3. ❌ 防火墙阻止连接');
      console.error('\n解决方案:');
      console.error('  - 确认代理软件正在运行');
      console.error('  - 检查代理端口是否正确（7897）');
      console.error('  - 尝试在浏览器访问: https://www.binance.com');
    } else if (error.message.includes('API-key')) {
      console.error('  1. ❌ API密钥无效');
      console.error('  2. ❌ API密钥权限不足');
      console.error('\n解决方案:');
      console.error('  - 检查 .env 文件中的密钥是否正确');
      console.error('  - 确认API启用了现货交易权限');
    } else {
      console.error('  未知错误，请检查网络和配置');
    }
    
    console.error('\n');
    throw error;
  }
}

// 运行测试
testConnection();

