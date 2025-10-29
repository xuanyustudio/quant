/**
 * 统计套利主程序
 * 配对交易策略的实盘运行
 */

import dotenv from 'dotenv';
import ccxt from 'ccxt';
import { DataCollector } from './DataCollector.js';
import { StatisticalAnalyzer } from './StatisticalAnalyzer.js';
import { PairsStrategy } from './PairsStrategy.js';
import { Backtest } from './Backtest.js';
import { logger } from '../utils/logger.js';
import config from './config.js';

dotenv.config();

class StatisticalArbitrageEngine {
  constructor(exchangeConfig, strategyConfig) {
    this.exchangeConfig = exchangeConfig;
    this.strategyConfig = strategyConfig;
    this.isRunning = false;
    
    // 初始化组件
    this.exchange = null;
    this.dataCollector = null;
    this.analyzer = new StatisticalAnalyzer(strategyConfig);
    this.strategy = new PairsStrategy(strategyConfig);
    
    // 监控的交易对
    this.symbols = strategyConfig.symbols || [];
    this.selectedPairs = [];
  }

  /**
   * 初始化
   */
  async initialize() {
    try {
      logger.info('🚀 初始化统计套利系统...');
      
      // 创建交易所实例
      const ExchangeClass = ccxt[this.exchangeConfig.id];
      const exchangeParams = {
        apiKey: this.exchangeConfig.apiKey,
        secret: this.exchangeConfig.secret,
        enableRateLimit: this.exchangeConfig.enableRateLimit !== false,
        timeout: this.exchangeConfig.timeout || 30000,
        options: this.exchangeConfig.options || {}
      };
      
      // 如果配置了代理，添加代理设置
      if (this.exchangeConfig.httpsProxy) {
        exchangeParams.httpsProxy = this.exchangeConfig.httpsProxy;
        logger.info(`📡 使用代理: ${this.exchangeConfig.httpsProxy}`);
      }
      if (this.exchangeConfig.httpProxy) {
        exchangeParams.httpProxy = this.exchangeConfig.httpProxy;
      }
      
      logger.info(`⏱️  超时设置: ${exchangeParams.timeout}ms`);
      this.exchange = new ExchangeClass(exchangeParams);
      
      await this.exchange.loadMarkets();
      logger.info(`✅ 交易所连接成功: ${this.exchangeConfig.id}`);
      
      // 初始化数据收集器
      this.dataCollector = new DataCollector(this.exchange, {
        dataDir: './data/statistical-arbitrage'
      });
      await this.dataCollector.initialize();
      
      logger.info('✅ 初始化完成');
      
    } catch (error) {
      logger.error('初始化失败:', error);
      throw error;
    }
  }

  /**
   * 寻找配对
   */
  async findPairs() {
    logger.info('');
    logger.info('═'.repeat(60));
    logger.info('🔍 分析配对相关性...');
    logger.info('═'.repeat(60));
    
    try {
      const timeframe = this.strategyConfig.timeframe || '1h';
      const analysisMonths = this.strategyConfig.correlationAnalysisMonths || 3;
      
      logger.info(`📊 获取 ${this.symbols.length} 个交易对的历史数据...`);
      logger.info(`📅 分析周期: 过去 ${analysisMonths} 个月`);
      logger.info(`🔄 将计算每月相关性并取平均值，以提高可靠性`);
      logger.info('');
      
      // 获取过去N个月的数据并计算平均相关性
      const { avgCorrelationMatrix, correlationStability, successfulSymbols, failedSymbols, monthlyCorrelations } = 
        await this.calculateMultiMonthCorrelation(analysisMonths, timeframe);
      
      logger.info('');
      logger.info(`✅ 成功获取 ${successfulSymbols.length}/${this.symbols.length} 个交易对的数据`);
      if (failedSymbols.length > 0) {
        logger.warn(`⚠️  以下 ${failedSymbols.length} 个交易对获取失败（将被排除）:`);
        failedSymbols.forEach(symbol => {
          logger.warn(`   - ${symbol}`);
        });
      }
      
      // 检查是否有足够的交易对数据
      if (successfulSymbols.length < 2) {
        throw new Error(`数据获取失败：至少需要2个交易对的数据，当前只有 ${successfulSymbols.length} 个`);
      }
      
      // 计算相关性矩阵（使用平均相关性）
      logger.info('');
      logger.info('📈 生成平均相关性矩阵...');
      const correlationMatrix = avgCorrelationMatrix;
      
      // 找出高相关性配对（同时筛选稳定性）
      const pairs = this.analyzer.findHighlyCorrelatedPairs(
        correlationMatrix,
        this.strategyConfig.minCorrelation,
        correlationStability,  // 传递稳定性数据
        this.strategyConfig.maxStability  // 传递稳定性阈值
      );
      
      logger.info('');
      logger.info(`✅ 发现 ${pairs.length} 个高相关性配对 (相关性 ≥ ${this.strategyConfig.minCorrelation}, 稳定性 σ ≤ ${this.strategyConfig.maxStability}):`);
      logger.info('');
      
      pairs.slice(0, 100).forEach((p, index) => {
        const stabilityText = p.stability !== null ? `, σ=${p.stability.toFixed(3)}` : '';
        logger.info(`${index + 1}. ${p.pair[0]} / ${p.pair[1]}`);
        logger.info(`   相关系数: ${p.correlation.toFixed(3)}${stabilityText}`);
      });
      
      this.selectedPairs = pairs;
      
      // 生成相关性矩阵热力图
      try {
        const BacktestVisualizer = (await import('./BacktestVisualizer.js')).default;
        const visualizer = new BacktestVisualizer('./output');
        
        const result = visualizer.generateCorrelationMatrix(
          correlationMatrix,
          successfulSymbols,  // 只使用成功获取数据的交易对
          {
            minCorrelation: this.strategyConfig.minCorrelation,
            timeframe,
            period: `过去 ${analysisMonths} 个月（平均值）`,
            totalSymbols: this.symbols.length,  // 原始交易对总数
            failedSymbols: failedSymbols.length,  // 失败的交易对数量
            correlationStability,  // 传递相关性稳定性数据
            analysisMonths,  // 分析月份数
            monthlyCorrelations  // 传递月度相关性数据
          }
        );
        
        logger.info('');
        logger.info(`📊 相关性矩阵热力图已生成: ${result.filepath}`);
      } catch (error) {
        logger.error('生成相关性矩阵失败:', error.message);
      }
      
      // 保存相关性数据到JSON文件，供回测时直接使用
      try {
        const fs = await import('fs');
        const path = await import('path');
        
        // 构建月度相关性详情
        const monthlyDetails = monthlyCorrelations.map(mc => ({
          year: mc.year,
          month: mc.month,
          date: `${mc.year}-${String(mc.month).padStart(2, '0')}`,
          symbols: mc.symbols
        }));
        
        // 为每个配对添加月度相关系数和稳定性信息
        const pairsWithMonthlyData = pairs.map(p => {
          const [symbol1, symbol2] = p.pair;
          const monthlyCorrs = [];
          
          // 收集每个月的相关系数
          for (const monthData of monthlyCorrelations) {
            const idx1 = monthData.symbols.indexOf(symbol1);
            const idx2 = monthData.symbols.indexOf(symbol2);
            
            if (idx1 !== -1 && idx2 !== -1 && monthData.matrix[symbol1] && monthData.matrix[symbol1][symbol2]) {
              monthlyCorrs.push({
                date: `${monthData.year}-${String(monthData.month).padStart(2, '0')}`,
                correlation: monthData.matrix[symbol1][symbol2]
              });
            }
          }
          
          return {
            pair: p.pair,
            correlation: p.correlation, // 平均相关性
            stability: p.stability,     // 稳定性（标准差）
            monthlyCorrelations: monthlyCorrs
          };
        });
        
        const correlationData = {
          timestamp: Date.now(),
          date: new Date().toISOString(),
          analysisMonths,
          timeframe,
          minCorrelation: this.strategyConfig.minCorrelation,
          symbols: successfulSymbols,
          correlationMatrix,
          correlationStability,
          monthlyDetails, // 月度分析详情
          pairs: pairsWithMonthlyData
        };
        
        const filename = `correlation_data_${Date.now()}.json`;
        const filepath = path.default.join('./output', filename);
        
        // 确保目录存在
        if (!fs.default.existsSync('./output')) {
          fs.default.mkdirSync('./output', { recursive: true });
        }
        
        fs.default.writeFileSync(filepath, JSON.stringify(correlationData, null, 2));
        
        logger.info('');
        logger.info(`💾 相关性数据已保存: ${filepath}`);
        logger.info(`ℹ️  回测时可以使用此文件跳过相关性分析`);
      } catch (error) {
        logger.error('保存相关性数据失败:', error.message);
      }
      
      return {
        pairs,
        correlationMatrix,
        correlationStability,
        successfulSymbols,
        failedSymbols
      };
      
    } catch (error) {
      logger.error('分析配对失败:', error);
      throw error;
    }
  }

