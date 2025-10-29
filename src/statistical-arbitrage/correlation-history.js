/**
 * 相关性历史分析工具 - 查看配对在过去12个月的相关性变化
 */

import ccxt from 'ccxt';
import dotenv from 'dotenv';
import { DataCollector } from './DataCollector.js';
import { StatisticalAnalyzer } from './StatisticalAnalyzer.js';
import { logger } from '../utils/logger.js';
import config from './config.js';
import fs from 'fs';
import path from 'path';

dotenv.config();

class CorrelationHistoryAnalyzer {
  constructor(symbol1, symbol2, exchangeConfig) {
    this.symbol1 = symbol1;
    this.symbol2 = symbol2;
    this.exchangeConfig = exchangeConfig;
    this.exchange = null;
    this.dataCollector = null;
    this.analyzer = new StatisticalAnalyzer();
  }

  async initialize() {
    logger.info('🔧 初始化相关性历史分析器...');
    
    const ExchangeClass = ccxt[this.exchangeConfig.id];
    const exchangeParams = {
      apiKey: this.exchangeConfig.apiKey,
      secret: this.exchangeConfig.secret,
      enableRateLimit: this.exchangeConfig.enableRateLimit !== false,
      timeout: this.exchangeConfig.timeout || 30000,
      options: this.exchangeConfig.options || {}
    };
    
    if (this.exchangeConfig.httpsProxy) {
      exchangeParams.httpsProxy = this.exchangeConfig.httpsProxy;
      logger.info('📡 使用代理: ' + this.exchangeConfig.httpsProxy);
    }
    
    this.exchange = new ExchangeClass(exchangeParams);
    await this.exchange.loadMarkets();
    
    this.dataCollector = new DataCollector(this.exchange, {
      dataDir: './data/statistical-arbitrage'
    });
    await this.dataCollector.initialize();
    
    logger.info('✅ 初始化完成');
  }

  /**
   * 获取指定月份的数据
   */
  async fetchMonthData(year, month, timeframe = '1h') {
    // 计算月份的开始和结束时间
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    
    const since = startDate.getTime();
    const until = endDate.getTime();
    const days = (until - since) / (1000 * 60 * 60 * 24);
    
    // 计算需要的数据点数
    const timeframeHours = timeframe === '1h' ? 1 : timeframe === '4h' ? 4 : 1;
    const limit = Math.ceil((days * 24) / timeframeHours);
    
    logger.info('📊 获取 ' + year + '年' + month + '月 数据...');
    logger.info('   时间范围: ' + startDate.toLocaleDateString() + ' 至 ' + endDate.toLocaleDateString());
    logger.info('   应有数据: ' + limit + ' 条 (' + days.toFixed(1) + ' 天)');
    
    try {
      // 清除缓存以获取准确的历史数据
      this.dataCollector.clearCache();
      
      // 直接使用交易所API，绕过DataCollector的缓存
      const data1 = await this.fetchOHLCVDirect(this.symbol1, timeframe, limit, since);
      const data2 = await this.fetchOHLCVDirect(this.symbol2, timeframe, limit, since);
      
      const prices1 = data1.map(candle => candle[4]);  // close price
      const prices2 = data2.map(candle => candle[4]);
      
      logger.info('   ✅ 实际获取 ' + prices1.length + ' 条数据 (' + 
                  (limit - prices1.length > 0 ? '缺少 ' + (limit - prices1.length) + ' 条' : '完整') + ')');
      
      return { prices1, prices2, dataPoints: prices1.length };
    } catch (error) {
      logger.error('   ❌ 获取失败: ' + error.message);
      return null;
    }
  }

  /**
   * 直接从交易所获取数据（不使用缓存）
   */
  async fetchOHLCVDirect(symbol, timeframe, limit, since) {
    const maxLimit = 1000;
    let allData = [];
    
    if (limit <= maxLimit) {
      // 一次性获取
      const ohlcv = await this.exchange.fetchOHLCV(symbol, timeframe, since, limit);
      allData = ohlcv || [];
    } else {
      // 分批获取
      let currentSince = since;
      let remainingLimit = limit;
      let batchCount = 0;
      
      while (remainingLimit > 0 && batchCount < 10) {
        const batchLimit = Math.min(remainingLimit, maxLimit);
        const ohlcv = await this.exchange.fetchOHLCV(symbol, timeframe, currentSince, batchLimit);
        
        if (!ohlcv || ohlcv.length === 0) {
          break;
        }
        
        allData = allData.concat(ohlcv);
        remainingLimit -= ohlcv.length;
        batchCount++;
        
        // 更新since为最后一条数据的时间戳 + 1个时间周期
        if (ohlcv.length > 0) {
          const lastTimestamp = ohlcv[ohlcv.length - 1][0];
          const timeframeMs = timeframe === '1h' ? 3600000 : 
                              timeframe === '4h' ? 14400000 : 3600000;
          currentSince = lastTimestamp + timeframeMs;
        }
        
        // 如果返回的数据少于请求的数量，说明没有更多数据了
        if (ohlcv.length < batchLimit) {
          break;
        }
        
        // 避免触发API限速
        await this.sleep(300);
      }
    }
    
    return allData;
  }

