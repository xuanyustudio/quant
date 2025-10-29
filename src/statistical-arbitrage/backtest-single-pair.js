/**
 * 单币对回测脚本
 * 用于快速回测指定币对在特定时间段的表现
 * 
 * 使用方法:
 * npm run stat-arb:backtest-pair -- --symbol1=ADA/USDT --symbol2=DOT/USDT --start=2025-09-01 --end=2025-09-30
 * 
 * 合约策略回测:
 * npm run stat-arb:backtest-pair -- --symbol1=BTC/USDT --symbol2=ETH/USDT --start=2025-09-01 --end=2025-09-30 --strategy=futures
 */

import { StatisticalArbitrageEngine } from './index.js';
import config from './config.js';
import { logger } from '../utils/logger.js';

/**
 * 解析命令行参数
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const params = {};
  
  args.forEach(arg => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.substring(2).split('=');
      params[key] = value;
    }
  });
  
  return params;
}

/**
 * 验证参数
 */
function validateParams(params) {
  const required = ['symbol1', 'symbol2', 'start', 'end'];
  const missing = required.filter(key => !params[key]);
  
  if (missing.length > 0) {
    logger.error(`❌ 缺少必需参数: ${missing.join(', ')}`);
    logger.info('');
    logger.info('使用方法:');
    logger.info('');
    logger.info('现货策略回测:');
    logger.info('  npm run stat-arb:backtest-pair -- --symbol1=ADA/USDT --symbol2=DOT/USDT --start=2025-09-01 --end=2025-09-30');
    logger.info('');
    logger.info('合约策略回测:');
    logger.info('  npm run stat-arb:backtest-pair -- --symbol1=BTC/USDT --symbol2=ETH/USDT --start=2025-09-01 --end=2025-09-30 --strategy=futures');
    logger.info('');
    logger.info('参数说明:');
    logger.info('  --symbol1    第一个交易对 (必需)');
    logger.info('  --symbol2    第二个交易对 (必需)');
    logger.info('  --start      开始日期 YYYY-MM-DD (必需)');
    logger.info('  --end        结束日期 YYYY-MM-DD (必需)');
    logger.info('  --strategy   策略类型: spot(现货) 或 futures(合约) (可选，默认spot)');
    logger.info('  --leverage   杠杆倍数 (可选，仅合约策略，默认1)');
    process.exit(1);
  }
  
  // 验证日期格式
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(params.start) || !dateRegex.test(params.end)) {
    logger.error('❌ 日期格式错误，应为 YYYY-MM-DD');
    process.exit(1);
  }
  
  // 验证策略类型
  if (params.strategy && !['spot', 'futures'].includes(params.strategy)) {
    logger.error('❌ 策略类型错误，应为 spot 或 futures');
    process.exit(1);
  }
  
  return true;
}

/**
 * 主函数
 */
async function main() {
  try {
    logger.info('');
    logger.info('════════════════════════════════════════════════════════════');
    logger.info('🔍 单币对回测系统');
    logger.info('════════════════════════════════════════════════════════════');
    logger.info('');
    
    // 解析参数
    const params = parseArgs();
    
    // 验证参数
    validateParams(params);
    
    const { symbol1, symbol2, start, end, strategy = 'spot', leverage = '1' } = params;
    
    logger.info(`📊 回测配置:`);
    logger.info(`   币对1: ${symbol1}`);
    logger.info(`   币对2: ${symbol2}`);
    logger.info(`   开始日期: ${start}`);
    logger.info(`   结束日期: ${end}`);
    
    // ⭐ 显示策略类型
    if (strategy === 'futures') {
      logger.info(`   策略类型: 🔮 合约策略`);
      logger.info(`   杠杆倍数: ${leverage}x`);
      logger.info(`   做空方式: 永续合约真正做空 ✅`);
    } else {
      logger.info(`   策略类型: 💵 现货策略`);
      logger.info(`   做空方式: 卖出现货 ⚠️`);
    }
    logger.info('');
    
    // 创建配置副本并设置日期
    const backtestConfig = JSON.parse(JSON.stringify(config)); // 深拷贝
    backtestConfig.strategy.backtestStartDate = start;
    backtestConfig.strategy.backtestEndDate = end;
    
    // ⭐ 设置策略类型
    backtestConfig.strategy.strategyType = strategy;
    
    // ⭐ 如果是合约策略，设置合约相关参数
    if (strategy === 'futures') {
      backtestConfig.strategy.useContractForShort = true;
      backtestConfig.strategy.leverage = parseInt(leverage);
      backtestConfig.strategy.marginType = 'cross';
    }
    
    // 初始化引擎
    logger.info('🚀 初始化回测引擎...');
    const engine = new StatisticalArbitrageEngine(backtestConfig.exchange, backtestConfig.strategy);
    await engine.initialize();
    logger.info('✅ 初始化完成');
    logger.info('');
    
    // 执行单对回测
    logger.info('════════════════════════════════════════════════════════════');
    logger.info('📈 开始回测...');
    logger.info('════════════════════════════════════════════════════════════');
    logger.info('');
    
    const result = await engine.backtestSinglePair(symbol1, symbol2);
    
    if (!result) {
      logger.error('❌ 回测失败');
      process.exit(1);
    }
    
    logger.info('');
    logger.info('════════════════════════════════════════════════════════════');
    logger.info('✅ 回测完成');
    logger.info('════════════════════════════════════════════════════════════');
    logger.info('');
    logger.info('📊 回测结果摘要:');
    logger.info(`   收益率: ${(result.returnRate || 0).toFixed(2)}%`);
    logger.info(`   胜率: ${(result.winRate || 0).toFixed(1)}%`);
    logger.info(`   夏普比率: ${(result.sharpeRatio || 0).toFixed(2)}`);
    logger.info(`   最大回撤: ${(result.maxDrawdown || 0).toFixed(2)}%`);
    logger.info(`   交易次数: ${result.totalTrades || 0}`);
    logger.info(`   相关系数: ${(result.correlation || 0).toFixed(3)}`);
    logger.info('');
    logger.info(`📄 详细报告: ${result.reportFilename || '未生成'}`);
    logger.info('');
    
  } catch (error) {
    logger.error('❌ 回测过程中发生错误:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// 运行主函数
main();