  /**
   * 计算多个月的平均相关性
   */
  async calculateMultiMonthCorrelation(months = 3, timeframe = '1h') {
    const now = new Date();
    const monthlyCorrelations = [];
    const successfulSymbolsSet = new Set(this.symbols);
    const failedSymbolsSet = new Set();
    
    // 逐月获取数据并计算相关性
    for (let i = 0; i < months; i++) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth() + 1;
      
      // 计算该月的开始和结束时间
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      const since = startDate.getTime();
      const days = (endDate - startDate) / (1000 * 60 * 60 * 24);
      const timeframeHours = timeframe === '1h' ? 1 : timeframe === '4h' ? 4 : 1;
      const limit = Math.ceil((days * 24) / timeframeHours);
      
      logger.info(`[${i + 1}/${months}] 📊 获取 ${year}年${month}月 数据 (${limit} 条)...`);
      
      try {
        // 获取该月数据（不使用缓存）
        const monthPriceData = {};
        for (const symbol of Array.from(successfulSymbolsSet)) {
          try {
            const data = await this.dataCollector.fetchOHLCV(
              symbol,
              timeframe,
              limit,
              since,
              false  // 不使用缓存
            );
            
            if (data && data.length > limit * 0.8) {  // 至少要有80%的数据
              monthPriceData[symbol] = data;
            } else {
              logger.warn(`   ⚠️  ${symbol} 数据不完整 (${data ? data.length : 0}/${limit} 条)`);
              successfulSymbolsSet.delete(symbol);
              failedSymbolsSet.add(symbol);
            }
            
            // 避免触发API限速
            await this.sleep(100);
          } catch (error) {
            logger.error(`   ❌ ${symbol} 获取失败: ${error.message}`);
            successfulSymbolsSet.delete(symbol);
            failedSymbolsSet.add(symbol);
          }
        }
        
        // 检查该月是否有足够的数据
        const validSymbolsCount = Object.keys(monthPriceData).length;
        if (validSymbolsCount < 2) {
          logger.warn(`   ⚠️  ${year}年${month}月 数据不足，跳过该月`);
          continue;
        }
        
        // 构建价格矩阵并计算相关性
        const matrix = this.dataCollector.getPriceMatrix(monthPriceData);
        const correlationMatrix = this.analyzer.calculateCorrelationMatrix(matrix.prices);
        const symbols = Object.keys(matrix.prices); // 从 prices 对象中提取 symbols
        
        monthlyCorrelations.push({
          year,
          month,
          matrix: correlationMatrix,
          symbols: symbols
        });
        
        logger.info(`   ✅ ${year}年${month}月 相关性计算完成 (${validSymbolsCount} 个交易对)`);
        
      } catch (error) {
        logger.error(`   ❌ ${year}年${month}月 处理失败: ${error.message}`);
      }
      
      // 避免触发API限速
      await this.sleep(300);
    }
    
    // 检查是否有有效数据
    if (monthlyCorrelations.length === 0) {
      throw new Error('无法获取任何月份的有效数据');
    }
    
