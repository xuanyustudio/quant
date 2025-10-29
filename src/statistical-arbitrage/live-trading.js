/**
 * 实盘交易启动器
 * 直接使用 portfolio-optimizer 生成的配置文件启动实盘交易
 * 
 * 使用方法:
 * npm run stat-arb:live -- --config=./output/live_trading_config_xxx.json
 */

import { StatisticalArbitrageEngine } from './index.js';
import { logger } from '../utils/logger.js';
import fs from 'fs';
import path from 'path';

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
 * 加载实盘配置
 */
function loadLiveTradingConfig(configPath) {
  try {
    if (!fs.existsSync(configPath)) {
      throw new Error(`配置文件不存在: ${configPath}`);
    }
    
    const configData = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configData);
    
    logger.info('✅ 成功加载实盘配置');
    logger.info(`   配置文件: ${configPath}`);
    logger.info(`   生成时间: ${new Date(config.generatedAt).toLocaleString('zh-CN')}`);
    logger.info(`   总资金: $${config.totalCapital.toLocaleString()}`);
    logger.info(`   风险偏好: ${config.riskProfile}`);
    logger.info(`   交易配对数: ${config.pairs.length}`);
    logger.info('');
    
    return config;
  } catch (error) {
    logger.error('加载配置文件失败:', error.message);
    throw error;
  }
}

/**
 * 显示交易配对信息
 */
function displayTradingPairs(config) {
  logger.info('═'.repeat(70));
  logger.info('📊 交易配对列表');
  logger.info('═'.repeat(70));
  logger.info('');
  
  config.pairs.forEach((pair, index) => {
    logger.info(`【配对 ${index + 1}】${pair.symbols[0]} / ${pair.symbols[1]}`);
    logger.info(`   分配资金: $${pair.allocation.toFixed(2)}`);
    logger.info(`   单笔金额: $${pair.tradeAmount.toFixed(2)}`);
    logger.info(`   权重: ${pair.weight.toFixed(1)}%`);
    logger.info('');
  });
}

/**
 * 风险确认
 */
async function confirmRiskAwareness() {
  logger.info('');
  logger.info('⚠️'.repeat(35));
  logger.info('🚨 实盘交易风险提示');
  logger.info('⚠️'.repeat(35));
  logger.info('');
  logger.info('请确认您已了解以下风险:');
  logger.info('');
  logger.info('1. 加密货币交易存在高风险，可能损失全部本金');
  logger.info('2. 您使用的是统计套利策略，需要持续监控');
  logger.info('3. 市场条件变化可能导致策略失效');
  logger.info('4. 系统故障或网络中断可能影响交易执行');
  logger.info('5. 请确保已设置好止损和风险控制参数');
  logger.info('');
  logger.info('⚠️  建议: 先用小额资金测试 3-7 天！');
  logger.info('');
  logger.info('═'.repeat(70));
  logger.info('');
}

/**
 * 主函数
 */
