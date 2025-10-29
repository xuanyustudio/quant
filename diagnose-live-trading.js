/**
 * 实盘交易诊断工具
 * 检查API连接、IP、配置等问题
 */

import ccxt from 'ccxt';
import dotenv from 'dotenv';
import https from 'https';

dotenv.config();

console.log('🔍 实盘交易系统诊断工具');
console.log('═'.repeat(70));
console.log('');

// 1. 检查环境变量
console.log('1️⃣  检查环境变量配置...');
console.log('');

const checks = {
  BINANCE_API_KEY: !!process.env.BINANCE_API_KEY,
  BINANCE_API_SECRET: !!process.env.BINANCE_SECRET,
  USE_PROXY: process.env.USE_PROXY,
  HTTPS_PROXY: process.env.HTTPS_PROXY
};

for (const [key, value] of Object.entries(checks)) {
  if (key === 'USE_PROXY' || key === 'HTTPS_PROXY') {
    console.log(`   ${key}: ${value || '未设置'}`);
  } else {
    console.log(`   ${key}: ${value ? '✅ 已配置' : '❌ 未配置'}`);
  }
}

if (!checks.BINANCE_API_KEY || !checks.BINANCE_API_SECRET) {
  console.log('');
  console.log('❌ API密钥未配置，请检查 .env 文件');
  process.exit(1);
}

console.log('');

// 2. 查询服务器IP
console.log('2️⃣  查询服务器公网IP...');
console.log('');