    logger.info('');
    logger.info(`📊 成功获取 ${monthlyCorrelations.length}/${months} 个月的数据`);
    logger.info('');
    logger.info('🧮 计算平均相关性...');
    
    // 计算平均相关性矩阵和稳定性
    const successfulSymbols = Array.from(successfulSymbolsSet);
    const n = successfulSymbols.length;
    const avgCorrelationMatrix = Array(n).fill(0).map(() => Array(n).fill(0));
    const correlationStability = Array(n).fill(0).map(() => Array(n).fill(0));
    
    // 对于每对交易对，计算平均相关性和标准差
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const symbol1 = successfulSymbols[i];
        const symbol2 = successfulSymbols[j];
        
        const correlations = [];
        
        // 收集所有月份的相关性
        for (const monthData of monthlyCorrelations) {
          // 检查该月是否包含这两个交易对
          if (monthData.symbols.includes(symbol1) && monthData.symbols.includes(symbol2)) {
            // correlationMatrix 是对象结构: { symbol1: { symbol2: value } }
            if (monthData.matrix[symbol1] && monthData.matrix[symbol1][symbol2] !== undefined) {
              correlations.push(monthData.matrix[symbol1][symbol2]);
            }
          }
        }
        
        if (correlations.length > 0) {
          // 计算平均值
          const avg = correlations.reduce((sum, val) => sum + val, 0) / correlations.length;
          avgCorrelationMatrix[i][j] = avg;
          
          // 计算标准差（稳定性）
          const variance = correlations.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / correlations.length;
          const stdDev = Math.sqrt(variance);
          correlationStability[i][j] = stdDev;
        } else {
          avgCorrelationMatrix[i][j] = i === j ? 1 : 0;
          correlationStability[i][j] = 0;
        }
      }
    }
    
    logger.info(`✅ 平均相关性计算完成`);
    
    // 将二维数组转换为对象格式，以便与 findHighlyCorrelatedPairs 兼容
    const avgCorrelationMatrixObj = {};
    const correlationStabilityObj = {};
    
    for (let i = 0; i < n; i++) {
      const symbol1 = successfulSymbols[i];
      avgCorrelationMatrixObj[symbol1] = {};
      correlationStabilityObj[symbol1] = {};
      
      for (let j = 0; j < n; j++) {
        const symbol2 = successfulSymbols[j];
        avgCorrelationMatrixObj[symbol1][symbol2] = avgCorrelationMatrix[i][j];
        correlationStabilityObj[symbol1][symbol2] = correlationStability[i][j];
      }
    }
    
    return {
      avgCorrelationMatrix: avgCorrelationMatrixObj,
      correlationStability: correlationStabilityObj,
      successfulSymbols,
      failedSymbols: Array.from(failedSymbolsSet),
      monthlyCorrelations
    };
  }

  /**
   * 运行回测
   * @param {string} correlationDataFile - 可选：相关性数据JSON文件路径，如果提供则跳过find-pairs步骤
   */
  async runBacktest(correlationDataFile = null) {
    logger.info('');
    logger.info('═'.repeat(60));
    logger.info('📊 开始回测...');
    logger.info('═'.repeat(60));
    
    if (correlationDataFile) {
      logger.info(`🔍 接收到相关性文件参数: ${correlationDataFile}`);
    } else {
      logger.info('ℹ️  未提供相关性文件，将重新分析配对相关性');
    }
    
    try {
      let pairs;
      
      // 检查是否提供了相关性数据文件
      if (correlationDataFile) {
        logger.info('📂 从文件加载相关性数据: ' + correlationDataFile);
        const fs = await import('fs');
        
        if (!fs.default.existsSync(correlationDataFile)) {
          throw new Error('相关性数据文件不存在: ' + correlationDataFile);
        }
        
        const correlationData = JSON.parse(fs.default.readFileSync(correlationDataFile, 'utf-8'));
        
        logger.info('✅ 成功加载相关性数据');
        logger.info(`   分析时间: ${new Date(correlationData.timestamp).toLocaleString('zh-CN')}`);
        logger.info(`   分析月份: ${correlationData.analysisMonths} 个月`);
        logger.info(`   币种数量: ${correlationData.symbols.length}`);
        logger.info(`   原始配对数量: ${correlationData.pairs.length}`);
        logger.info('');
        
        // 重新应用稳定性筛选（如果配置了maxStability阈值）
        let filteredPairs = correlationData.pairs;
        
        if (this.strategyConfig.maxStability !== undefined && this.strategyConfig.maxStability !== null) {
          const originalCount = filteredPairs.length;
          filteredPairs = filteredPairs.filter(p => {
            // 如果配对有稳定性信息，则检查是否符合阈值
            if (p.stability !== undefined && p.stability !== null) {
              return p.stability <= this.strategyConfig.maxStability;
            }
            // 如果没有稳定性信息，保留该配对
            return true;
          });
          
          const filteredCount = originalCount - filteredPairs.length;
          if (filteredCount > 0) {
            logger.info(`🔍 稳定性筛选: 过滤掉 ${filteredCount} 个不稳定配对 (σ > ${this.strategyConfig.maxStability})`);
          }
        }
        
        pairs = filteredPairs.map(p => ({
          pair: p.pair,
          correlation: p.correlation,
          absCorrelation: Math.abs(p.correlation),
          stability: p.stability
        }));
        
        logger.info(`✅ 筛选后配对数量: ${pairs.length}`);
        logger.info('⏩ 跳过相关性分析步骤（使用已有数据）');
      } else {
        // 第一步：使用1小时线计算相关性，找到最佳配对
        logger.info('📊 步骤1: 使用1小时线分析相关性...');
        const result = await this.findPairs();
        pairs = result.pairs;
      }
      
      if (pairs.length === 0) {
        logger.warn('未找到符合条件的配对');
        return;
      }
      
      // 选择前N个配对进行回测
      const topPairs = pairs.slice(0, this.strategyConfig.maxPairs || 5);
      const pairsList = topPairs.map(p => p.pair);
      
      logger.info(`✅ 找到 ${pairsList.length} 个高相关性配对`);
      logger.info('');
      
      // 第二步：获取15分钟线数据用于细粒度回测
      const backtestTimeframe = this.strategyConfig.backtestTimeframe || this.strategyConfig.timeframe;
      logger.info(`📊 步骤2: 获取 ${backtestTimeframe} 线数据用于回测...`);
      
      // 计算回测时间范围
      let backtestSince, backtestLimit, correlationHours;
      
      if (this.strategyConfig.backtestStartDate && this.strategyConfig.backtestEndDate) {
        // 使用指定的历史时间范围
        const startDate = new Date(this.strategyConfig.backtestStartDate);
        const endDate = new Date(this.strategyConfig.backtestEndDate);
        
        backtestSince = startDate.getTime();
        const backtestEnd = endDate.getTime();
        correlationHours = (backtestEnd - backtestSince) / (60 * 60 * 1000);
        backtestLimit = this.calculateBacktestLimit(backtestTimeframe, correlationHours);
        
        logger.info(`📅 使用历史时间范围: ${this.strategyConfig.backtestStartDate} 至 ${this.strategyConfig.backtestEndDate}`);
      } else {
        // 使用最近的数据
        correlationHours = this.strategyConfig.correlationPeriod || 720;
        backtestLimit = this.calculateBacktestLimit(backtestTimeframe, correlationHours);
        backtestSince = Date.now() - (correlationHours * 60 * 60 * 1000);
      }
      
      logger.info(`⏰ 回测时间范围: ${(correlationHours / 24).toFixed(0)} 天`);
      logger.info(`📊 回测数据点数: ${backtestLimit} 个 ${backtestTimeframe} K线`);
      
      // 获取所有需要回测的交易对的细粒度数据
      const backtestSymbols = new Set();
      pairsList.forEach(([s1, s2]) => {
        backtestSymbols.add(s1);
        backtestSymbols.add(s2);
      });
      
      const backtestPriceData = await this.dataCollector.fetchMultipleOHLCV(
        Array.from(backtestSymbols),
        backtestTimeframe,
        backtestLimit,
        backtestSince
      );
      
      // 构建回测用的价格矩阵
      const backtestMatrix = this.dataCollector.getPriceMatrix(backtestPriceData);
      
      logger.info(`✅ 成功获取 ${Object.keys(backtestMatrix.prices).length} 个交易对的回测数据`);
      logger.info('');
      
      // 第三步：使用15分钟线数据进行回测
      logger.info(`📊 步骤3: 使用 ${backtestTimeframe} 线数据回测...`);
      
      // 创建回测引擎
      const backtest = new Backtest({
        initialCapital: this.strategyConfig.initialCapital || 10000,
        positionSize: this.strategyConfig.positionSize || 0.5,
        commission: this.strategyConfig.commission || 0.001,
        strategy: this.strategyConfig
      });
      
      // 批量回测（使用15分钟线数据）
      const results = await backtest.runMultiplePairs(
        pairsList,
        backtestMatrix.prices,
        backtestMatrix.timestamps
      );
      
      // 选择最优配对用于实盘
      const bestPairs = results
        .filter(r => r.totalReturn > 0 && r.winRate > 50)
        .slice(0, 3);
      
      if (bestPairs.length > 0) {
        logger.info('');
        logger.info('✅ 推荐用于实盘的配对:');
        bestPairs.forEach((r, index) => {
          logger.info(`${index + 1}. ${r.pair[0]} / ${r.pair[1]}`);
          logger.info(`   收益率: ${r.totalReturn.toFixed(2)}%`);
          logger.info(`   胜率: ${r.winRate.toFixed(1)}%`);
          logger.info(`   夏普比率: ${r.sharpeRatio.toFixed(2)}`);
        });
        
        this.selectedPairs = bestPairs;
      } else {
        logger.warn('⚠️  没有找到表现良好的配对');
      }
      
      return results;
      
    } catch (error) {
      logger.error('回测失败:', error);
      throw error;
    }
  }

  /**
   * 单币对回测（无需分析相关性，直接回测指定配对）
   * @param {string} symbol1 - 第一个交易对
   * @param {string} symbol2 - 第二个交易对
   * @returns {Promise<Object>} 回测结果
   */
  async backtestSinglePair(symbol1, symbol2) {
    logger.info('📊 开始单币对回测...');
    logger.info(`   币对: ${symbol1} / ${symbol2}`);
    logger.info('');
    
    try {
      // 获取时间周期
      const backtestTimeframe = this.strategyConfig.backtestTimeframe || this.strategyConfig.timeframe;
      
      // 计算时间范围
      let backtestSince, backtestLimit, correlationHours;
      
      if (this.strategyConfig.backtestStartDate && this.strategyConfig.backtestEndDate) {
        // 使用指定的历史时间范围
        const startDate = new Date(this.strategyConfig.backtestStartDate);
        const endDate = new Date(this.strategyConfig.backtestEndDate);
        
        backtestSince = startDate.getTime();
        const backtestEnd = endDate.getTime();
        correlationHours = (backtestEnd - backtestSince) / (60 * 60 * 1000);
        backtestLimit = this.calculateBacktestLimit(backtestTimeframe, correlationHours);
        
        logger.info(`📅 时间范围: ${this.strategyConfig.backtestStartDate} 至 ${this.strategyConfig.backtestEndDate}`);
        logger.info(`⏰ 周期: ${(correlationHours / 24).toFixed(0)} 天`);
        logger.info(`📊 数据点数: ${backtestLimit} 个 ${backtestTimeframe} K线`);
      } else {
        correlationHours = this.strategyConfig.correlationPeriod || 720;
        backtestLimit = this.calculateBacktestLimit(backtestTimeframe, correlationHours);
        backtestSince = Date.now() - (correlationHours * 60 * 60 * 1000);
        
        logger.info(`⏰ 使用最近 ${(correlationHours / 24).toFixed(0)} 天的数据`);
      }
      
      logger.info('');
      logger.info('📥 获取历史数据...');
      
      // 获取两个币对的数据
      const priceData1 = await this.dataCollector.fetchOHLCV(
        symbol1,
        backtestTimeframe,
        backtestLimit,
        backtestSince
      );
      
      const priceData2 = await this.dataCollector.fetchOHLCV(
        symbol2,
        backtestTimeframe,
        backtestLimit,
        backtestSince
      );
      
      if (!priceData1 || !priceData2 || priceData1.length === 0 || priceData2.length === 0) {
        logger.error('❌ 无法获取价格数据');
        return null;
      }
      
      logger.info(`✅ ${symbol1}: ${priceData1.length} 条数据`);
      logger.info(`✅ ${symbol2}: ${priceData2.length} 条数据`);
      logger.info('');
      
      // 构建价格矩阵
      const backtestPriceData = {
        [symbol1]: priceData1,
        [symbol2]: priceData2
      };
      
      const backtestMatrix = this.dataCollector.getPriceMatrix(backtestPriceData);
      
      // 创建回测引擎
      const backtest = new Backtest({
        initialCapital: this.strategyConfig.initialCapital || 10000,
        positionSize: this.strategyConfig.positionSize || 0.5,
        commission: this.strategyConfig.commission || 0.001,
        strategy: this.strategyConfig
      });
      
      // 执行回测
      logger.info('🔄 执行回测...');
      logger.info('');
      
      const result = await backtest.run(
        symbol1,
        symbol2,
        backtestMatrix.prices[symbol1],
        backtestMatrix.prices[symbol2],
        backtestMatrix.timestamps
      );
      
      if (!result) {
        logger.error('❌ 回测失败');
        return null;
      }
      
      return result;
      
    } catch (error) {
      logger.error('单币对回测失败:', error);
      throw error;
    }
  }

  /**
   * 实盘运行
   */
  async runLive() {
    if (!this.strategyConfig.enableLiveTrading) {
      logger.warn('⚠️  实盘交易未启用');
      logger.info('请在配置中设置 enableLiveTrading: true');
      return;
    }
    
    // 📊 从配置初始化交易对
    if (this.strategyConfig.tradingPairs && this.strategyConfig.tradingPairs.length > 0) {
      this.selectedPairs = this.strategyConfig.tradingPairs.map(p => ({
        pair: [p.symbol1, p.symbol2],
        correlation: p.correlation || 0,
        allocation: p.allocation || 0,
        tradeAmount: p.tradeAmount
      }));
      
      logger.info('✅ 加载交易配对:');
      this.selectedPairs.forEach((p, index) => {
        logger.info(`   ${index + 1}. ${p.pair[0]} / ${p.pair[1]} (资金: $${p.tradeAmount})`);
      });
      logger.info('');
    } else {
      logger.error('❌ 未找到交易配对配置！');
      logger.error('   请确保 strategyConfig.tradingPairs 已正确设置');
      return;
    }
    
    logger.info('');
    logger.info('═'.repeat(60));
    logger.info('🔴 启动实盘交易...');
    logger.info('═'.repeat(60));
    
    this.isRunning = true;
    let checkCount = 0;
    
    // 主循环
    while (this.isRunning) {
      try {
        checkCount++;
        const cycleTime = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
        
        logger.info('');
        logger.info('═'.repeat(60));
        logger.info(`🔍 第 ${checkCount} 次检查 [${cycleTime}]`);
        logger.info('═'.repeat(60));
        logger.info('');
        
        for (const pairInfo of this.selectedPairs) {
          const [symbol1, symbol2] = pairInfo.pair;
          
          try {
            // 获取最新数据
            const prices1 = await this.dataCollector.fetchOHLCV(
              symbol1,
              this.strategyConfig.timeframe,
              this.strategyConfig.lookbackPeriod + 10
            );
            
            const prices2 = await this.dataCollector.fetchOHLCV(
              symbol2,
              this.strategyConfig.timeframe,
              this.strategyConfig.lookbackPeriod + 10
            );
            
            if (!prices1 || prices1.length === 0) {
              logger.warn(`⚠️  ${symbol1}: 无法获取价格数据`);
              continue;
            }
            
            if (!prices2 || prices2.length === 0) {
              logger.warn(`⚠️  ${symbol2}: 无法获取价格数据`);
              continue;
            }
            
            // 分析配对
            const closePrices1 = this.dataCollector.getClosePrices(prices1);
            const closePrices2 = this.dataCollector.getClosePrices(prices2);
            
            const currentPrice1 = closePrices1[closePrices1.length - 1];
            const currentPrice2 = closePrices2[closePrices2.length - 1];
            const pairKey = `${symbol1}_${symbol2}`;
            
            const analysis = this.strategy.analyzePair(
              symbol1,
              symbol2,
              closePrices1,
              closePrices2,
              pairKey
            );
            
            // 📊 始终输出当前状态（不管是否viable）
            const timestamp = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
            logger.info('─'.repeat(60));
            logger.info(`📊 ${symbol1} / ${symbol2} [${timestamp}]`);
            logger.info(`   💰 当前价格: ${symbol1}=$${currentPrice1.toFixed(8)} | ${symbol2}=$${currentPrice2.toFixed(8)}`);
            logger.info(`   📈 价格比率: ${(currentPrice1/currentPrice2).toFixed(4)}`);
            
            if (!analysis.viable) {
              logger.info(`   ⚠️  不可交易: ${analysis.reason || '未知原因'}`);
              logger.info('');
              continue;
            }
          
            const currentZScore = analysis.zScore.current;
            const signal = analysis.signal;
            const correlation = analysis.correlation;
            const spreadMean = analysis.spread.mean;
            const spreadStd = analysis.spread.std;
            const spreadCurrent = analysis.spread.current;
            
            // 输出统计指标
            logger.info(`   📊 相关系数: ${correlation.toFixed(3)} ${correlation >= 0.8 ? '✨' : correlation >= 0.7 ? '✅' : '⚠️'}`);
            logger.info(`   📉 价差统计: 当前=${spreadCurrent.toFixed(6)} | 均值=${spreadMean.toFixed(6)} | 标准差=${spreadStd.toFixed(6)}`);
            logger.info(`   🎯 Z-Score: ${currentZScore.toFixed(2)} ${Math.abs(currentZScore) > 2 ? '🔥' : ''}`);
            
            // 输出交易阈值对比
            const entryThreshold = this.strategyConfig.entryThreshold || 2.0;
            const exitThreshold = this.strategyConfig.exitThreshold || 0.5;
            const stopLossThreshold = this.strategyConfig.stopLossThreshold || 3.5;
            logger.info(`   📏 阈值: 开仓=${entryThreshold} | 平仓=${exitThreshold} | 止损=${stopLossThreshold}`);
            
            // 输出信号状态
            let signalEmoji = '⏸️';
            if (signal.action === 'OPEN_LONG') signalEmoji = '🟢';
            else if (signal.action === 'OPEN_SHORT') signalEmoji = '🔴';
            else if (signal.action === 'CLOSE') signalEmoji = '🔵';
            else if (signal.action === 'STOP_LOSS') signalEmoji = '🛑';
            else if (signal.action === 'HOLD') signalEmoji = '⏸️';
            
            logger.info(`   ${signalEmoji} 信号: ${signal.action} - ${signal.reason}`);
            
            // 检查持仓
            const position = this.strategy.getPosition(pairKey);
          
            if (position) {
              // 有持仓，输出持仓信息
              logger.info(`   💼 持仓状态: ${position.type} (开仓于 ${new Date(position.entryTime).toLocaleString('zh-CN')})`);
              logger.info(`   📌 开仓Z-Score: ${position.entryZScore.toFixed(2)}`);
              
              // 更新持仓
              const updated = this.strategy.updatePosition(
                pairKey,
                currentPrice1,
                currentPrice2,
                currentZScore
              );
              
              if (updated && updated.status === 'CLOSED') {
                logger.info(`   ✅ 平仓信号触发！盈亏: ${updated.pnl > 0 ? '+' : ''}${updated.pnl.toFixed(2)} USDT`);
                
                // 如果启用自动交易，执行真实的平仓订单
                if (this.strategyConfig.autoTrade) {
                  logger.info(`   🤖 自动交易: 执行平仓...`);
                  const closeResult = await this.executeClosePosition(updated);
                  
                  if (!closeResult.success) {
                    logger.error('⚠️  平仓失败，请手动检查持仓！');
                  }
                } else {
                  logger.info(`   ⚠️  自动交易未启用（手动模式）- 需要手动平仓`);
                }
              } else if (updated) {
                const pnlColor = updated.currentPnL >= 0 ? '💚' : '❤️';
                logger.info(`   ${pnlColor} 浮动盈亏: ${updated.currentPnL > 0 ? '+' : ''}${updated.currentPnL.toFixed(2)} USDT (${updated.currentPnLPercent > 0 ? '+' : ''}${updated.currentPnLPercent.toFixed(2)}%)`);
              }
            } else {
              // 无持仓
              logger.info(`   💼 持仓状态: 无持仓`);
              
              // 检查开仓信号
              if (signal.action === 'OPEN_LONG' || signal.action === 'OPEN_SHORT') {
                const capital = this.strategyConfig.tradeAmount || 1000;
                
                logger.info(`   🚨 检测到交易信号！`);
                logger.info(`   💰 计划资金: $${capital}`);
                
                if (this.strategyConfig.autoTrade) {
                  logger.info(`   🤖 自动交易: 执行开仓...`);
                  
                  // 1. 在策略层记录持仓
                  const position = this.strategy.openPosition(
                    pairKey,
                    symbol1,
                    symbol2,
                    signal,
                    currentPrice1,
                    currentPrice2,
                    capital
                  );
                  
                  // 2. 执行真实订单到交易所
                  const result = await this.executeOpenPosition(position, signal);
                  
                  if (!result.success) {
                    // 如果下单失败，回滚策略层的持仓记录
                    logger.error('⚠️  开仓失败，回滚持仓记录...');
                    this.strategy.positions.delete(pairKey);
                  }
                } else {
                  logger.info(`   ⚠️  自动交易未启用（手动模式）`);
                  logger.info(`   💡 提示: 设置 autoTrade: true 启用自动交易`);
                }
              }
            }
            
            logger.info('');
            
            // 避免API限制
            await this.sleep(1000);
            
          } catch (pairError) {
            logger.error(`❌ 处理 ${symbol1}/${symbol2} 时出错: ${pairError.message}`);
            
            // 输出调试信息
            if (pairError.message.includes('Invalid API-key') || pairError.message.includes('permission')) {
              logger.error('');
              logger.error('🔧 可能的解决方法:');
              logger.error('   1. 查询服务器IP: curl ifconfig.me');
              logger.error('   2. 在币安API管理中添加该IP到白名单');
              logger.error('   3. 或者在币安API设置中取消IP限制（降低安全性）');
              logger.error('');
            }
            
            logger.info('');
          }
        }
        
        // 显示统计信息
        const stats = this.strategy.getStatistics();
        logger.info('═'.repeat(60));
        if (stats.totalTrades > 0) {
          logger.info('📊 累计统计:');
          logger.info(`   总交易次数: ${stats.totalTrades}`);
          logger.info(`   胜率: ${stats.winRate.toFixed(1)}%`);
          logger.info(`   总盈亏: ${stats.totalPnL > 0 ? '+' : ''}${stats.totalPnL.toFixed(2)} USDT`);
        } else {
          logger.info('📊 累计统计: 暂无交易记录');
        }
        
        // 等待下一次迭代
        const interval = this.strategyConfig.scanInterval || 60000; // 默认1分钟
        const nextCheckTime = new Date(Date.now() + interval).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
        logger.info(`⏰ 等待 ${Math.round(interval/1000)} 秒后进行下一次检查...`);
        logger.info(`   下次检查时间: ${nextCheckTime}`);
        logger.info('═'.repeat(60));
        
        await this.sleep(interval);
        
      } catch (error) {
        logger.error('主循环错误:', error);
        await this.sleep(5000);
      }
    }
  }

  /**
   * 停止运行
   */
  stop() {
    logger.info('⏹️  停止系统...');
    this.isRunning = false;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 执行开仓订单（真正下单到交易所）
   * @param {Object} position - 持仓信息
   * @param {string} signal - 交易信号
   */
  async executeOpenPosition(position, signal) {
    try {
      logger.info('');
      logger.info('🔄 开始执行开仓订单...');
      logger.info('─'.repeat(60));
      
      const { 
        symbol1, 
        symbol2, 
        quantity1, 
        quantity2, 
        type,
        symbol1Type = 'spot',  // 默认现货
        symbol2Type = 'spot',
        symbol1Side,
        symbol2Side,
        leverage = 1
      } = position;
      
      // 显示交易类型
      if (type === 'OPEN_LONG') {
        logger.info('📊 交易类型: 做多价差');
        logger.info('   策略: 买入低估币种，卖出高估币种');
      } else {
        logger.info('📊 交易类型: 做空价差');
        logger.info('   策略: 卖出高估币种，买入低估币种');
      }
      
      logger.info('');
      logger.info('📝 订单详情:');
      logger.info(`   ${symbol1}: ${symbol1Type === 'future' ? '🔮 合约' : '💵 现货'} ${symbol1Side.toUpperCase()} ${quantity1.toFixed(8)}`);
      if (symbol1Type === 'future') {
        logger.info(`      杠杆: ${leverage}x`);
      }
      logger.info(`   ${symbol2}: ${symbol2Type === 'future' ? '🔮 合约' : '💵 现货'} ${symbol2Side.toUpperCase()} ${quantity2.toFixed(8)}`);
      if (symbol2Type === 'future') {
        logger.info(`      杠杆: ${leverage}x`);
      }
      logger.info('');
      
      // 执行订单
      logger.info('⏳ 提交订单中...');
      
      // Symbol1 订单
      let order1;
      if (symbol1Type === 'future') {
        // 合约订单
        order1 = await this.executeContractOrder(symbol1, symbol1Side, quantity1, leverage);
      } else {
        // 现货订单
        order1 = await this.exchange.createOrder(symbol1, 'market', symbol1Side, quantity1);
      }
      
      logger.info(`✅ ${symbol1} 订单已成交: ${order1.id}`);
      logger.info(`   类型: ${symbol1Type === 'future' ? '合约' : '现货'}`);
      logger.info(`   成交价格: $${order1.price || order1.average || 'N/A'}`);
      logger.info(`   成交数量: ${order1.filled || quantity1}`);
      
      // Symbol2 订单
      let order2;
      if (symbol2Type === 'future') {
        // 合约订单
        order2 = await this.executeContractOrder(symbol2, symbol2Side, quantity2, leverage);
      } else {
        // 现货订单
        order2 = await this.exchange.createOrder(symbol2, 'market', symbol2Side, quantity2);
      }
      
      logger.info(`✅ ${symbol2} 订单已成交: ${order2.id}`);
      logger.info(`   类型: ${symbol2Type === 'future' ? '合约' : '现货'}`);
      logger.info(`   成交价格: $${order2.price || order2.average || 'N/A'}`);
      logger.info(`   成交数量: ${order2.filled || quantity2}`);
      
      logger.info('');
      logger.info('✅ 开仓完成！两腿订单均已执行');
      logger.info('─'.repeat(60));
      logger.info('');
      
      // 保存订单信息到持仓记录
      position.order1 = order1;
      position.order2 = order2;
      
      return { success: true, order1, order2 };
      
    } catch (error) {
      logger.error('❌ 开仓失败:', error.message);
      logger.error('');
      logger.error('⚠️  风险提示:');
      logger.error('   如果只有一个订单成交，请手动检查账户并处理！');
      logger.error('');
      
      return { success: false, error: error.message };
    }
  }

  /**
   * 执行合约订单
   * @param {string} symbol - 交易对
   * @param {string} side - 方向 (buy/sell)
   * @param {number} amount - 数量
   * @param {number} leverage - 杠杆倍数
   */
  async executeContractOrder(symbol, side, amount, leverage = 1) {
    try {
      // 设置杠杆
      if (leverage > 1) {
        await this.exchange.setLeverage(leverage, symbol);
        logger.info(`   设置杠杆: ${symbol} ${leverage}x`);
      }
      
      // 设置为单向持仓模式（如果需要）
      // await this.exchange.setPositionMode(false, symbol); // false = 单向持仓
      
      // 创建合约订单
      const params = {
        type: 'future',  // 永续合约
      };
      
      const order = await this.exchange.createOrder(
        symbol,
        'market',
        side,
        amount,
        null,  // 市价单无需价格
        params
      );
      
      return order;
      
    } catch (error) {
      logger.error(`合约订单失败 [${symbol}]:`, error.message);
      throw error;
    }
  }

  /**
   * 执行平仓订单（真正下单到交易所）
   * @param {Object} position - 持仓信息
   */
  async executeClosePosition(position) {
    try {
      logger.info('');
      logger.info('🔄 开始执行平仓订单...');
      logger.info('─'.repeat(60));
      
      const { 
        symbol1, 
        symbol2, 
        quantity1, 
        quantity2, 
        type,
        symbol1Type = 'spot',
        symbol2Type = 'spot',
        symbol1Side,
        symbol2Side
      } = position;
      
      // 确定平仓方向
      let closeSide1, closeSide2;
      
      if (symbol1Type === 'spot') {
        // 现货：反向操作
        closeSide1 = symbol1Side === 'buy' ? 'sell' : 'buy';
      } else {
        // 合约：平仓（反向开单）
        closeSide1 = symbol1Side === 'buy' ? 'sell' : 'buy';
      }
      
      if (symbol2Type === 'spot') {
        closeSide2 = symbol2Side === 'buy' ? 'sell' : 'buy';
      } else {
        closeSide2 = symbol2Side === 'buy' ? 'sell' : 'buy';
      }
      
      logger.info(`📊 平仓类型: ${type === 'OPEN_LONG' ? '平多价差' : '平空价差'}`);
      logger.info('');
      logger.info('📝 平仓订单:');
      logger.info(`   ${symbol1}: ${symbol1Type === 'future' ? '🔮 合约' : '💵 现货'} ${closeSide1.toUpperCase()} ${quantity1.toFixed(8)}`);
      logger.info(`   ${symbol2}: ${symbol2Type === 'future' ? '🔮 合约' : '💵 现货'} ${closeSide2.toUpperCase()} ${quantity2.toFixed(8)}`);
      logger.info('');
      
      // 执行平仓订单
      logger.info('⏳ 提交平仓订单中...');
      
      // 平仓 symbol1
      let closeOrder1;
      if (symbol1Type === 'future') {
        // 合约平仓：使用reduceOnly参数
        const params = {
          type: 'future',
          reduceOnly: true  // 只平仓，不开新仓
        };
        closeOrder1 = await this.exchange.createOrder(
          symbol1,
          'market',
          closeSide1,
          quantity1,
          null,
          params
        );
      } else {
        // 现货平仓
        closeOrder1 = await this.exchange.createOrder(
          symbol1,
          'market',
          closeSide1,
          quantity1
        );
      }
      
      logger.info(`✅ ${symbol1} 平仓订单已成交: ${closeOrder1.id}`);
      logger.info(`   类型: ${symbol1Type === 'future' ? '合约' : '现货'}`);
      
      // 平仓 symbol2
      let closeOrder2;
      if (symbol2Type === 'future') {
        const params = {
          type: 'future',
          reduceOnly: true
        };
        closeOrder2 = await this.exchange.createOrder(
          symbol2,
          'market',
          closeSide2,
          quantity2,
          null,
          params
        );
      } else {
        closeOrder2 = await this.exchange.createOrder(
          symbol2,
          'market',
          closeSide2,
          quantity2
        );
      }
      
      logger.info(`✅ ${symbol2} 平仓订单已成交: ${closeOrder2.id}`);
      logger.info(`   类型: ${symbol2Type === 'future' ? '合约' : '现货'}`);
      
      logger.info('');
      logger.info('✅ 平仓完成！');
      logger.info('─'.repeat(60));
      logger.info('');
      
      return { success: true, closeOrder1, closeOrder2 };
      
    } catch (error) {
      logger.error('❌ 平仓失败:', error.message);
      logger.error('');
      logger.error('⚠️  风险提示:');
      logger.error('   如果只有一个订单成交，请手动检查账户并处理！');
      logger.error('');
      
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取时间周期对应的毫秒数
   */
  getTimeframeMs(timeframe) {
    const units = {
      'm': 60 * 1000,
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000,
      'w': 7 * 24 * 60 * 60 * 1000
    };
    
    const value = parseInt(timeframe);
    const unit = timeframe.replace(/\d+/, '');
    
    return value * (units[unit] || units['h']);
  }

  /**
   * 计算回测需要的数据点数量
   * @param {string} timeframe - 回测时间周期（如'15m', '1h'）
   * @param {number} hours - 总小时数（如720小时=30天）
   * @returns {number} 需要的K线数量
   */
  calculateBacktestLimit(timeframe, hours) {
    const timeframeMinutes = this.getTimeframeMs(timeframe) / (60 * 1000);
    const totalMinutes = hours * 60;
    const limit = Math.ceil(totalMinutes / timeframeMinutes);
    
    // 限制最大数据点数（防止请求过多）
    // 提高到30000以支持长期回测（约3个月15分钟K线或1年1小时K线）
    const maxLimit = 30000;
    return Math.min(limit, maxLimit);
  }
}

// 主函数
async function main() {
  try {
    const engine = new StatisticalArbitrageEngine(
      config.exchange,
      config.strategy
    );
    
    await engine.initialize();
    
    // 调试：打印所有命令行参数
    logger.info('📋 命令行参数: ' + JSON.stringify(process.argv));
    
    // 检查是否提供了相关性数据文件（支持两种格式）
    let correlationDataFile = null;
    
    // 格式1: --correlation-file=./path/to/file.json
    const correlationFileArg1 = process.argv.find(arg => arg.startsWith('--correlation-file='));
    if (correlationFileArg1) {
      correlationDataFile = correlationFileArg1.split('=')[1];
      logger.info(`✅ 检测到参数格式1: ${correlationDataFile}`);
    }
    
    // 格式2: --correlation-file ./path/to/file.json
    const correlationFileIndex = process.argv.findIndex(arg => arg === '--correlation-file');
    if (correlationFileIndex !== -1 && process.argv[correlationFileIndex + 1]) {
      correlationDataFile = process.argv[correlationFileIndex + 1];
      logger.info(`✅ 检测到参数格式2: ${correlationDataFile}`);
    }
    
    if (!correlationDataFile) {
      logger.warn('⚠️  未检测到 --correlation-file 参数，将重新分析相关性');
    }
    
    // 根据模式运行
    if (process.argv.includes('--backtest')) {
      // 回测模式
      await engine.runBacktest(correlationDataFile);
    } else if (process.argv.includes('--find-pairs')) {
      // 仅寻找配对
      await engine.findPairs();
    } else {
      // 先回测，再实盘
      await engine.runBacktest(correlationDataFile);
      await engine.runLive();
    }
    
    // 优雅退出
    process.on('SIGINT', () => {
      logger.info('\n收到退出信号');
      engine.stop();
      process.exit(0);
    });
    
  } catch (error) {
    logger.error('系统错误:', error);
    process.exit(1);
  }
}

// 运行
// 修复 Windows 路径问题
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const currentFile = fileURLToPath(import.meta.url);
const argFile = resolve(process.argv[1]);

if (currentFile === argFile) {
  main();
}

export { StatisticalArbitrageEngine };

