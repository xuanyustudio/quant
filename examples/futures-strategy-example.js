/**
 * 合约策略使用示例
 * 展示如何使用合约版本的配对交易策略
 */

import { FuturesStrategy } from '../src/statistical-arbitrage/FuturesStrategy.js';
import { logger } from '../src/utils/logger.js';

// ===================================
// 示例1：基础使用
// ===================================

function example1_basic() {
  logger.info('📝 示例1：基础合约策略');
  logger.info('');
  
  // 创建合约策略实例
  const strategy = new FuturesStrategy({
    // 策略参数
    entryThreshold: 2.0,
    exitThreshold: 0.5,
    stopLossThreshold: 4.5,
    lookbackPeriod: 100,
    minCorrelation: 0.75,
    
    // 合约特有参数
    leverage: 1,                    // 1x杠杆（推荐：不加杠杆）
    useContractForShort: true,      // 启用合约做空
    marginType: 'cross'             // 全仓模式
  });
  
  logger.info('✅ 策略配置:');
  logger.info(`   杠杆: ${strategy.leverage}x`);
  logger.info(`   使用合约做空: ${strategy.useContractForShort}`);
  logger.info(`   保证金模式: ${strategy.marginType}`);
  logger.info('');
}

// ===================================
// 示例2：开仓示例
// ===================================

function example2_openPosition() {
  logger.info('📝 示例2：开仓逻辑');
  logger.info('');
  
  const strategy = new FuturesStrategy({
    leverage: 1,
    useContractForShort: true
  });
  
  // 模拟信号：做空价差
  const signal = {
    action: 'OPEN_SHORT',
    zScore: 2.5,
    reason: '价差偏高，做空价差'
  };
  
  // 模拟价格
  const btcPrice = 50000;
  const ethPrice = 3000;
  
  // 开仓
  const position = strategy.openPosition(
    'BTC/USDT-ETH/USDT',
    'BTC/USDT',
    'ETH/USDT',
    signal,
    btcPrice,
    ethPrice,
    1000  // $1000 资金
  );
  
  logger.info('✅ 持仓信息:');
  logger.info(`   配对: ${position.pairKey}`);
  logger.info(`   类型: ${position.type}`);
  logger.info('');
  logger.info(`   ${position.symbol1}:`);
  logger.info(`     类型: ${position.symbol1Type} (${position.symbol1Type === 'future' ? '合约' : '现货'})`);
  logger.info(`     方向: ${position.symbol1Side}`);
  logger.info(`     数量: ${position.quantity1.toFixed(8)}`);
  logger.info('');
  logger.info(`   ${position.symbol2}:`);
  logger.info(`     类型: ${position.symbol2Type} (${position.symbol2Type === 'future' ? '合约' : '现货'})`);
  logger.info(`     方向: ${position.symbol2Side}`);
  logger.info(`     数量: ${position.quantity2.toFixed(8)}`);
  logger.info('');
}

// ===================================
// 示例3：盈亏计算对比
// ===================================

function example3_pnlComparison() {
  logger.info('📝 示例3：盈亏计算对比（市场下跌场景）');
  logger.info('');
  
  // 开仓数据
  const entryBTC = 50000;
  const entryETH = 3000;
  const capital = 1000;
  
  // 市场下跌 20%
  const currentBTC = 40000;  // -20%
  const currentETH = 2400;   // -20%
  
  logger.info('开仓时:');
  logger.info(`   BTC: $${entryBTC}`);
  logger.info(`   ETH: $${entryETH}`);
  logger.info('');
  logger.info('市场下跌 20% 后:');
  logger.info(`   BTC: $${currentBTC}`);
  logger.info(`   ETH: $${currentETH}`);
  logger.info('');
  logger.info('─'.repeat(60));
  
  // 现货策略盈亏
  logger.info('');
  logger.info('【现货策略】做空价差 = 卖出BTC现货 + 买入ETH现货');
  const spotPnlBTC = 0;  // 已卖出，无盈亏
  const spotPnlETH = (currentETH - entryETH) / entryETH * capital / 2;  // 持仓亏损
  const spotTotalPnl = spotPnlBTC + spotPnlETH;
  
  logger.info(`   BTC (已卖出): $${spotPnlBTC.toFixed(2)}`);
  logger.info(`   ETH (持仓): $${spotPnlETH.toFixed(2)} ❌`);
  logger.info(`   总盈亏: $${spotTotalPnl.toFixed(2)} ❌❌❌`);
  logger.info('');
  
  // 合约策略盈亏
  logger.info('【合约策略】做空价差 = 做空BTC合约(1x) + 买入ETH现货');
  const futuresPnlBTC = (entryBTC - currentBTC) / entryBTC * capital / 2;  // 空单盈利
  const futuresPnlETH = (currentETH - entryETH) / entryETH * capital / 2;  // 持仓亏损
  const futuresTotalPnl = futuresPnlBTC + futuresPnlETH;
  
  logger.info(`   BTC (空单): $${futuresPnlBTC.toFixed(2)} ✅`);
  logger.info(`   ETH (持仓): $${futuresPnlETH.toFixed(2)} ❌`);
  logger.info(`   总盈亏: $${futuresTotalPnl.toFixed(2)} ✅✅✅`);
  logger.info('');
  logger.info('─'.repeat(60));
  logger.info('');
  logger.info('💡 结论:');
  logger.info(`   现货策略亏损: $${spotTotalPnl.toFixed(2)}`);
  logger.info(`   合约策略盈亏: $${futuresTotalPnl.toFixed(2)}`);
  logger.info(`   差异: $${(futuresTotalPnl - spotTotalPnl).toFixed(2)}`);
  logger.info('');
  logger.info('🎯 合约策略实现了市场中性对冲！');
  logger.info('');
}