async function main() {
  try {
    logger.info('');
    logger.info('═'.repeat(70));
    logger.info('🚀 统计套利实盘交易系统');
    logger.info('═'.repeat(70));
    logger.info('');
    
    // 解析参数
    const params = parseArgs();
    
    if (!params.config) {
      logger.error('❌ 缺少必需参数: --config');
      logger.info('');
      logger.info('使用方法:');
      logger.info('npm run stat-arb:live -- --config=./output/live_trading_config_xxx.json');
      logger.info('');
      logger.info('或者:');
      logger.info('node src/statistical-arbitrage/live-trading.js --config=./output/live_trading_config_xxx.json');
      logger.info('');
      process.exit(1);
    }
    
    // 加载配置
    const liveConfig = loadLiveTradingConfig(params.config);
    
    // 显示配对信息
    displayTradingPairs(liveConfig);
    
    // 风险提示
    await confirmRiskAwareness();
    
    // 检查环境变量
    if (!process.env.BINANCE_API_KEY || !process.env.BINANCE_SECRET) {
      logger.error('❌ 未检测到币安API密钥！');
      logger.error('');
      logger.error('请在项目根目录创建 .env 文件，内容如下:');
      logger.error('');
      logger.error('BINANCE_API_KEY=你的API_Key');
      logger.error('BINANCE_SECRET=你的Secret_Key');
      logger.error('HTTPS_PROXY=http://127.0.0.1:7897  # 国内用户需要');
      logger.error('');
      process.exit(1);
    }
    
    logger.info('✅ 币安API密钥已配置');
    logger.info('');
    
    // 构建策略配置
    const strategyConfig = {
      // 从实盘配置中提取参数
      initialCapital: liveConfig.funds.active,  // 使用活跃资金
      tradeAmount: liveConfig.pairs[0].tradeAmount,  // 使用第一个配对的交易金额
      maxPositions: liveConfig.riskControl.maxPositions,
      maxDrawdown: liveConfig.riskControl.maxDrawdown,
      maxDailyLoss: liveConfig.riskControl.maxDailyLoss,
      
      // 交易对列表
      tradingPairs: liveConfig.pairs.map(p => ({
        symbol1: p.symbols[0],
        symbol2: p.symbols[1],
        allocation: p.allocation,
        tradeAmount: p.tradeAmount
      })),
      
      // 启用实盘交易
      enableLiveTrading: true,
      
      // 从现有配置导入其他参数
      timeframe: '15m',
      lookbackPeriod: 100,
      entryThreshold: 3.1,
      exitThreshold: 0.6,
      stopLossThreshold: 4.75,
      minCorrelation: 0.75,
      enforceCorrelation: true
    };
    
    // 交易所配置（直接配置格式，不是嵌套对象）
    const exchangeConfig = {
      id: 'binance',
      apiKey: process.env.BINANCE_API_KEY,
      secret: process.env.BINANCE_SECRET,
      enableRateLimit: true,
      timeout: 30000,
      options: {
        defaultType: 'spot',
        adjustForTimeDifference: true
      }
    };
    
    // 如果启用代理且有代理配置，添加到交易所配置
    const useProxy = process.env.USE_PROXY !== 'false'; // 默认使用代理
    if (useProxy && process.env.HTTPS_PROXY) {
      exchangeConfig.httpsProxy = process.env.HTTPS_PROXY;
      logger.info(`🔗 使用代理: ${process.env.HTTPS_PROXY}`);
      logger.info('');
    } else if (!useProxy) {
      logger.info('🌐 直连模式（不使用代理）');
      logger.info('');
    } else if (!process.env.HTTPS_PROXY) {
      logger.warn('⚠️  USE_PROXY=true 但未配置 HTTPS_PROXY');
      logger.warn('   如果在国内环境，可能无法连接币安API');
      logger.info('');
    }
    
    logger.info('🚀 初始化交易引擎...');
    logger.info('');
    
    // 创建引擎实例
    const engine = new StatisticalArbitrageEngine(exchangeConfig, strategyConfig);
    
    // 初始化
    await engine.initialize();
    
    logger.info('✅ 引擎初始化完成');
    logger.info('');
    logger.info('═'.repeat(70));
    logger.info('📈 开始实盘交易监控...');
    logger.info('═'.repeat(70));
    logger.info('');
    logger.info('⏰ 监控频率: 每分钟检查一次');
    logger.info('📊 监控配对:');
    liveConfig.pairs.forEach((pair, index) => {
      logger.info(`   ${index + 1}. ${pair.symbols[0]} / ${pair.symbols[1]}`);
    });
    logger.info('');
    logger.info('💡 提示:');
    logger.info('   - 按 Ctrl+C 停止交易');
    logger.info('   - 交易日志会记录在 logs/ 目录');
    logger.info('   - 请定期检查账户余额和持仓');
    logger.info('');
    logger.info('═'.repeat(70));
    logger.info('');
    
    // 启动实盘交易
    await engine.runLive();
    
  } catch (error) {
    logger.error('❌ 实盘交易启动失败:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// 运行主函数
main();