try {
  const ip = await new Promise((resolve, reject) => {
    https.get('https://api.ipify.org?format=json', (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.ip);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
  
  console.log(`   🌐 服务器IP: ${ip}`);
  console.log('');
  console.log('   💡 请确保此IP已添加到币安API白名单');
  console.log('   或在币安API设置中选择"不限制IP"');
  console.log('');
} catch (error) {
  console.log(`   ⚠️  无法查询IP: ${error.message}`);
  console.log('   手动查询: curl ifconfig.me');
  console.log('');
}

// 3. 测试币安API连接
console.log('3️⃣  测试币安API连接...');
console.log('');

const exchangeConfig = {
  apiKey: process.env.BINANCE_API_KEY,
  secret: process.env.BINANCE_SECRET,
  enableRateLimit: true,
  timeout: 30000,
  options: {
    defaultType: 'spot'
  }
};

// 代理配置
const useProxy = process.env.USE_PROXY !== 'false';
if (useProxy && process.env.HTTPS_PROXY) {
  exchangeConfig.httpsProxy = process.env.HTTPS_PROXY;
  console.log(`   🔗 使用代理: ${process.env.HTTPS_PROXY}`);
} else if (!useProxy) {
  console.log(`   🌐 直连模式（不使用代理）`);
} else {
  console.log(`   ⚠️  USE_PROXY=true 但未配置代理地址`);
}
console.log('');

const exchange = new ccxt.binance(exchangeConfig);

try {
  console.log('   测试1: 获取账户信息...');
  const balance = await exchange.fetchBalance();
  console.log('   ✅ 账户信息获取成功');
  console.log(`   💰 USDT余额: ${balance.USDT?.free || 0} USDT`);
  console.log('');
  
} catch (error) {
  console.log('   ❌ 账户信息获取失败');
  console.log(`   错误: ${error.message}`);
  console.log('');
  
  if (error.message.includes('Invalid API-key') || error.message.includes('permission')) {
    console.log('   🔧 可能的原因:');
    console.log('   1. API密钥错误');
    console.log('   2. 服务器IP不在白名单中');
    console.log('   3. API权限不足');
    console.log('');
    console.log('   解决方法:');
    console.log('   1. 登录币安 → API管理');
    console.log('   2. 编辑API → IP访问限制');
    console.log('   3. 添加服务器IP或选择"不限制"');
    console.log('   4. 确保开启"读取"和"现货交易"权限');
    console.log('');
  }
  
  // 不要退出，继续测试
}

try {
  console.log('   测试2: 获取ID/USDT K线数据...');
  const ohlcv = await exchange.fetchOHLCV('ID/USDT', '15m', undefined, 10);
  console.log(`   ✅ K线数据获取成功 (${ohlcv.length} 条)`);
  const lastPrice = ohlcv[ohlcv.length - 1][4];
  console.log(`   💰 ID/USDT 当前价格: $${lastPrice}`);
  console.log('');
  
} catch (error) {
  console.log('   ❌ K线数据获取失败');
  console.log(`   错误: ${error.message}`);
  console.log('');
  
  if (error.message.includes('Invalid API-key') || error.message.includes('permission')) {
    console.log('   🔧 IP白名单问题！');
    console.log('   这是最常见的错误原因');
    console.log('');
  }
}

try {
  console.log('   测试3: 获取MINA/USDT K线数据...');
  const ohlcv = await exchange.fetchOHLCV('MINA/USDT', '15m', undefined, 10);
  console.log(`   ✅ K线数据获取成功 (${ohlcv.length} 条)`);
  const lastPrice = ohlcv[ohlcv.length - 1][4];
  console.log(`   💰 MINA/USDT 当前价格: $${lastPrice}`);
  console.log('');
  
} catch (error) {
  console.log('   ❌ K线数据获取失败');
  console.log(`   错误: ${error.message}`);
  console.log('');
}

// 4. 检查配置文件
console.log('4️⃣  检查实盘配置文件...');
console.log('');

import fs from 'fs';
import path from 'path';

try {
  const configFiles = fs.readdirSync('./output')
    .filter(f => f.startsWith('live_trading_config_') && f.endsWith('.json'))
    .sort()
    .reverse();
  
  if (configFiles.length === 0) {
    console.log('   ⚠️  未找到实盘配置文件');
    console.log('   请先运行: npm run stat-arb:portfolio');
    console.log('');
  } else {
    const latestConfig = configFiles[0];
    console.log(`   ✅ 找到配置文件: ${latestConfig}`);
    
    const configPath = path.join('./output', latestConfig);
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    
    console.log(`   交易对数量: ${config.pairs.length}`);
    console.log(`   活跃资金: $${config.funds.active}`);
    console.log('');
    
    console.log('   交易对列表:');
    config.pairs.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.symbols[0]} / ${p.symbols[1]} (资金: $${p.tradeAmount})`);
    });
    console.log('');
  }
} catch (error) {
  console.log(`   ⚠️  读取配置文件失败: ${error.message}`);
  console.log('');
}

// 5. 检查PM2状态
console.log('5️⃣  检查PM2进程状态...');
console.log('');

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

try {
  const { stdout } = await execAsync('pm2 jlist');
  const processes = JSON.parse(stdout);
  const statArb = processes.find(p => p.name === 'stat-arb');
  
  if (statArb) {
    console.log(`   ✅ PM2进程运行中`);
    console.log(`   状态: ${statArb.pm2_env.status}`);
    console.log(`   运行时间: ${Math.floor((Date.now() - statArb.pm2_env.pm_uptime) / 1000 / 60)} 分钟`);
    console.log(`   重启次数: ${statArb.pm2_env.restart_time}`);
    console.log('');
    
    if (statArb.pm2_env.restart_time > 5) {
      console.log('   ⚠️  重启次数较多，可能存在问题');
      console.log('   查看错误日志: pm2 logs stat-arb --err');
      console.log('');
    }
  } else {
    console.log('   ⚠️  未找到PM2进程');
    console.log('   启动进程: pm2 start ecosystem.config.cjs');
    console.log('');
  }
} catch (error) {
  console.log(`   ⚠️  无法获取PM2状态: ${error.message}`);
  console.log('   可能PM2未安装或未运行');
  console.log('');
}

// 总结
console.log('═'.repeat(70));
console.log('📊 诊断完成');
console.log('═'.repeat(70));
console.log('');
console.log('💡 下一步:');
console.log('   1. 如果API测试失败，解决IP白名单问题');
console.log('   2. 如果一切正常，运行: pm2 restart stat-arb');
console.log('   3. 查看实时日志: pm2 logs stat-arb');
console.log('');