// ===================================
// 示例4：实盘配置
// ===================================

function example4_liveConfig() {
  logger.info('📝 示例4：实盘配置示例');
  logger.info('');
  
  const liveConfig = {
    // 交易所配置
    exchange: {
      id: 'binance',
      apiKey: process.env.BINANCE_API_KEY,
      secret: process.env.BINANCE_SECRET,
      enableRateLimit: true,
      options: {
        defaultType: 'spot',  // 默认现货
        adjustForTimeDifference: true
      }
    },
    
    // 策略配置
    strategy: {
      // 基础参数
      autoTrade: true,
      tradeAmount: 500,
      maxPositions: 3,
      
      // 策略参数
      entryThreshold: 2.5,
      exitThreshold: 0.6,
      stopLossThreshold: 4.5,
      lookbackPeriod: 100,
      minCorrelation: 0.75,
      
      // ⭐ 合约配置（关键）
      useContractForShort: true,   // 使用合约做空
      leverage: 1,                 // 1x杠杆
      marginType: 'cross',         // 全仓模式
      
      // 风控参数
      maxDrawdown: 0.15,
      maxDailyLoss: 0.05
    },
    
    // 交易对
    pairs: [
      { symbol1: 'BTC/USDT', symbol2: 'ETH/USDT' },
      { symbol1: 'BNB/USDT', symbol2: 'SOL/USDT' }
    ]
  };
  
  logger.info('✅ 实盘配置:');
  logger.info('');
  logger.info('交易所:');
  logger.info(`   ID: ${liveConfig.exchange.id}`);
  logger.info(`   API已配置: ${!!liveConfig.exchange.apiKey}`);
  logger.info('');
  logger.info('策略参数:');
  logger.info(`   自动交易: ${liveConfig.strategy.autoTrade}`);
  logger.info(`   单笔金额: $${liveConfig.strategy.tradeAmount}`);
  logger.info(`   使用合约: ${liveConfig.strategy.useContractForShort} ⭐`);
  logger.info(`   杠杆倍数: ${liveConfig.strategy.leverage}x`);
  logger.info(`   保证金: ${liveConfig.strategy.marginType}`);
  logger.info('');
  logger.info('交易对:');
  liveConfig.pairs.forEach((pair, i) => {
    logger.info(`   ${i+1}. ${pair.symbol1} / ${pair.symbol2}`);
  });
  logger.info('');
}

// ===================================
// 示例5：策略对比
// ===================================

function example5_strategyComparison() {
  logger.info('📝 示例5：现货 vs 合约策略对比');
  logger.info('');
  logger.info('═'.repeat(70));
  logger.info('场景：做空价差（Symbol1 高估，Symbol2 低估）');
  logger.info('═'.repeat(70));
  logger.info('');
  
  logger.info('【现货策略】');
  logger.info('   开仓:');
  logger.info('     ├─ 卖出 Symbol1 现货');
  logger.info('     └─ 买入 Symbol2 现货');
  logger.info('');
  logger.info('   市场下跌时:');
  logger.info('     ├─ Symbol1: 已卖出，无盈亏 (0%)');
  logger.info('     └─ Symbol2: 持仓亏损 (-20%) ❌');
  logger.info('     总盈亏: -20% ❌❌❌');
  logger.info('');
  logger.info('   市场上涨时:');
  logger.info('     ├─ Symbol1: 已卖出，无盈亏 (0%)');
  logger.info('     └─ Symbol2: 持仓盈利 (+20%) ✅');
  logger.info('     总盈亏: +20% (承担方向性风险)');
  logger.info('');
  logger.info('─'.repeat(70));
  logger.info('');
  
  logger.info('【合约策略（1x杠杆）】');
  logger.info('   开仓:');
  logger.info('     ├─ 做空 Symbol1 合约 (1x)');
  logger.info('     └─ 买入 Symbol2 现货');
  logger.info('');
  logger.info('   市场下跌时:');
  logger.info('     ├─ Symbol1: 空单盈利 (+20%) ✅');
  logger.info('     └─ Symbol2: 持仓亏损 (-20%) ❌');
  logger.info('     总盈亏: 0% ✅✅✅ (完美对冲)');
  logger.info('');
  logger.info('   市场上涨时:');
  logger.info('     ├─ Symbol1: 空单亏损 (-20%) ❌');
  logger.info('     └─ Symbol2: 持仓盈利 (+20%) ✅');
  logger.info('     总盈亏: 0% ✅✅✅ (完美对冲)');
  logger.info('');
  logger.info('═'.repeat(70));
  logger.info('');
  logger.info('💡 关键结论:');
  logger.info('   ✅ 合约策略 = 真正的市场中性');
  logger.info('   ✅ 无视市场涨跌，只赚价差回归的钱');
  logger.info('   ✅ 使用 1x 杠杆，安全且高效');
  logger.info('');
}

// ===================================
// 运行所有示例
// ===================================

function runAllExamples() {
  logger.info('');
  logger.info('═'.repeat(70));
  logger.info('🚀 合约策略示例集');
  logger.info('═'.repeat(70));
  logger.info('');
  
  example1_basic();
  logger.info('═'.repeat(70));
  logger.info('');
  
  example2_openPosition();
  logger.info('═'.repeat(70));
  logger.info('');
  
  example3_pnlComparison();
  logger.info('═'.repeat(70));
  logger.info('');
  
  example4_liveConfig();
  logger.info('═'.repeat(70));
  logger.info('');
  
  example5_strategyComparison();
  
  logger.info('');
  logger.info('📚 完整文档请参考: docs/FUTURES_STRATEGY_GUIDE.md');
  logger.info('');
}

// 运行示例
runAllExamples();

