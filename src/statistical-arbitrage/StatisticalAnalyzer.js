/**
 * 统计分析器 - 计算相关性、协整性、Z-score等
 */

import { logger } from '../utils/logger.js';

export class StatisticalAnalyzer {
  constructor(config = {}) {
    this.config = config;
    this.minCorrelation = config.minCorrelation || 0.7; // 最小相关系数
    this.lookbackPeriod = config.lookbackPeriod || 100; // 回看周期
  }

  /**
   * 计算两个序列的相关系数
   */
  calculateCorrelation(series1, series2) {
    if (series1.length !== series2.length) {
      throw new Error('序列长度不匹配');
    }

    const n = series1.length;
    const mean1 = this.mean(series1);
    const mean2 = this.mean(series2);

    let numerator = 0;
    let denominator1 = 0;
    let denominator2 = 0;

    for (let i = 0; i < n; i++) {
      const diff1 = series1[i] - mean1;
      const diff2 = series2[i] - mean2;
      
      numerator += diff1 * diff2;
      denominator1 += diff1 * diff1;
      denominator2 += diff2 * diff2;
    }

    if (denominator1 === 0 || denominator2 === 0) {
      return 0;
    }

    return numerator / Math.sqrt(denominator1 * denominator2);
  }

  /**
   * 计算相关性矩阵
   */
  calculateCorrelationMatrix(priceMatrix) {
    const symbols = Object.keys(priceMatrix);
    const matrix = {};

    for (let i = 0; i < symbols.length; i++) {
      const symbol1 = symbols[i];
      matrix[symbol1] = {};

      for (let j = 0; j < symbols.length; j++) {
        const symbol2 = symbols[j];
        
        if (i === j) {
          matrix[symbol1][symbol2] = 1.0;
        } else {
          const correlation = this.calculateCorrelation(
            priceMatrix[symbol1],
            priceMatrix[symbol2]
          );
          matrix[symbol1][symbol2] = correlation;
        }
      }
    }

    return matrix;
  }

  /**
   * 找出高相关性的交易对
   * @param {Object} correlationMatrix - 相关性矩阵
   * @param {number} threshold - 最小相关性阈值
   * @param {Object} correlationStability - 相关性稳定性矩阵（标准差）
   * @param {number} maxStability - 最大标准差阈值（σ < maxStability = 稳定）
   */
  findHighlyCorrelatedPairs(correlationMatrix, threshold = null, correlationStability = null, maxStability = null) {
    threshold = threshold || this.minCorrelation;
    const pairs = [];
    const symbols = Object.keys(correlationMatrix);
    const processed = new Set();
    
    let filteredByStability = 0;  // 因稳定性不足被过滤的配对数

    for (let i = 0; i < symbols.length; i++) {
      for (let j = i + 1; j < symbols.length; j++) {
        const symbol1 = symbols[i];
        const symbol2 = symbols[j];
        const pairKey = `${symbol1}_${symbol2}`;

        if (processed.has(pairKey)) continue;

        const correlation = correlationMatrix[symbol1][symbol2];

        // 筛选条件1：相关性阈值
        if (Math.abs(correlation) >= threshold) {
          // 筛选条件2：稳定性阈值（如果提供）
          let passStabilityCheck = true;
          let stability = null;
          
          if (correlationStability && maxStability !== null) {
            stability = correlationStability[symbol1]?.[symbol2];
            if (stability !== undefined && stability > maxStability) {
              passStabilityCheck = false;
              filteredByStability++;
            }
          }
          
          if (passStabilityCheck) {
            pairs.push({
              pair: [symbol1, symbol2],
              correlation: correlation,
              absCorrelation: Math.abs(correlation),
              stability: stability  // 添加稳定性信息
            });
            processed.add(pairKey);
          }
        }
      }
    }

    // 如果启用了稳定性筛选，记录日志
    if (correlationStability && maxStability !== null && filteredByStability > 0) {
      logger.info(`🔍 稳定性筛选: 过滤掉 ${filteredByStability} 个不稳定配对 (σ > ${maxStability})`);
    }

    // 按相关性绝对值排序
    return pairs.sort((a, b) => b.absCorrelation - a.absCorrelation);
  }

  /**
   * 简单的协整性检验（使用价格比率的标准差）
   */
  calculateCointegration(series1, series2) {
    // 计算价格比率
    const ratios = [];
    for (let i = 0; i < series1.length; i++) {
      if (series2[i] !== 0) {
        ratios.push(series1[i] / series2[i]);
      }
    }

    const meanRatio = this.mean(ratios);
    const stdRatio = this.standardDeviation(ratios);
    
    // 计算变异系数（CV），越小说明协整性越好
    const cv = stdRatio / meanRatio;

    return {
      meanRatio,
      stdRatio,
      cv,
      isCointegrated: cv < 0.1 // 变异系数小于0.1认为是协整的
    };
  }

  /**
   * 归一化价格序列（以第一个价格为基准）
   * @param {Array} series - 价格序列
   * @returns {Array} 归一化后的序列（起始值为1）
   */
  normalizePrices(series) {
    if (!series || series.length === 0) {
      return [];
    }
    
    const firstPrice = series[0];
    if (firstPrice === 0) {
      logger.warn('⚠️  初始价格为0，无法归一化');
      return series;
    }
    
    return series.map(price => price / firstPrice);
  }

