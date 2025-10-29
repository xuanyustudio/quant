/**
 * 测试交易所连接脚本
 * 用于验证 API 密钥配置是否正确
 */

import dotenv from 'dotenv';
import ccxt from 'ccxt';
import { logger } from '../utils/logger.js';

dotenv.config();

const exchanges = [
  {
    name: 'Binance',
    id: 'binance',
    apiKey: process.env.BINANCE_API_KEY,
    secret: process.env.BINANCE_SECRET
  },
  {
    name: 'OKX',
    id: 'okx',
    apiKey: process.env.OKX_API_KEY,
    secret: process.env.OKX_SECRET,
    password: process.env.OKX_PASSWORD
  },
  {
    name: 'Huobi',
    id: 'huobi',
    apiKey: process.env.HUOBI_API_KEY,
    secret: process.env.HUOBI_SECRET
  },
  {
    name: 'Gate.io',
    id: 'gate',
    apiKey: process.env.GATE_API_KEY,
    secret: process.env.GATE_SECRET
  }
];

async function testExchange(config) {
  console.log(`\n测试 ${config.name}...`);
  
  if (!config.apiKey || !config.secret) {
    console.log(`⏭️  未配置 API 密钥，跳过`);
    return;
  }

  try {
    const ExchangeClass = ccxt[config.id];
    const exchange = new ExchangeClass({
      apiKey: config.apiKey,
      secret: config.secret,
      password: config.password,
      enableRateLimit: true
    });

    // 测试1: 加载市场数据
    console.log('  📊 加载市场数据...');
    await exchange.loadMarkets();
    console.log(`  ✅ 市场数据加载成功，共 ${Object.keys(exchange.markets).length} 个交易对`);

    // 测试2: 获取价格
    console.log('  💰 获取 BTC/USDT 价格...');
    const ticker = await exchange.fetchTicker('BTC/USDT');
    console.log(`  ✅ 当前价格: ${ticker.last} USDT`);

    // 测试3: 获取账户余额（需要API权限）
    console.log('  💼 获取账户余额...');
    const balance = await exchange.fetchBalance();
    console.log(`  ✅ 账户余额获取成功`);
    
    // 显示非零余额
    const nonZeroBalances = Object.entries(balance.total)
      .filter(([currency, amount]) => amount > 0)
      .slice(0, 5); // 只显示前5个
    
    if (nonZeroBalances.length > 0) {
      console.log('  📈 部分持仓:');
      nonZeroBalances.forEach(([currency, amount]) => {
        console.log(`     ${currency}: ${amount}`);
      });
    }

    console.log(`✅ ${config.name} 连接测试成功！\n`);

  } catch (error) {
    console.error(`❌ ${config.name} 连接失败:`, error.message);
  }
}

async function main() {
  console.log('🔧 开始测试交易所连接...\n');
  console.log('═'.repeat(50));

  for (const exchange of exchanges) {
    await testExchange(exchange);
  }

  console.log('═'.repeat(50));
  console.log('\n✨ 测试完成！\n');
}

main().catch(error => {
  console.error('测试失败:', error);
  process.exit(1);
});