  /**
   * 分析过去N个月的相关性
   */
  async analyzeHistory(months = 12, timeframe = '1h') {
    logger.info('');
    logger.info('═'.repeat(60));
    logger.info('📈 相关性历史分析');
    logger.info('═'.repeat(60));
    logger.info('配对: ' + this.symbol1 + ' / ' + this.symbol2);
    logger.info('时间跨度: 过去 ' + months + ' 个月');
    logger.info('时间周期: ' + timeframe);
    logger.info('');
    
    const results = [];
    const now = new Date();
    
    // 从最近的月份往前推
    for (let i = 0; i < months; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth() + 1;
      
      const data = await this.fetchMonthData(year, month, timeframe);
      
      if (data && data.prices1.length > 0 && data.prices2.length > 0) {
        // 计算相关系数
        const correlation = this.analyzer.calculateCorrelation(
          data.prices1,
          data.prices2
        );
        
        results.push({
          year,
          month,
          monthName: year + '年' + month + '月',
          correlation,
          dataPoints: data.dataPoints,
          timestamp: targetDate.getTime()
        });
        
        logger.info('[' + (i + 1) + '/' + months + '] ' + 
                    year + '年' + month + '月: 相关系数 = ' + 
                    correlation.toFixed(3) + 
                    ' (' + data.dataPoints + ' 个数据点)');
      } else {
        logger.warn('[' + (i + 1) + '/' + months + '] ' + 
                    year + '年' + month + '月: 数据获取失败');
      }
      
      // 避免API限速
      await this.sleep(500);
    }
    
    // 按时间正序排列
    results.reverse();
    
    return results;
  }

  /**
   * 计算统计指标
   */
  calculateStatistics(results) {
    if (results.length === 0) return null;
    
    const correlations = results.map(r => r.correlation);
    
    const mean = correlations.reduce((a, b) => a + b, 0) / correlations.length;
    const variance = correlations.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / correlations.length;
    const stdDev = Math.sqrt(variance);
    const min = Math.min(...correlations);
    const max = Math.max(...correlations);
    
    // 计算稳定性评分（标准差越小越稳定）
    const stabilityScore = Math.max(0, 100 - stdDev * 100);
    
    // 判断是否适合配对交易
    const isStable = stdDev < 0.15;  // 标准差 < 0.15 认为稳定
    const isHighCorrelation = mean > 0.7;  // 平均相关性 > 0.7
    const isSuitable = isStable && isHighCorrelation;
    
    return {
      mean,
      stdDev,
      min,
      max,
      range: max - min,
      stabilityScore,
      isStable,
      isHighCorrelation,
      isSuitable
    };
  }

