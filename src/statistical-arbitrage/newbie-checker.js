/**
 * 新手配置检查器 - 确保一切设置正确
 */

import { logger } from '../utils/logger.js';
import config from './config.js';
import fs from 'fs';
import path from 'path';

class NewbieChecker {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.info = [];
  }

  /**
   * 运行所有检查
   */
  async runAllChecks() {
    logger.info('');
    logger.info('═'.repeat(70));
    logger.info('🔍 新手配置检查器');
    logger.info('═'.repeat(70));
    logger.info('');
    
    // 检查资金配置
    this.checkCapitalSettings();
    
    // 检查风险控制
    this.checkRiskSettings();
    
    // 检查配对数量
    this.checkPairSettings();
    
    // 检查交易设置
    this.checkTradingSettings();
    
    // 检查文件和目录
    this.checkFilesAndDirs();
    
    // 检查时间范围
    this.checkTimeSettings();
    
    // 打印结果
    this.printResults();
  }

  /**
   * 检查资金配置
   */
  checkCapitalSettings() {
    const capital = config.strategy.initialCapital;
    const tradeAmount = config.strategy.tradeAmount;
    const positionSize = config.strategy.positionSize;
    
    logger.info('💰 检查资金配置...');
    
    // 检查初始资金
    if (capital !== 1000) {
      this.warnings.push('初始资金不是$1,000，当前为 $' + capital);
    } else {
      this.info.push('✅ 初始资金: $1,000（新手推荐）');
    }
    
    // 检查交易金额
    const recommendedTradeAmount = capital * 0.2;  // 20%
    if (tradeAmount > recommendedTradeAmount) {
      this.warnings.push('每笔交易金额偏高（$' + tradeAmount + '），建议不超过 $' + recommendedTradeAmount.toFixed(0));
    } else {
      this.info.push('✅ 每笔交易金额: $' + tradeAmount + '（合理）');
    }
    
    // 检查仓位比例
    if (positionSize > 0.6) {
      this.warnings.push('仓位比例过高（' + (positionSize * 100) + '%），新手建议≤50%');
    } else {
      this.info.push('✅ 仓位比例: ' + (positionSize * 100) + '%（保守）');
    }
    
    logger.info('');
  }

  /**
   * 检查风险控制
   */
  checkRiskSettings() {
    logger.info('🛡️ 检查风险控制...');
    
    const maxDrawdown = config.strategy.maxDrawdown;
    const maxDailyLoss = config.strategy.maxDailyLoss;
    const dailyTradeLimit = config.strategy.dailyTradeLimit;
    const capital = config.strategy.initialCapital;
    
    // 检查最大回撤
    if (maxDrawdown > 15) {
      this.warnings.push('最大回撤设置过高（' + maxDrawdown + '%），新手建议≤10%');
    } else {
      this.info.push('✅ 最大回撤限制: ' + maxDrawdown + '%（严格）');
    }
    
    // 检查每日亏损
    const dailyLossPercent = (maxDailyLoss / capital) * 100;
    if (dailyLossPercent > 7) {
      this.warnings.push('每日最大亏损过高（' + dailyLossPercent.toFixed(1) + '%），建议≤5%');
    } else {
      this.info.push('✅ 每日最大亏损: $' + maxDailyLoss + '（' + dailyLossPercent.toFixed(1) + '%资金）');
    }
    
    // 检查交易次数限制
    if (dailyTradeLimit > 8) {
      this.warnings.push('每日交易次数限制较高（' + dailyTradeLimit + '次），新手建议≤5次');
    } else {
      this.info.push('✅ 每日交易次数限制: ' + dailyTradeLimit + '次（合理）');
    }
    
    logger.info('');
  }

  /**
   * 检查配对设置
   */
  checkPairSettings() {
    logger.info('📊 检查配对设置...');
    
    const maxPairs = config.strategy.maxPairs;
    const maxPositions = config.strategy.maxPositions;
    const minCorrelation = config.strategy.minCorrelation;
    
    // 检查配对数量
    if (maxPairs > 5) {
      this.warnings.push('配对数量较多（' + maxPairs + '个），新手建议≤3个');
    } else {
      this.info.push('✅ 最大配对数: ' + maxPairs + '个（新手友好）');
    }
    
    // 检查持仓数
    if (maxPositions > 3) {
      this.warnings.push('最大持仓数较多（' + maxPositions + '个），新手建议≤2个');
    } else {
      this.info.push('✅ 最大持仓数: ' + maxPositions + '个（易于监控）');
    }
    
    // 检查相关性阈值
    if (minCorrelation < 0.7) {
      this.warnings.push('最小相关性阈值偏低（' + minCorrelation + '），建议≥0.75');
    } else {
      this.info.push('✅ 最小相关性: ' + minCorrelation + '（严格筛选）');
    }
    
    logger.info('');
  }

  /**
   * 检查交易设置
   */
  checkTradingSettings() {
    logger.info('⚙️ 检查交易设置...');
    
    const enableLiveTrading = config.strategy.enableLiveTrading;
    const autoTrade = config.strategy.autoTrade;
    const commission = config.strategy.commission;
    
    // 检查实盘交易状态
    if (enableLiveTrading) {
      this.warnings.push('⚠️ 实盘交易已启用！确保你已经完成纸上交易测试');
    } else {
      this.info.push('✅ 实盘交易未启用（建议先回测和纸上交易）');
    }
    
    // 检查自动交易
    if (autoTrade) {
      this.warnings.push('⚠️ 自动交易已启用！新手建议先使用手动模式');
    } else {
      this.info.push('✅ 自动交易未启用（手动模式更安全）');
    }
    
    // 检查手续费
    if (commission < 0.0008 || commission > 0.002) {
      this.warnings.push('手续费率设置可能不准确（' + (commission * 100) + '%），请确认');
    } else {
      this.info.push('✅ 手续费率: ' + (commission * 100) + '%');
    }
    
    logger.info('');
  }

  /**
   * 检查文件和目录
   */
  checkFilesAndDirs() {
    logger.info('📁 检查文件和目录...');
    
    // 检查必要目录
    const dirs = ['./output', './logs', './data'];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        this.warnings.push('目录不存在: ' + dir + '（程序会自动创建）');
      }
    });
    
    // 检查.env文件
    if (!fs.existsSync('.env')) {
      this.warnings.push('未找到 .env 文件（实盘交易需要配置API密钥）');
    } else {
      this.info.push('✅ .env 文件存在');
    }
    
    logger.info('');
  }

  /**
   * 检查时间设置
   */
  checkTimeSettings() {
    logger.info('⏰ 检查时间设置...');
    
    const startDate = config.strategy.backtestStartDate;
    const endDate = config.strategy.backtestEndDate;
    const timeframe = config.strategy.timeframe;
    const backtestTimeframe = config.strategy.backtestTimeframe;
    
    // 检查回测时间范围
    if (startDate && endDate) {
      this.info.push('✅ 回测时间范围: ' + startDate + ' 至 ' + endDate);
      
      // 检查时间范围是否合理（至少15天）
      const start = new Date(startDate);
      const end = new Date(endDate);
      const days = (end - start) / (1000 * 60 * 60 * 24);
      
      if (days < 15) {
        this.warnings.push('回测时间范围较短（' + days.toFixed(0) + '天），建议≥30天');
      }
    } else {
      this.info.push('使用最新数据进行回测');
    }
    
    // 检查时间周期
    this.info.push('✅ 相关性分析周期: ' + timeframe);
    this.info.push('✅ 回测K线周期: ' + backtestTimeframe);
    
    logger.info('');
  }

  /**
   * 打印检查结果
   */
  printResults() {
    logger.info('═'.repeat(70));
    logger.info('📋 检查结果汇总');
    logger.info('═'.repeat(70));
    logger.info('');
    
    // 打印错误
    if (this.errors.length > 0) {
      logger.info('❌ 发现 ' + this.errors.length + ' 个错误（必须修复）:');
      logger.info('');
      this.errors.forEach((error, index) => {
        logger.error('  ' + (index + 1) + '. ' + error);
      });
      logger.info('');
    }
    
    // 打印警告
    if (this.warnings.length > 0) {
      logger.info('⚠️  发现 ' + this.warnings.length + ' 个警告（建议调整）:');
      logger.info('');
      this.warnings.forEach((warning, index) => {
        logger.warn('  ' + (index + 1) + '. ' + warning);
      });
      logger.info('');
    }
    
    // 打印信息
    if (this.info.length > 0) {
      logger.info('ℹ️  配置信息:');
      logger.info('');
      this.info.forEach(info => {
        logger.info('  ' + info);
      });
      logger.info('');
    }
    
    // 总结
    logger.info('═'.repeat(70));
    if (this.errors.length === 0 && this.warnings.length === 0) {
      logger.info('✅ 恭喜！所有配置都符合新手推荐标准');
      logger.info('');
      logger.info('🎯 下一步：');
      logger.info('   1. 运行回测: npm run stat-arb:backtest');
      logger.info('   2. 查看新手指南: docs/NEWBIE_QUICKSTART.md');
    } else if (this.errors.length === 0) {
      logger.info('✅ 配置基本合理，但有一些建议调整项');
      logger.info('');
      logger.info('💡 建议：');
      logger.info('   - 仔细阅读上面的警告');
      logger.info('   - 根据自己情况调整配置');
      logger.info('   - 或继续使用当前配置');
    } else {
      logger.info('❌ 发现严重问题，请先修复错误');
    }
    logger.info('═'.repeat(70));
    logger.info('');
    
    // 打印当前配置摘要
    this.printConfigSummary();
  }

  /**
   * 打印配置摘要
   */
  printConfigSummary() {
    logger.info('📊 当前配置摘要');
    logger.info('═'.repeat(70));
    logger.info('');
    logger.info('💰 资金管理:');
    logger.info('   初始资金: $' + config.strategy.initialCapital);
    logger.info('   每笔交易: $' + config.strategy.tradeAmount);
    logger.info('   仓位比例: ' + (config.strategy.positionSize * 100) + '%');
    logger.info('');
    logger.info('🛡️ 风险控制:');
    logger.info('   最大回撤: ' + config.strategy.maxDrawdown + '%');
    logger.info('   每日亏损: $' + config.strategy.maxDailyLoss);
    logger.info('   交易次数: ' + config.strategy.dailyTradeLimit + '次/天');
    logger.info('');
    logger.info('📈 策略参数:');
    logger.info('   最大配对: ' + config.strategy.maxPairs + '个');
    logger.info('   最大持仓: ' + config.strategy.maxPositions + '个');
    logger.info('   最小相关性: ' + config.strategy.minCorrelation);
    logger.info('');
    logger.info('⚙️ 交易状态:');
    logger.info('   实盘交易: ' + (config.strategy.enableLiveTrading ? '✅ 已启用' : '❌ 未启用'));
    logger.info('   自动交易: ' + (config.strategy.autoTrade ? '✅ 已启用' : '❌ 未启用'));
    logger.info('');
    logger.info('═'.repeat(70));
    logger.info('');
  }
}

// 主函数
async function main() {
  try {
    const checker = new NewbieChecker();
    await checker.runAllChecks();
  } catch (error) {
    logger.error('检查器运行失败:', error);
  }
}

main();