  /**
   * 计算价差（Spread）
   */
  calculateSpread(series1, series2, method = 'normalized_ratio') {
    const spread = [];
    
    // ✨ 新增：归一化方法 - 解决初始价差大导致Z-Score失效的问题
    if (method === 'normalized_ratio') {
      // 将两个价格序列都归一化到初始价格（起始值为1）
      const normalized1 = this.normalizePrices(series1);
      const normalized2 = this.normalizePrices(series2);
      
      // 计算归一化后的价格比率
      for (let i = 0; i < normalized1.length; i++) {
        spread.push(normalized2[i] !== 0 ? normalized1[i] / normalized2[i] : 1);
      }
      
      return spread;
    }

    // 原有方法
    for (let i = 0; i < series1.length; i++) {
      if (method === 'ratio') {
        // 价格比率（原始方法）
        spread.push(series2[i] !== 0 ? series1[i] / series2[i] : 0);
      } else if (method === 'difference') {
        // 价格差值
        spread.push(series1[i] - series2[i]);
      } else if (method === 'log') {
        // 对数价格差
        if (series1[i] > 0 && series2[i] > 0) {
          spread.push(Math.log(series1[i]) - Math.log(series2[i]));
        } else {
          spread.push(0);
        }
      }
    }

    return spread;
  }

  /**
   * 计算Z-Score
   * ⚠️ 关键修复：使用不包含当前点的历史窗口来计算均值和标准差
   * 这样Z-score才能真实反映当前值相对于历史的偏离程度
   */
  calculateZScore(series, lookback = null) {
    lookback = lookback || this.lookbackPeriod;
    const zScores = [];

    for (let i = 0; i < series.length; i++) {
      // 需要至少lookback个历史点才能计算Z-score
      if (i < lookback) {
        zScores.push(0);
        continue;
      }

      // ⚠️ 修复：使用不包含当前点的历史窗口 [i-lookback, i)
      // 这样计算出的均值和标准差是纯历史数据，当前点的Z-score才准确
      const window = series.slice(i - lookback, i);
      const mean = this.mean(window);
      const std = this.standardDeviation(window);

      const zScore = std !== 0 ? (series[i] - mean) / std : 0;
      zScores.push(zScore);
    }

    return zScores;
  }

  /**
   * 计算移动平均
   */
  calculateMovingAverage(series, period) {
    const ma = [];

    for (let i = 0; i < series.length; i++) {
      if (i < period - 1) {
        ma.push(null);
      } else {
        const window = series.slice(i - period + 1, i + 1);
        ma.push(this.mean(window));
      }
    }

    return ma;
  }

  /**
   * 计算布林带
   */
  calculateBollingerBands(series, period = 20, stdDev = 2) {
    const ma = this.calculateMovingAverage(series, period);
    const upper = [];
    const lower = [];

    for (let i = 0; i < series.length; i++) {
      if (i < period - 1) {
        upper.push(null);
        lower.push(null);
      } else {
        const window = series.slice(i - period + 1, i + 1);
        const std = this.standardDeviation(window);
        
        upper.push(ma[i] + stdDev * std);
        lower.push(ma[i] - stdDev * std);
      }
    }

    return { upper, middle: ma, lower };
  }

  /**
   * 统计工具函数
   */
  mean(series) {
    return series.reduce((sum, val) => sum + val, 0) / series.length;
  }

  standardDeviation(series) {
    const mean = this.mean(series);
    const squareDiffs = series.map(value => Math.pow(value - mean, 2));
    const avgSquareDiff = this.mean(squareDiffs);
    return Math.sqrt(avgSquareDiff);
  }

  variance(series) {
    return Math.pow(this.standardDeviation(series), 2);
  }

  /**
   * 生成统计报告
   */
  generateReport(symbol1, symbol2, prices1, prices2) {
    const correlation = this.calculateCorrelation(prices1, prices2);
    const cointegration = this.calculateCointegration(prices1, prices2);
    const spread = this.calculateSpread(prices1, prices2, 'ratio');
    const zScores = this.calculateZScore(spread);
    const currentZScore = zScores[zScores.length - 1];

    return {
      pair: [symbol1, symbol2],
      correlation,
      cointegration,
      spread: {
        current: spread[spread.length - 1],
        mean: this.mean(spread),
        std: this.standardDeviation(spread)
      },
      zScore: {
        current: currentZScore,
        series: zScores
      },
      signal: this.generateSignal(currentZScore)
    };
  }

  /**
   * 生成交易信号
   */
  generateSignal(zScore, entryThreshold = 2, exitThreshold = 0.5) {
    if (zScore > entryThreshold) {
      return 'SHORT'; // 做空价差（卖出symbol1，买入symbol2）
    } else if (zScore < -entryThreshold) {
      return 'LONG';  // 做多价差（买入symbol1，卖出symbol2）
    } else if (Math.abs(zScore) < exitThreshold) {
      return 'EXIT';  // 平仓
    }
    return 'HOLD';    // 持有
  }

  /**
   * 半衰期计算（用于确定回归速度）
   */
  calculateHalfLife(spread) {
    // 简化版本：使用AR(1)模型
    const lagSpread = spread.slice(0, -1);
    const currentSpread = spread.slice(1);
    
    let sumXY = 0;
    let sumXX = 0;
    
    for (let i = 0; i < lagSpread.length; i++) {
      sumXY += lagSpread[i] * currentSpread[i];
      sumXX += lagSpread[i] * lagSpread[i];
    }
    
    const beta = sumXY / sumXX;
    const halfLife = -Math.log(2) / Math.log(beta);
    
    return halfLife;
  }
}