  /**
   * 生成HTML报告
   */
  generateHTMLReport(results, stats) {
    const symbol1Clean = this.symbol1.replace('/', '_');
    const symbol2Clean = this.symbol2.replace('/', '_');
    const filename = 'correlation_history_' + symbol1Clean + '_' + symbol2Clean + '_' + Date.now() + '.html';
    const filepath = path.join('./output', filename);
    
    // 准备图表数据
    const labels = results.map(r => r.monthName);
    const correlations = results.map(r => r.correlation);
    
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>相关性历史分析 - ${this.symbol1} / ${this.symbol2}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      min-height: 100vh;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .header {
      background: white;
      border-radius: 10px;
      padding: 30px;
      margin-bottom: 20px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .header h1 {
      color: #333;
      margin-bottom: 10px;
      font-size: 28px;
    }
    
    .header p {
      color: #666;
      font-size: 14px;
      margin-bottom: 5px;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-bottom: 20px;
    }
    
    .stat-card {
      background: white;
      border-radius: 10px;
      padding: 20px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .stat-card h3 {
      font-size: 14px;
      color: #666;
      margin-bottom: 8px;
    }
    
    .stat-card .value {
      font-size: 28px;
      font-weight: bold;
      color: #333;
    }
    
    .stat-card.good .value {
      color: #10b981;
    }
    
    .stat-card.warning .value {
      color: #f59e0b;
    }
    
    .stat-card.bad .value {
      color: #ef4444;
    }
    
    .chart-container {
      background: white;
      border-radius: 10px;
      padding: 30px;
      margin-bottom: 20px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .chart-container h2 {
      color: #333;
      margin-bottom: 20px;
      font-size: 20px;
    }
    
    .data-table {
      background: white;
      border-radius: 10px;
      padding: 30px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      overflow-x: auto;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
    }
    
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    
    th {
      background: #f3f4f6;
      font-weight: 600;
      color: #333;
    }
    
    tr:hover {
      background: #f9fafb;
    }
    
    .conclusion {
      background: white;
      border-radius: 10px;
      padding: 30px;
      margin-top: 20px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .conclusion h2 {
      color: #333;
      margin-bottom: 15px;
      font-size: 20px;
    }
    
    .conclusion p {
      color: #666;
      line-height: 1.6;
      margin-bottom: 10px;
    }
    
    .badge {
      display: inline-block;
      padding: 5px 10px;
      border-radius: 5px;
      font-size: 12px;
      font-weight: 600;
      margin-left: 10px;
    }
    
    .badge.success {
      background: #d1fae5;
      color: #065f46;
    }
    
    .badge.warning {
      background: #fef3c7;
      color: #92400e;
    }
    
    .badge.danger {
      background: #fee2e2;
      color: #991b1b;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📈 相关性历史分析</h1>
      <p>配对: ${this.symbol1} / ${this.symbol2}</p>
      <p>分析时间: ${new Date().toLocaleString('zh-CN')}</p>
      <p>数据点数: ${results.length} 个月</p>
    </div>

    <div class="stats-grid">
      <div class="stat-card ${stats.mean > 0.7 ? 'good' : stats.mean > 0.5 ? 'warning' : 'bad'}">
        <h3>平均相关系数</h3>
        <div class="value">${stats.mean.toFixed(3)}</div>
      </div>
      
      <div class="stat-card ${stats.stdDev < 0.1 ? 'good' : stats.stdDev < 0.15 ? 'warning' : 'bad'}">
        <h3>标准差</h3>
        <div class="value">${stats.stdDev.toFixed(3)}</div>
      </div>
      
      <div class="stat-card">
        <h3>最小值</h3>
        <div class="value">${stats.min.toFixed(3)}</div>
      </div>
      
      <div class="stat-card">
        <h3>最大值</h3>
        <div class="value">${stats.max.toFixed(3)}</div>
      </div>
      
      <div class="stat-card ${stats.range < 0.2 ? 'good' : stats.range < 0.3 ? 'warning' : 'bad'}">
        <h3>波动范围</h3>
        <div class="value">${stats.range.toFixed(3)}</div>
      </div>
      
      <div class="stat-card ${stats.stabilityScore > 80 ? 'good' : stats.stabilityScore > 60 ? 'warning' : 'bad'}">
        <h3>稳定性评分</h3>
        <div class="value">${stats.stabilityScore.toFixed(0)}</div>
      </div>
    </div>

    <div class="chart-container">
      <h2>📊 相关性变化趋势</h2>
      <canvas id="correlationChart"></canvas>
    </div>

    <div class="data-table">
      <h2>📋 详细数据</h2>
      <table>
        <thead>
          <tr>
            <th>月份</th>
            <th>相关系数</th>
            <th>数据点数</th>
            <th>评价</th>
          </tr>
        </thead>
        <tbody>
          ${results.map(r => `
            <tr>
              <td>${r.monthName}</td>
              <td>${r.correlation.toFixed(3)}</td>
              <td>${r.dataPoints}</td>
              <td>
                ${r.correlation > 0.75 ? '<span class="badge success">强相关</span>' : 
                  r.correlation > 0.6 ? '<span class="badge warning">中等相关</span>' : 
                  '<span class="badge danger">弱相关</span>'}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="conclusion">
      <h2>📝 分析结论</h2>
      <p><strong>相关性稳定性:</strong> ${stats.isStable ? 
        '<span class="badge success">稳定</span> 标准差较小，相关性波动不大' : 
        '<span class="badge warning">不稳定</span> 标准差较大，相关性波动明显'}</p>
      
      <p><strong>相关性强度:</strong> ${stats.isHighCorrelation ? 
        '<span class="badge success">强相关</span> 平均相关系数 > 0.7' : 
        '<span class="badge warning">中等相关</span> 平均相关系数 < 0.7'}</p>
      
      <p><strong>配对交易适合度:</strong> ${stats.isSuitable ? 
        '<span class="badge success">✅ 适合</span> 相关性强且稳定，适合进行配对交易' : 
        '<span class="badge danger">❌ 不太适合</span> 相关性不够强或波动较大，风险较高'}</p>
      
      <p style="margin-top: 20px;"><strong>建议:</strong></p>
      <ul style="margin-left: 20px; color: #666;">
        ${stats.isSuitable ? 
          '<li>该配对相关性稳定，可以考虑用于统计套利策略</li>' : 
          '<li>建议寻找相关性更稳定的配对</li>'}
        ${stats.stdDev > 0.15 ? 
          '<li>⚠️ 相关性波动较大，需要更频繁地监控</li>' : 
          '<li>✅ 相关性波动小，策略较为可靠</li>'}
        ${stats.min < 0.6 ? 
          '<li>⚠️ 某些月份相关性较低，注意市场环境变化</li>' : 
          '<li>✅ 历史上相关性一直保持在较高水平</li>'}
      </ul>
    </div>
  </div>

  <script>
    const ctx = document.getElementById('correlationChart').getContext('2d');
    
    const data = {
      labels: ${JSON.stringify(labels)},
      datasets: [{
        label: '相关系数',
        data: ${JSON.stringify(correlations)},
        borderColor: 'rgb(102, 126, 234)',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.3
      }, {
        label: '平均值',
        data: Array(${results.length}).fill(${stats.mean}),
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false,
        pointRadius: 0
      }, {
        label: '最低要求 (0.75)',
        data: Array(${results.length}).fill(0.75),
        borderColor: 'rgb(239, 68, 68)',
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false,
        pointRadius: 0
      }]
    };
    
    const config = {
      type: 'line',
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'top',
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                label += context.parsed.y.toFixed(3);
                return label;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            min: 0,
            max: 1,
            title: {
              display: true,
              text: '相关系数'
            }
          },
          x: {
            title: {
              display: true,
              text: '月份'
            }
          }
        }
      }
    };
    
    new Chart(ctx, config);
  </script>
</body>
</html>`;

    fs.writeFileSync(filepath, html);
    logger.info('');
    logger.info('📊 HTML报告已生成: ' + filepath);
    
    return filepath;
  }

  /**
   * 打印分析结果
   */
  printResults(results, stats) {
    logger.info('');
    logger.info('═'.repeat(60));
    logger.info('📊 分析结果汇总');
    logger.info('═'.repeat(60));
    logger.info('');
    logger.info('📈 统计指标:');
    logger.info('   平均相关系数: ' + stats.mean.toFixed(3) + (stats.isHighCorrelation ? ' ✅ 强相关' : ' ⚠️ 中等相关'));
    logger.info('   标准差: ' + stats.stdDev.toFixed(3) + (stats.isStable ? ' ✅ 稳定' : ' ⚠️ 波动大'));
    logger.info('   最小值: ' + stats.min.toFixed(3));
    logger.info('   最大值: ' + stats.max.toFixed(3));
    logger.info('   波动范围: ' + stats.range.toFixed(3));
    logger.info('   稳定性评分: ' + stats.stabilityScore.toFixed(0) + '/100');
    logger.info('');
    logger.info('💡 结论:');
    if (stats.isSuitable) {
      logger.info('   ✅ 该配对适合进行统计套利交易');
      logger.info('   - 相关性强且稳定');
      logger.info('   - 可以作为候选配对');
    } else {
      logger.info('   ⚠️ 该配对不太适合统计套利交易');
      if (!stats.isHighCorrelation) {
        logger.info('   - 平均相关性不够高 (< 0.7)');
      }
      if (!stats.isStable) {
        logger.info('   - 相关性波动较大，不够稳定');
      }
    }
    logger.info('');
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 主函数
async function main() {
  try {
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
      logger.info('');
      logger.info('用法: node correlation-history.js <交易对1> <交易对2> [月份数] [时间周期]');
      logger.info('');
      logger.info('示例:');
      logger.info('  node correlation-history.js ETH/USDT BNB/USDT');
      logger.info('  node correlation-history.js ETH/USDT BNB/USDT 12 1h');
      logger.info('  node correlation-history.js SOL/USDT ADA/USDT 6 4h');
      logger.info('');
      logger.info('参数说明:');
      logger.info('  - 交易对1: 第一个交易对（如 ETH/USDT）');
      logger.info('  - 交易对2: 第二个交易对（如 BNB/USDT）');
      logger.info('  - 月份数: 分析的月份数量（默认 12 个月）');
      logger.info('  - 时间周期: K线周期（默认 1h，可选 4h）');
      logger.info('');
      return;
    }
    
    const symbol1 = args[0];
    const symbol2 = args[1];
    const months = parseInt(args[2]) || 12;
    const timeframe = args[3] || '1h';
    
    const analyzer = new CorrelationHistoryAnalyzer(
      symbol1,
      symbol2,
      config.exchange
    );
    
    await analyzer.initialize();
    
    const results = await analyzer.analyzeHistory(months, timeframe);
    
    if (results.length === 0) {
      logger.error('没有获取到有效数据');
      return;
    }
    
    const stats = analyzer.calculateStatistics(results);
    analyzer.printResults(results, stats);
    analyzer.generateHTMLReport(results, stats);
    
    logger.info('✅ 分析完成！');
    logger.info('');
    
  } catch (error) {
    logger.error('相关性历史分析失败:', error);
    throw error;
  }
}

main();

