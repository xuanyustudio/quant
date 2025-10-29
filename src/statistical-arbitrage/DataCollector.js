/**
 * 数据收集器 - 获取和存储历史价格数据
 */

import { logger } from '../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';

export class DataCollector {
  constructor(exchange, config) {
    this.exchange = exchange;
    this.config = config;
    this.dataDir = config.dataDir || './data';
    this.cache = new Map();
  }

  /**
   * 初始化数据目录
   */
  async initialize() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      logger.info('✅ 数据目录已就绪');
    } catch (error) {
      logger.error('创建数据目录失败:', error);
    }
  }

  /**
   * 获取历史K线数据
   * @param {string} symbol - 交易对，如 'BTC/USDT'
   * @param {string} timeframe - 时间周期，如 '1h', '1d'
   * @param {number} limit - 获取数量
   * @param {number} since - 开始时间戳
   * @param {boolean} useCache - 是否使用缓存（默认true）
   */
  async fetchOHLCV(symbol, timeframe = '1h', limit = 500, since = null, useCache = true) {
    try {
      logger.info(`📊 获取 ${symbol} ${timeframe} K线数据...`);
      
      // 改进缓存key，包含时间范围参数
      const cacheKey = `${symbol}_${timeframe}_${limit}_${since || 'latest'}`;
      
      // 检查缓存（只在useCache=true时）
      if (useCache && this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        const cacheAge = Date.now() - cached.timestamp;
        
        // 缓存有效期根据时间周期决定
        const maxAge = this.getMaxCacheAge(timeframe);
        
        if (cacheAge < maxAge) {
          logger.debug(`使用缓存数据: ${symbol} ${timeframe}`);
          return cached.data;
        }
      }

      // 交易所单次最大limit（binance最大1000）
      const maxLimit = 1000;
      let allData = [];
      
      // 🔧 修复：如果since为null/undefined，计算一个合理的起始时间
      let startTime = since;
      if (!startTime) {
        // 根据limit和timeframe计算起始时间
        const timeframeMs = this.getTimeframeMs(timeframe);
        startTime = Date.now() - (limit * timeframeMs);
        logger.debug(`自动计算起始时间: ${new Date(startTime).toISOString()}`);
      }
      
      if (limit <= maxLimit) {
        // 一次性获取
        const ohlcv = await this.exchange.fetchOHLCV(symbol, timeframe, startTime, limit);
        allData = ohlcv;
      } else {
        // 分批获取（需要超过1000条数据时）
        let currentSince = startTime;
        let remainingLimit = limit;
        let batchCount = 0;
        const maxBatches = 50; // 提高到50批，支持更长时间回测（50,000条数据点）
        
        while (remainingLimit > 0 && batchCount < maxBatches) {
          const batchLimit = Math.min(remainingLimit, maxLimit);
          const ohlcv = await this.exchange.fetchOHLCV(symbol, timeframe, currentSince, batchLimit);
          
          if (!ohlcv || ohlcv.length === 0) {
            logger.info(`   批次 ${batchCount + 1}: 没有更多数据，停止获取`);
            break;  // 没有更多数据
          }
          
          allData = allData.concat(ohlcv);
          remainingLimit -= ohlcv.length;
          batchCount++;
          
          // 每5批显示一次进度，避免日志过多
          if (batchCount % 5 === 0 || batchCount === 1) {
            logger.info(`   批次 ${batchCount}: 获取 ${ohlcv.length} 条，累计 ${allData.length} 条`);
          }
          
          // 更新since为最后一条数据的时间戳 + 1个时间周期
          if (ohlcv.length > 0) {
            const lastTimestamp = ohlcv[ohlcv.length - 1][0];
            const timeframeMs = this.getTimeframeMs(timeframe);
            currentSince = lastTimestamp + timeframeMs;
          }
          
          // 如果返回的数据少于请求的数量，说明没有更多数据了
          if (ohlcv.length < batchLimit) {
            logger.info(`   批次 ${batchCount}: 获取完成，到达数据边界`);
            break;
          }
          
          // 避免触发API限速
          await this.sleep(300);
        }
        
        if (batchCount >= maxBatches) {
          logger.warn(`⚠️  达到最大批次限制 (${maxBatches}批)，可能未获取所有请求的数据`);
        }
      }
      
      // 转换为更易用的格式
      const data = allData.map(candle => ({
        timestamp: candle[0],
        open: candle[1],
        high: candle[2],
        low: candle[3],
        close: candle[4],
        volume: candle[5]
      }));

      // 更新缓存（只在useCache=true时）
      if (useCache) {
        this.cache.set(cacheKey, {
          data,
          timestamp: Date.now()
        });
      }

      logger.info(`✅ 获取 ${data.length} 条数据`);
      return data;

    } catch (error) {
      logger.error(`获取K线数据失败 [${symbol}]:`, error.message);
      
      // 输出更详细的错误信息用于调试
      if (error.name === 'AuthenticationError') {
        logger.error('   原因: API认证失败');
        logger.error('   请检查: 1) API密钥是否正确  2) 服务器IP是否在白名单中');
      } else if (error.name === 'NetworkError') {
        logger.error('   原因: 网络连接失败');
        logger.error('   请检查: 1) 网络连接  2) 代理设置');
      } else if (error.message.includes('Invalid API-key')) {
        logger.error('   原因: API密钥无效或IP不在白名单中');
        logger.error('   解决方法: 运行 node check-my-ip.js 查询IP，然后在币安添加到白名单');
      } else if (error.message.includes('permission')) {
        logger.error('   原因: API权限不足');
        logger.error('   解决方法: 确保API开启了"读取"和"现货交易"权限');
      } else {
        logger.error('   完整错误:', error);
      }
      
      throw error;
    }
  }
  
  /**
   * 获取时间周期对应的毫秒数
   */
  getTimeframeMs(timeframe) {
    const units = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '2h': 2 * 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '12h': 12 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '1w': 7 * 24 * 60 * 60 * 1000
    };
    return units[timeframe] || 60 * 60 * 1000;
  }

  /**
   * 获取多个交易对的历史数据
   */
  async fetchMultipleOHLCV(symbols, timeframe = '1h', limit = 500, since = null) {
    const results = {};
    
    for (const symbol of symbols) {
      try {
        results[symbol] = await this.fetchOHLCV(symbol, timeframe, limit, since);
        // 避免触发API限制
        await this.sleep(100);
      } catch (error) {
        logger.error(`获取 ${symbol} 数据失败:`, error.message);
        results[symbol] = null;
      }
    }

    return results;
  }

  /**
   * 保存数据到文件
   */
  async saveToFile(symbol, timeframe, data) {
    try {
      const filename = `${symbol.replace('/', '_')}_${timeframe}.json`;
      const filepath = path.join(this.dataDir, filename);
      
      await fs.writeFile(filepath, JSON.stringify(data, null, 2));
      logger.info(`💾 数据已保存: ${filename}`);
      
    } catch (error) {
      logger.error('保存数据失败:', error);
    }
  }

  /**
   * 从文件加载数据
   */
  async loadFromFile(symbol, timeframe) {
    try {
      const filename = `${symbol.replace('/', '_')}_${timeframe}.json`;
      const filepath = path.join(this.dataDir, filename);
      
      const content = await fs.readFile(filepath, 'utf-8');
      const data = JSON.parse(content);
      
      logger.info(`📂 从文件加载数据: ${filename}`);
      return data;
      
    } catch (error) {
      logger.debug(`无法加载文件数据: ${error.message}`);
      return null;
    }
  }

  /**
   * 获取收盘价序列
   */
  getClosePrices(data) {
    return data.map(candle => candle.close);
  }

  /**
   * 获取时间序列的价格矩阵
   */
  getPriceMatrix(multipleData) {
    const matrix = {};
    const timestamps = [];
    
    // 获取所有交易对的时间戳
    const allTimestamps = new Set();
    for (const symbol in multipleData) {
      if (multipleData[symbol]) {
        multipleData[symbol].forEach(candle => {
          allTimestamps.add(candle.timestamp);
        });
      }
    }
    
    // 排序时间戳
    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);
    
    // 构建价格矩阵
    for (const symbol in multipleData) {
      if (!multipleData[symbol]) continue;
      
      const priceMap = new Map();
      multipleData[symbol].forEach(candle => {
        priceMap.set(candle.timestamp, candle.close);
      });
      
      matrix[symbol] = sortedTimestamps.map(ts => priceMap.get(ts) || null);
    }
    
    return {
      timestamps: sortedTimestamps,
      prices: matrix
    };
  }

  /**
   * 获取缓存最大年龄
   */
  getMaxCacheAge(timeframe) {
    const ageMap = {
      '1m': 60 * 1000,           // 1分钟
      '5m': 5 * 60 * 1000,       // 5分钟
      '15m': 15 * 60 * 1000,     // 15分钟
      '1h': 60 * 60 * 1000,      // 1小时
      '4h': 4 * 60 * 60 * 1000,  // 4小时
      '1d': 24 * 60 * 60 * 1000  // 1天
    };
    
    return ageMap[timeframe] || 60 * 60 * 1000;
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.cache.clear();
    logger.info('缓存已清除');
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

