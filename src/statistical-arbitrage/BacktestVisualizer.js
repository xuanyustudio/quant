/**
 * 回测可视化工具
 * 生成交互式图表展示回测结果
 */

import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';

export default class BacktestVisualizer {
  constructor(outputDir = './output') {
    this.outputDir = outputDir;
    
    // 确保输出目录存在
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * 生成回测结果的可视化图表
   * @param {string} symbol1 - 第一个交易对
   * @param {string} symbol2 - 第二个交易对
   * @param {Array} prices1 - 价格数据1
   * @param {Array} prices2 - 价格数据2
   * @param {Array} timestamps - 时间戳数组
   * @param {Array} trades - 交易记录
   * @param {Object} summary - 回测摘要
   */
  generateChart(symbol1, symbol2, prices1, prices2, timestamps, trades, summary) {
    const pairName = `${symbol1.replace('/', '_')}_${symbol2.replace('/', '_')}`;
    const filename = `backtest_${pairName}_${Date.now()}.html`;
    const filepath = path.join(this.outputDir, filename);

    // 准备数据（包括价差和Z-score）
    const chartData = this.prepareChartData(
      symbol1, symbol2, prices1, prices2, timestamps, trades, summary
    );

    // 生成HTML
    const html = this.generateHTML(symbol1, symbol2, chartData, trades, summary);

    // 保存文件
    fs.writeFileSync(filepath, html, 'utf-8');
    
    logger.info(`📊 图表已生成: ${filepath}`);
    return { filepath, filename };  // 返回完整路径和文件名
  }

  /**
   * 准备图表数据（包括价差和Z-score）
   */
  prepareChartData(symbol1, symbol2, prices1, prices2, timestamps, trades, summary) {
    // 格式化时间
    const labels = timestamps.map(ts => {
      const date = new Date(ts);
      return date.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    });

    // 对价格进行归一化处理，让两个交易对从相同的起点（100）开始
    const baseValue = 100;
    const basePrice1 = prices1[0];
    const basePrice2 = prices2[0];
    
    const normalizedPrices1 = prices1.map(p => (p / basePrice1) * baseValue);
    const normalizedPrices2 = prices2.map(p => (p / basePrice2) * baseValue);

    // 计算价差（Spread = normalized_price1 / normalized_price2）
    const spread = normalizedPrices1.map((p1, i) => p1 / normalizedPrices2[i]);
    
    // 计算Z-score（需要使用回看窗口）
    const lookback = summary.strategyParams?.lookbackPeriod || 100;
    const zScores = [];
    const correlations = []; // 相关性序列
    const warmupEndIndex = lookback; // 预热期结束的索引
    
    for (let i = 0; i < spread.length; i++) {
      if (i < lookback) {
        zScores.push(null);  // 预热期内，数据不足，用null
        correlations.push(null);
      } else {
        // 计算Z-score
        const window = spread.slice(i - lookback, i);
        const mean = this.mean(window);
        const std = this.standardDeviation(window);
        const zScore = std !== 0 ? (spread[i] - mean) / std : 0;
        zScores.push(zScore);
        
        // 计算相关性（使用原始价格，不是归一化价格）
        const priceWindow1 = prices1.slice(i - lookback, i + 1);
        const priceWindow2 = prices2.slice(i - lookback, i + 1);
        const correlation = this.calculateCorrelation(priceWindow1, priceWindow2);
        correlations.push(correlation);
      }
    }

    // 提取开仓和平仓点（也需要归一化）
    const openPoints1 = [];
    const openPoints2 = [];
    const closePoints1 = [];
    const closePoints2 = [];

    trades.forEach(trade => {
      const openIdx = timestamps.indexOf(trade.entryTime);
      const closeIdx = timestamps.indexOf(trade.exitTime);

      if (openIdx !== -1) {
        openPoints1.push({
          x: labels[openIdx],
          y: (trade.entryPrice1 / basePrice1) * baseValue,
          actualPrice: trade.entryPrice1,
          type: trade.type,
          trade: trade
        });
        openPoints2.push({
          x: labels[openIdx],
          y: (trade.entryPrice2 / basePrice2) * baseValue,
          actualPrice: trade.entryPrice2,
          type: trade.type,
          trade: trade
        });
      }

      if (closeIdx !== -1) {
        closePoints1.push({
          x: labels[closeIdx],
          y: (trade.exitPrice1 / basePrice1) * baseValue,
          actualPrice: trade.exitPrice1,
          pnl: trade.pnl,
          trade: trade
        });
        closePoints2.push({
          x: labels[closeIdx],
          y: (trade.exitPrice2 / basePrice2) * baseValue,
          actualPrice: trade.exitPrice2,
          pnl: trade.pnl,
          trade: trade
        });
      }
    });

    return {
      labels,
      prices1: normalizedPrices1,
      prices2: normalizedPrices2,
      spread,  // 价差序列
      zScores, // Z-score序列
      correlations, // 相关性序列
      warmupEndIndex, // 预热期结束索引
      openPoints1,
      openPoints2,
      closePoints1,
      closePoints2,
      basePrice1,  // 保存基准价格，用于tooltip显示
      basePrice2
    };
  }

  /**
   * 计算相关系数
   */
  calculateCorrelation(series1, series2) {
    if (series1.length !== series2.length || series1.length === 0) {
      return 0;
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
   * 计算均值
   */
  mean(series) {
    return series.reduce((sum, val) => sum + val, 0) / series.length;
  }

  /**
   * 计算标准差
   */
  standardDeviation(series) {
    const mean = this.mean(series);
    const squareDiffs = series.map(value => Math.pow(value - mean, 2));
    const avgSquareDiff = this.mean(squareDiffs);
    return Math.sqrt(avgSquareDiff);
  }

  /**
   * 生成HTML文件
   */
  generateHTML(symbol1, symbol2, data, trades, summary) {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>回测结果 - ${symbol1} vs ${symbol2}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation@3.0.1/dist/chartjs-plugin-annotation.min.js"></script>
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
      max-width: 1400px;
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
    }
    
    .params-section {
      margin-bottom: 20px;
    }
    
    .params-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 15px;
    }
    
    .param-card {
      background: rgba(255, 255, 255, 0.95);
      border-radius: 10px;
      padding: 15px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      border-left: 4px solid #f59e0b;
    }
    
    .param-card h3 {
      font-size: 12px;
      color: #666;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .param-card .value {
      font-size: 20px;
      font-weight: bold;
      color: #f59e0b;
      margin-bottom: 4px;
    }
    
    .param-card .param-desc {
      font-size: 11px;
      color: #999;
      font-style: italic;
    }
    
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-bottom: 20px;
    }
    
    .summary-card {
      background: white;
      border-radius: 10px;
      padding: 20px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .summary-card h3 {
      font-size: 14px;
      color: #666;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .summary-card .value {
      font-size: 24px;
      font-weight: bold;
      color: #333;
    }
    
    .summary-card .positive {
      color: #10b981;
    }
    
    .summary-card .negative {
      color: #ef4444;
    }
    
    .chart-container {
      background: white;
      border-radius: 10px;
      padding: 30px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      margin-bottom: 20px;
    }
    
    .chart-container h2 {
      color: #333;
      margin-bottom: 20px;
      font-size: 18px;
    }
    
    .chart-wrapper {
      position: relative;
      height: 500px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    
    th {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 8px 6px;
      text-align: center;
      font-weight: 600;
      white-space: nowrap;
      font-size: 11px;
    }
    
    td {
      padding: 6px 8px;
      border-bottom: 1px solid #e5e7eb;
      text-align: center;
      font-size: 11px;
    }
    
    tbody tr:hover {
      background: #f9fafb;
    }
    
    .positive-pnl {
      color: #10b981;
      font-weight: 600;
    }
    
    .negative-pnl {
      color: #ef4444;
      font-weight: 600;
    }
    
    .trade-type-long {
      background: #d1fae5;
      color: #065f46;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }
    
    .trade-type-short {
      background: #fee2e2;
      color: #991b1b;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }
    
    .legend {
      display: flex;
      gap: 20px;
      margin-top: 15px;
      flex-wrap: wrap;
    }
    
    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: #666;
    }
    
    .legend-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }
    
    .legend-triangle {
      width: 0;
      height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-bottom: 10px solid;
    }
    
    .footer {
      text-align: center;
      color: white;
      margin-top: 30px;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- 头部 -->
    <div class="header">
      <h1>📊 统计套利回测结果</h1>
      <p>${symbol1} ↔ ${symbol2} | 生成时间: ${new Date().toLocaleString('zh-CN')}</p>
    </div>

    <!-- 摘要卡片 -->
    <!-- 策略参数配置 -->
    <div class="params-section">
      <h2 style="color: white; margin-bottom: 15px; font-size: 18px;">⚙️ 策略参数配置</h2>
      <div class="params-grid">
        <div class="param-card">
          <h3>开仓阈值</h3>
          <div class="value">${summary.strategyParams?.entryThreshold || 'N/A'}</div>
          <p class="param-desc">Entry Z-Score</p>
        </div>
        <div class="param-card">
          <h3>平仓阈值</h3>
          <div class="value">${summary.strategyParams?.exitThreshold || 'N/A'}</div>
          <p class="param-desc">Exit Z-Score</p>
        </div>
        <div class="param-card">
          <h3>止损阈值</h3>
          <div class="value">${summary.strategyParams?.stopLossThreshold || 'N/A'}</div>
          <p class="param-desc">Stop Loss Z-Score</p>
        </div>
        <div class="param-card">
          <h3>仓位比例</h3>
          <div class="value">${summary.strategyParams?.positionSize ? (summary.strategyParams.positionSize * 100).toFixed(0) + '%' : 'N/A'}</div>
          <p class="param-desc">Position Size</p>
        </div>
        <div class="param-card">
          <h3>初始资金</h3>
          <div class="value">${summary.strategyParams?.initialCapital || 'N/A'} USDT</div>
          <p class="param-desc">Initial Capital</p>
        </div>
      </div>
    </div>
    
    <!-- 回测结果汇总 -->
    <div class="summary">
      <div class="summary-card">
        <h3>总收益率</h3>
        <div class="value ${summary.totalReturn >= 0 ? 'positive' : 'negative'}">
          ${summary.totalReturn >= 0 ? '+' : ''}${summary.totalReturn.toFixed(2)}%
        </div>
      </div>
      
      <div class="summary-card">
        <h3>胜率</h3>
        <div class="value">${summary.winRate.toFixed(1)}%</div>
      </div>
      
      <div class="summary-card">
        <h3>交易次数</h3>
        <div class="value">${summary.totalTrades}</div>
      </div>
      
      <div class="summary-card">
        <h3>夏普比率</h3>
        <div class="value">${summary.sharpeRatio.toFixed(2)}</div>
      </div>
      
      <div class="summary-card">
        <h3>相关系数</h3>
        <div class="value">${summary.correlation ? summary.correlation.toFixed(3) : 'N/A'}</div>
      </div>
      
      <div class="summary-card">
        <h3>最大回撤</h3>
        <div class="value negative">${summary.maxDrawdown.toFixed(2)}%</div>
      </div>
      
      <div class="summary-card">
        <h3>最终资金</h3>
        <div class="value">${summary.finalCapital.toFixed(2)} USDT</div>
      </div>
    </div>

    <!-- 合并图表: 两个交易对 -->
    <div class="chart-container">
      <h2>📈 价格走势与交易点 - ${symbol1} & ${symbol2}</h2>
      <p style="color: #666; font-size: 13px; margin-bottom: 15px;">
        ℹ️ 价格已归一化处理，起始值均为100，便于比较相对走势。鼠标悬停可查看实际价格。
      </p>
      <div class="chart-wrapper" style="height: 600px;">
        <canvas id="combinedChart"></canvas>
      </div>
      <div class="legend">
        <div class="legend-item">
          <div class="legend-dot" style="background: #3b82f6;"></div>
          <span>${symbol1} 价格（归一化）</span>
        </div>
        <div class="legend-item">
          <div class="legend-dot" style="background: #f59e0b;"></div>
          <span>${symbol2} 价格（归一化）</span>
        </div>
        <div class="legend-item">
          <div class="legend-triangle" style="border-bottom-color: #10b981;"></div>
          <span>开仓（做多价差）</span>
        </div>
        <div class="legend-item">
          <div class="legend-triangle" style="border-bottom-color: #ef4444; transform: rotate(180deg);"></div>
          <span>开仓（做空价差）</span>
        </div>
        <div class="legend-item">
          <div class="legend-dot" style="background: #8b5cf6;"></div>
          <span>平仓点</span>
        </div>
      </div>
    </div>

    <!-- Z-Score图表 -->
    <div class="chart-container">
      <h2>📊 Z-Score 走势</h2>
      <p style="color: #666; font-size: 13px; margin-bottom: 15px;">
        ℹ️ Z-score 衡量当前价差相对于历史均值的偏离程度（标准差倍数）。大于阈值时开仓，回归到接近0时平仓。
      </p>
      <p style="color: #f59e0b; font-size: 12px; margin-bottom: 10px; background: #fef3c7; padding: 8px; border-radius: 5px;">
        ⚠️ <strong>预热期</strong>：图表灰色区域为前${summary.strategyParams?.lookbackPeriod || 100}个数据点的预热期，用于建立统计基线，不产生交易信号。
      </p>
      <div class="chart-wrapper" style="height: 350px;">
        <canvas id="zscoreChart"></canvas>
      </div>
      <div style="margin-top: 15px; font-size: 12px; color: #666;">
        <div style="display: flex; gap: 20px; flex-wrap: wrap;">
          <div>🟢 开仓阈值: ±${summary.strategyParams?.entryThreshold || 'N/A'}</div>
          <div>🟡 平仓阈值: ±${summary.strategyParams?.exitThreshold || 'N/A'}</div>
          <div>🔴 止损阈值: ±${summary.strategyParams?.stopLossThreshold || 'N/A'}</div>
          <div>⏳ 预热期: ${summary.strategyParams?.lookbackPeriod || 100}个数据点</div>
        </div>
      </div>
    </div>

    <!-- 价差图表 -->
    <div class="chart-container">
      <h2>📐 价差（Spread）走势</h2>
      <p style="color: #666; font-size: 13px; margin-bottom: 15px;">
        ℹ️ 价差 = 归一化价格1 / 归一化价格2，反映两个币对的相对表现。起始值为1.0。
      </p>
      <div class="chart-wrapper" style="height: 350px;">
        <canvas id="spreadChart"></canvas>
      </div>
    </div>

    <!-- 相关性图表 -->
    <div class="chart-container">
      <h2>🔗 相关性（Correlation）走势</h2>
      <p style="color: #666; font-size: 13px; margin-bottom: 15px;">
        ℹ️ 相关性衡量两个币对价格走势的同步程度。范围：-1到1，越接近1表示越同步。
      </p>
      <p style="color: #f59e0b; font-size: 12px; margin-bottom: 10px; background: #fef3c7; padding: 8px; border-radius: 5px;">
        ⚠️ <strong>最小阈值: ${summary.strategyParams?.minCorrelation || 0.75}</strong> - 相关性低于此值时不会开仓（即使Z-score超过阈值）
      </p>
      <div class="chart-wrapper" style="height: 350px;">
        <canvas id="correlationChart"></canvas>
      </div>
      <div style="margin-top: 15px; font-size: 12px; color: #666;">
        <div style="display: flex; gap: 20px; flex-wrap: wrap;">
          <div>🟢 最小阈值: ${summary.strategyParams?.minCorrelation || 0.75}</div>
          <div>📊 相关性范围: -1.0 到 +1.0</div>
          <div>✅ 理想范围: 0.75 - 1.0（强正相关）</div>
        </div>
      </div>
    </div>

    <!-- 交易记录表格 -->
    <div class="chart-container">
      <h2>📋 交易记录明细</h2>
      <div style="overflow-x: auto;">
        <table id="tradesTable">
          <thead>
            <tr>
              <th rowspan="2" style="vertical-align: middle;">序号</th>
              <th rowspan="2" style="vertical-align: middle;">开仓时间</th>
              <th rowspan="2" style="vertical-align: middle;">平仓时间</th>
              <th rowspan="2" style="vertical-align: middle;">类型</th>
              <th rowspan="2" style="vertical-align: middle;">开仓<br/>Z-Score</th>
              <th rowspan="2" style="vertical-align: middle;">平仓<br/>Z-Score</th>
              <th rowspan="2" style="vertical-align: middle;">持仓<br/>时长</th>
              <th colspan="6" style="text-align: center; border-bottom: 1px solid #fff;">${symbol1}</th>
              <th colspan="6" style="text-align: center; border-bottom: 1px solid #fff;">${symbol2}</th>
              <th rowspan="2" style="vertical-align: middle;">开仓<br/>手续费</th>
              <th rowspan="2" style="vertical-align: middle;">平仓<br/>手续费</th>
              <th rowspan="2" style="vertical-align: middle;">交易前<br/>余额</th>
              <th rowspan="2" style="vertical-align: middle;">盈亏<br/>(USDT)</th>
              <th rowspan="2" style="vertical-align: middle;">交易后<br/>余额</th>
              <th rowspan="2" style="vertical-align: middle;">收益率</th>
              <th rowspan="2" style="vertical-align: middle;">平仓原因</th>
            </tr>
            <tr>
              <th>数量</th>
              <th>开仓价</th>
              <th>平仓价</th>
              <th>成交额</th>
              <th>方向</th>
              <th>盈亏</th>
              <th>数量</th>
              <th>开仓价</th>
              <th>平仓价</th>
              <th>成交额</th>
              <th>方向</th>
              <th>盈亏</th>
            </tr>
          </thead>
          <tbody id="tradesTableBody">
          </tbody>
        </table>
      </div>
    </div>

    <div class="footer">
      <p>🤖 加密货币统计套利回测系统 | Powered by CCXT & Chart.js</p>
    </div>
  </div>

  <script>
    const data = ${JSON.stringify(data)};
    const summary = ${JSON.stringify(summary)};
    const trades = ${JSON.stringify(trades)};

    // 合并图表配置（双Y轴，归一化显示）
    const ctx = document.getElementById('combinedChart').getContext('2d');
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [
          // ${symbol1} 价格线（归一化）
          {
            label: '${symbol1}',
            data: data.prices1,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.1,
            yAxisID: 'y'
          },
          // ${symbol2} 价格线（归一化）
          {
            label: '${symbol2}',
            data: data.prices2,
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.1,
            yAxisID: 'y'
          },
          // ${symbol1} 开仓点
          {
            label: '${symbol1}开仓',
            data: data.openPoints1,
            backgroundColor: function(context) {
              const trade = context.raw?.trade;
              return trade?.type === 'OPEN_LONG' ? '#10b981' : '#ef4444';
            },
            borderColor: '#fff',
            borderWidth: 2,
            pointRadius: 8,
            pointStyle: 'triangle',
            pointRotation: function(context) {
              const trade = context.raw?.trade;
              return trade?.type === 'OPEN_LONG' ? 0 : 180;
            },
            showLine: false,
            yAxisID: 'y'
          },
          // ${symbol1} 平仓点
          {
            label: '${symbol1}平仓',
            data: data.closePoints1,
            backgroundColor: '#8b5cf6',
            borderColor: '#fff',
            borderWidth: 2,
            pointRadius: 6,
            showLine: false,
            yAxisID: 'y'
          },
          // ${symbol2} 开仓点
          {
            label: '${symbol2}开仓',
            data: data.openPoints2,
            backgroundColor: function(context) {
              const trade = context.raw?.trade;
              return trade?.type === 'OPEN_LONG' ? '#10b981' : '#ef4444';
            },
            borderColor: '#fff',
            borderWidth: 2,
            pointRadius: 8,
            pointStyle: 'triangle',
            pointRotation: function(context) {
              const trade = context.raw?.trade;
              return trade?.type === 'OPEN_LONG' ? 0 : 180;
            },
            showLine: false,
            yAxisID: 'y'
          },
          // ${symbol2} 平仓点
          {
            label: '${symbol2}平仓',
            data: data.closePoints2,
            backgroundColor: '#8b5cf6',
            borderColor: '#fff',
            borderWidth: 2,
            pointRadius: 6,
            showLine: false,
            yAxisID: 'y'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              filter: function(item) {
                // 只显示价格线的图例
                return item.text === '${symbol1}' || item.text === '${symbol2}';
              }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const dataset = context.dataset.label;
                const normalizedValue = context.parsed.y;
                
                if (dataset === '${symbol1}') {
                  const actualPrice = (normalizedValue / 100) * data.basePrice1;
                  return [
                    \`${symbol1}: \${normalizedValue.toFixed(2)} (归一化)\`,
                    \`实际价格: $\${actualPrice.toFixed(8)}\`
                  ];
                } else if (dataset === '${symbol2}') {
                  const actualPrice = (normalizedValue / 100) * data.basePrice2;
                  return [
                    \`${symbol2}: \${normalizedValue.toFixed(2)} (归一化)\`,
                    \`实际价格: $\${actualPrice.toFixed(8)}\`
                  ];
                } else if (dataset.includes('开仓')) {
                  const trade = context.raw.trade;
                  const actualPrice = context.raw.actualPrice;
                  return [
                    \`\${dataset}: \${normalizedValue.toFixed(2)} (归一化)\`,
                    \`实际价格: $\${actualPrice.toFixed(8)}\`,
                    \`类型: \${trade.type === 'OPEN_LONG' ? '做多价差' : '做空价差'}\`,
                    \`Z-Score: \${trade.entryZScore.toFixed(2)}\`
                  ];
                } else if (dataset.includes('平仓')) {
                  const pnl = context.raw.pnl || 0;
                  const actualPrice = context.raw.actualPrice;
                  return [
                    \`\${dataset}: \${normalizedValue.toFixed(2)} (归一化)\`,
                    \`实际价格: $\${actualPrice.toFixed(8)}\`,
                    \`盈亏: \${pnl >= 0 ? '+' : ''}\${pnl.toFixed(2)} USDT\`
                  ];
                }
              }
            }
          }
        },
        scales: {
          x: {
            ticks: {
              maxRotation: 45,
              minRotation: 45,
              autoSkip: true,
              maxTicksLimit: 20
            }
          },
          y: {
            type: 'linear',
            position: 'left',
            title: {
              display: true,
              text: '归一化价格指数 (起始值 = 100)',
              color: '#333',
              font: {
                weight: 'bold',
                size: 13
              }
            },
            ticks: {
              color: '#666',
              callback: function(value) {
                return value.toFixed(2);
              }
            }
          }
        }
      }
    });

    // Z-Score图表
    const ctxZScore = document.getElementById('zscoreChart').getContext('2d');
    const entryThreshold = ${summary.strategyParams?.entryThreshold || 2.0};
    const exitThreshold = ${summary.strategyParams?.exitThreshold || 0.5};
    const stopLossThreshold = ${summary.strategyParams?.stopLossThreshold || 3.5};
    const warmupEndIndex = data.warmupEndIndex || 100;
    
    // 标记所有超过开仓阈值但没有产生交易的点（用于调试）
    const highZScorePoints = [];
    const tradeTimestamps = new Set();
    
    // 收集所有交易发生的时间点
    trades.forEach(trade => {
      tradeTimestamps.add(trade.entryTime);
    });
    
    // 找出超过阈值但没有交易的点
    data.zScores.forEach((z, idx) => {
      if (z !== null && Math.abs(z) > entryThreshold && idx >= warmupEndIndex) {
        // 检查这个时间点是否有交易
        const timestamp = new Date(data.labels[idx]);
        const timeStr = data.labels[idx];
        
        // 如果这个时间点没有开仓交易，标记为红点
        let hasTradeAtThisTime = false;
        trades.forEach(trade => {
          const tradeTime = new Date(trade.entryTime).toLocaleString('zh-CN', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          });
          if (tradeTime === timeStr) {
            hasTradeAtThisTime = true;
          }
        });
        
        if (!hasTradeAtThisTime) {
          highZScorePoints.push({
            x: data.labels[idx],
            y: z
          });
        }
      }
    });
    
    new Chart(ctxZScore, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [
          {
            label: 'Z-Score',
            data: data.zScores,
            borderColor: '#8b5cf6',
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.1,
            fill: true
          },
          {
            label: '超阈值点（未交易）',
            data: highZScorePoints,
            backgroundColor: '#ef4444',
            borderColor: '#fff',
            borderWidth: 2,
            pointRadius: 5,
            pointStyle: 'circle',
            showLine: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: function(context) {
                return \`时间: \${context[0].label}\`;
              },
              label: function(context) {
                const idx = context.dataIndex;
                const dataset = context.dataset.label;
                
                if (dataset === '超阈值点（未交易）') {
                  return [
                    \`Z-Score: \${context.parsed.y?.toFixed(3)}\`,
                    '⚠️ 超过开仓阈值但未交易',
                    '可能原因: 已有持仓或相关性不足'
                  ];
                }
                
                if (idx < warmupEndIndex) {
                  return '预热期（无交易）';
                }
                
                const zScore = context.parsed.y;
                const absZ = Math.abs(zScore);
                let status = '';
                
                if (absZ > entryThreshold) {
                  status = ' [超过开仓阈值]';
                } else if (absZ > exitThreshold) {
                  status = ' [在开仓和平仓阈值之间]';
                } else {
                  status = ' [接近均值]';
                }
                
                return \`Z-Score: \${zScore?.toFixed(3) || 'N/A'}\${status}\`;
              }
            }
          },
          annotation: {
            annotations: {
              warmupZone: {
                type: 'box',
                xMin: 0,
                xMax: warmupEndIndex,
                backgroundColor: 'rgba(128, 128, 128, 0.1)',
                borderColor: 'rgba(128, 128, 128, 0.3)',
                borderWidth: 1,
                label: {
                  content: '预热期',
                  enabled: true,
                  position: 'center',
                  color: '#666',
                  font: { size: 12, weight: 'bold' }
                }
              },
              entryUpper: {
                type: 'line',
                yMin: entryThreshold,
                yMax: entryThreshold,
                borderColor: '#10b981',
                borderWidth: 2,
                borderDash: [5, 5],
                label: {
                  content: '开仓阈值 +' + entryThreshold,
                  enabled: true,
                  position: 'end',
                  backgroundColor: '#10b981',
                  color: '#fff',
                  font: { size: 10 }
                }
              },
              entryLower: {
                type: 'line',
                yMin: -entryThreshold,
                yMax: -entryThreshold,
                borderColor: '#10b981',
                borderWidth: 2,
                borderDash: [5, 5],
                label: {
                  content: '开仓阈值 -' + entryThreshold,
                  enabled: true,
                  position: 'end',
                  backgroundColor: '#10b981',
                  color: '#fff',
                  font: { size: 10 }
                }
              },
              exitUpper: {
                type: 'line',
                yMin: exitThreshold,
                yMax: exitThreshold,
                borderColor: '#f59e0b',
                borderWidth: 1,
                borderDash: [3, 3],
                label: {
                  content: '平仓阈值 +' + exitThreshold,
                  enabled: true,
                  position: 'start',
                  backgroundColor: '#f59e0b',
                  color: '#fff',
                  font: { size: 10 }
                }
              },
              exitLower: {
                type: 'line',
                yMin: -exitThreshold,
                yMax: -exitThreshold,
                borderColor: '#f59e0b',
                borderWidth: 1,
                borderDash: [3, 3],
                label: {
                  content: '平仓阈值 -' + exitThreshold,
                  enabled: true,
                  position: 'start',
                  backgroundColor: '#f59e0b',
                  color: '#fff',
                  font: { size: 10 }
                }
              },
              zero: {
                type: 'line',
                yMin: 0,
                yMax: 0,
                borderColor: '#666',
                borderWidth: 1
              }
            }
          }
        },
        scales: {
          x: {
            ticks: {
              maxRotation: 45,
              minRotation: 45,
              autoSkip: true,
              maxTicksLimit: 20
            }
          },
          y: {
            title: {
              display: true,
              text: 'Z-Score（标准差倍数）',
              font: { weight: 'bold' }
            },
            ticks: {
              callback: function(value) {
                return value.toFixed(2);
              }
            }
          }
        }
      }
    });

    // 价差图表
    const ctxSpread = document.getElementById('spreadChart').getContext('2d');
    new Chart(ctxSpread, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [
          {
            label: '价差（Spread）',
            data: data.spread,
            borderColor: '#ec4899',
            backgroundColor: 'rgba(236, 72, 153, 0.1)',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.1,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(context) {
                return \`价差: \${context.parsed.y.toFixed(6)}\`;
              }
            }
          }
        },
        scales: {
          x: {
            ticks: {
              maxRotation: 45,
              minRotation: 45,
              autoSkip: true,
              maxTicksLimit: 20
            }
          },
          y: {
            title: {
              display: true,
              text: '价差（归一化价格比率）',
              font: { weight: 'bold' }
            },
            ticks: {
              callback: function(value) {
                return value.toFixed(4);
              }
            }
          }
        }
      }
    });

    // 相关性图表
    const ctxCorrelation = document.getElementById('correlationChart').getContext('2d');
    const minCorrelation = ${summary.strategyParams?.minCorrelation || 0.75};
    
    new Chart(ctxCorrelation, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [
          {
            label: '相关性',
            data: data.correlations,
            borderColor: '#06b6d4',
            backgroundColor: 'rgba(6, 182, 212, 0.1)',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.1,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(context) {
                const corr = context.parsed.y;
                let status = '';
                if (corr === null) {
                  return '预热期（无数据）';
                }
                if (corr >= minCorrelation) {
                  status = ' ✅ [满足交易条件]';
                } else {
                  status = ' ❌ [低于最小阈值]';
                }
                return \`相关性: \${corr?.toFixed(3) || 'N/A'}\${status}\`;
              }
            }
          },
          annotation: {
            annotations: {
              warmupZone: {
                type: 'box',
                xMin: 0,
                xMax: warmupEndIndex,
                backgroundColor: 'rgba(128, 128, 128, 0.1)',
                borderColor: 'rgba(128, 128, 128, 0.3)',
                borderWidth: 1,
                label: {
                  content: '预热期',
                  enabled: true,
                  position: 'center',
                  color: '#666',
                  font: { size: 12, weight: 'bold' }
                }
              },
              minThreshold: {
                type: 'line',
                yMin: minCorrelation,
                yMax: minCorrelation,
                borderColor: '#f59e0b',
                borderWidth: 2,
                borderDash: [5, 5],
                label: {
                  content: '最小阈值 ' + minCorrelation,
                  enabled: true,
                  position: 'end',
                  backgroundColor: '#f59e0b',
                  color: '#fff',
                  font: { size: 11, weight: 'bold' }
                }
              },
              greenZone: {
                type: 'box',
                yMin: minCorrelation,
                yMax: 1.0,
                backgroundColor: 'rgba(16, 185, 129, 0.05)',
                borderWidth: 0,
                label: {
                  content: '✅ 可交易区域',
                  enabled: true,
                  position: 'start',
                  color: '#10b981',
                  font: { size: 10 }
                }
              },
              redZone: {
                type: 'box',
                yMin: -1.0,
                yMax: minCorrelation,
                backgroundColor: 'rgba(239, 68, 68, 0.05)',
                borderWidth: 0,
                label: {
                  content: '❌ 不可交易区域',
                  enabled: true,
                  position: 'start',
                  color: '#ef4444',
                  font: { size: 10 }
                }
              }
            }
          }
        },
        scales: {
          x: {
            ticks: {
              maxRotation: 45,
              minRotation: 45,
              autoSkip: true,
              maxTicksLimit: 20
            }
          },
          y: {
            min: -1,
            max: 1,
            title: {
              display: true,
              text: '相关系数（Correlation Coefficient）',
              font: { weight: 'bold' }
            },
            ticks: {
              callback: function(value) {
                return value.toFixed(2);
              }
            }
          }
        }
      }
    });

    // 填充交易记录表格
    const tbody = document.getElementById('tradesTableBody');
    trades.forEach((trade, index) => {
      const row = tbody.insertRow();
      const pnlClass = trade.pnl >= 0 ? 'positive-pnl' : 'negative-pnl';
      const typeClass = trade.type === 'OPEN_LONG' ? 'trade-type-long' : 'trade-type-short';
      const typeText = trade.type === 'OPEN_LONG' ? '做多价差' : '做空价差';
      const returnPct = ((trade.pnl / summary.initialCapital) * 100).toFixed(2);
      
      const entryTime = new Date(trade.entryTime).toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const exitTime = new Date(trade.exitTime).toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      // 计算持仓时长（小时）
      const durationMs = trade.exitTime - trade.entryTime;
      const duration = Math.round(durationMs / (1000 * 60 * 60)); // 转换为小时
      
      // 计算成交额
      const entryValue1 = trade.quantity1 * trade.entryPrice1;
      const exitValue1 = trade.quantity1 * trade.exitPrice1;
      const entryValue2 = trade.quantity2 * trade.entryPrice2;
      const exitValue2 = trade.quantity2 * trade.exitPrice2;
      
      // 计算交易前后余额（扣除开仓使用的资金）
      const capitalBeforeTrade = index === 0 ? summary.initialCapital : trades[index - 1].capital;
      const capitalAfterTrade = trade.capital;
      
      // 手续费
      const entryFee = trade.commissionDetails?.entryFee || 0;
      const exitFee = trade.commissionDetails?.exitFee || 0;
      
      // 方向和盈亏
      // 如果没有 side1/side2（旧数据），从 type 推断
      let side1 = trade.side1;
      let side2 = trade.side2;
      
      if (!side1 || !side2) {
        // 从交易类型推断方向
        if (trade.type === 'OPEN_LONG') {
          side1 = 'LONG';   // 做多价差：symbol1 做多
          side2 = 'SHORT';  // symbol2 做空
        } else {
          side1 = 'SHORT';  // 做空价差：symbol1 做空
          side2 = 'LONG';   // symbol2 做多
        }
      }
      
      // 如果没有 pnl1/pnl2（旧数据），尝试计算
      let pnl1 = trade.pnl1;
      let pnl2 = trade.pnl2;
      
      if (pnl1 === undefined || pnl2 === undefined) {
        const currentValue1 = trade.quantity1 * trade.exitPrice1;
        const currentValue2 = trade.quantity2 * trade.exitPrice2;
        const entryValue1 = trade.quantity1 * trade.entryPrice1;
        const entryValue2 = trade.quantity2 * trade.entryPrice2;
        
        if (trade.type === 'OPEN_LONG') {
          pnl1 = currentValue1 - entryValue1;  // 做多盈亏
          pnl2 = entryValue2 - currentValue2;  // 做空盈亏
        } else {
          pnl1 = entryValue1 - currentValue1;  // 做空盈亏
          pnl2 = currentValue2 - entryValue2;  // 做多盈亏
        }
      }
      
      const pnl1Class = pnl1 >= 0 ? 'positive-pnl' : 'negative-pnl';
      const pnl2Class = pnl2 >= 0 ? 'positive-pnl' : 'negative-pnl';
      const side1Text = side1 === 'LONG' ? '做多' : '做空';
      const side2Text = side2 === 'LONG' ? '做多' : '做空';
      const side1Class = side1 === 'LONG' ? 'trade-type-long' : 'trade-type-short';
      const side2Class = side2 === 'LONG' ? 'trade-type-long' : 'trade-type-short';
      
      row.innerHTML = \`
        <td><strong>\${index + 1}</strong></td>
        <td style="text-align: left;">\${entryTime}</td>
        <td style="text-align: left;">\${exitTime}</td>
        <td><span class="\${typeClass}">\${typeText}</span></td>
        <td>\${trade.entryZScore.toFixed(2)}</td>
        <td>\${trade.exitZScore.toFixed(2)}</td>
        <td>\${duration}h</td>
        <td>\${trade.quantity1.toFixed(2)}</td>
        <td>$\${trade.entryPrice1.toFixed(6)}</td>
        <td>$\${trade.exitPrice1.toFixed(6)}</td>
        <td>$\${entryValue1.toFixed(2)}</td>
        <td><span class="\${side1Class}">\${side1Text}</span></td>
        <td class="\${pnl1Class}"><strong>\${pnl1 >= 0 ? '+' : ''}\${pnl1.toFixed(2)}</strong></td>
        <td>\${trade.quantity2.toFixed(2)}</td>
        <td>$\${trade.entryPrice2.toFixed(6)}</td>
        <td>$\${trade.exitPrice2.toFixed(6)}</td>
        <td>$\${entryValue2.toFixed(2)}</td>
        <td><span class="\${side2Class}">\${side2Text}</span></td>
        <td class="\${pnl2Class}"><strong>\${pnl2 >= 0 ? '+' : ''}\${pnl2.toFixed(2)}</strong></td>
        <td>$\${entryFee.toFixed(2)}</td>
        <td>$\${exitFee.toFixed(2)}</td>
        <td>$\${capitalBeforeTrade.toFixed(2)}</td>
        <td class="\${pnlClass}"><strong>\${trade.pnl >= 0 ? '+' : ''}\${trade.pnl.toFixed(2)}</strong></td>
        <td>$\${capitalAfterTrade.toFixed(2)}</td>
        <td class="\${pnlClass}"><strong>\${returnPct >= 0 ? '+' : ''}\${returnPct}%</strong></td>
        <td style="text-align: left; font-size: 10px;">\${trade.closeReason || '-'}</td>
      \`;
    });
  </script>
</body>
</html>`;
  }

  /**
   * 生成相关性矩阵热力图
   * @param {Object} correlationMatrix - 相关性矩阵
   * @param {Array} symbols - 交易对符号列表
   * @param {Object} config - 配置信息
   */
  generateCorrelationMatrix(correlationMatrix, symbols, config = {}) {
    const filename = `correlation_matrix_${Date.now()}.html`;
    const filepath = path.join(this.outputDir, filename);

    const html = this.generateCorrelationMatrixHTML(correlationMatrix, symbols, config);
    fs.writeFileSync(filepath, html, 'utf-8');
    
    logger.info(`📊 相关性矩阵已生成: ${filepath}`);
    return { filepath, filename };
  }

  /**
   * 生成相关性矩阵HTML
   */
  generateCorrelationMatrixHTML(correlationMatrix, symbols, config) {
    const minCorrelation = config.minCorrelation || 0.75;
    const timeframe = config.timeframe || '1h';
    const period = config.period || '30天';
    const totalSymbols = config.totalSymbols || symbols.length;
    const failedSymbols = config.failedSymbols || 0;
    const correlationStability = config.correlationStability || null;
    const analysisMonths = config.analysisMonths || 1;
    const monthlyCorrelations = config.monthlyCorrelations || [];

    // 准备热力图数据
    const heatmapData = [];
    for (let i = 0; i < symbols.length; i++) {
      for (let j = 0; j < symbols.length; j++) {
        // correlationMatrix 可能是对象格式或数组格式
        let correlation = 0;
        let stability = 0;
        
        if (typeof correlationMatrix[symbols[i]] === 'object') {
          // 对象格式: { symbol1: { symbol2: value } }
          correlation = correlationMatrix[symbols[i]][symbols[j]] || 0;
          if (correlationStability && typeof correlationStability[symbols[i]] === 'object') {
            stability = correlationStability[symbols[i]][symbols[j]] || 0;
          } else if (correlationStability && correlationStability[i]) {
            stability = correlationStability[i][j] || 0;
          }
        } else {
          // 数组格式 (旧格式兼容)
          correlation = correlationMatrix[i] ? correlationMatrix[i][j] : 0;
          stability = correlationStability ? correlationStability[i][j] : 0;
        }
        
        heatmapData.push({
          x: symbols[j],
          y: symbols[i],
          value: correlation,
          stability: stability
        });
      }
    }

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>相关性矩阵热力图</title>
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
      max-width: 1600px;
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
      color: #333 !important;
      margin-bottom: 10px;
      font-size: 28px;
    }
    
    .header p {
      color: #666 !important;
      font-size: 14px;
      margin-bottom: 8px;
    }
    
    .info-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-bottom: 20px;
    }
    
    .info-card {
      background: white;
      border-radius: 10px;
      padding: 20px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .info-card h3 {
      font-size: 14px;
      color: #666;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .info-card .value {
      font-size: 24px;
      font-weight: bold;
      color: #333;
    }
    
    .chart-container {
      background: white;
      border-radius: 10px;
      padding: 30px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      margin-bottom: 20px;
    }
    
    .chart-container h2 {
      color: #333;
      margin-bottom: 20px;
      font-size: 20px;
    }
    
    .heatmap {
      width: 100%;
      overflow-x: auto;
    }
    
    .heatmap-table {
      border-collapse: collapse;
      font-size: 11px;
      min-width: 100%;
    }
    
    .heatmap-table th,
    .heatmap-table td {
      padding: 6px;
      text-align: center;
      border: 1px solid #e5e7eb;
      min-width: 75px;
      height: 75px;
      vertical-align: middle;
    }
    
    .heatmap-table th {
      background: #f3f4f6;
      font-weight: 600;
      position: sticky;
      top: 0;
      z-index: 10;
    }
    
    .heatmap-table th.row-header {
      background: #f3f4f6;
      position: sticky;
      left: 0;
      z-index: 20;
    }
    
    .heatmap-table td.row-header {
      background: #f9fafb;
      font-weight: 600;
      position: sticky;
      left: 0;
      z-index: 5;
    }
    
    .corr-cell {
      cursor: pointer;
      transition: all 0.2s;
      position: relative;
      font-size: 10px;
    }
    
    .corr-cell:hover {
      transform: scale(1.05);
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
      z-index: 100;
    }
    
    .cell-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      line-height: 1.2;
    }
    
    .corr-value {
      font-size: 14px;
      font-weight: bold;
    }
    
    .stability-value {
      font-size: 9px;
      opacity: 0.85;
    }
    
    .stability-rating {
      font-size: 12px;
    }
    
    .legend {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 20px;
      flex-wrap: wrap;
    }
    
    .legend-item {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
    }
    
    .legend-box {
      width: 30px;
      height: 20px;
      border: 1px solid #ccc;
    }
    
    .tooltip {
      position: fixed;
      background: #f3f4f6;
      color: #111827;
      padding: 12px;
      border-radius: 8px;
      font-size: 12px;
      pointer-events: none;
      z-index: 1000;
      display: none;
      border: 2px solid #d1d5db;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    }
    
    .tooltip strong {
      color: #1f2937 !important;
    }
    
    .tooltip table {
      color: #374151 !important;
    }
    
    .tooltip th {
      background: #e5e7eb !important;
      color: #1f2937 !important;
    }
    
    .tooltip td {
      color: #374151 !important;
    }
    
    .tooltip div {
      color: #4b5563 !important;
    }
    
    .footer {
      text-align: center;
      color: white;
      margin-top: 30px;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔗 相关性矩阵热力图</h1>
      <p>生成时间: ${new Date().toLocaleString('zh-CN')}</p>
      <p>分析周期: ${period} | K线周期: ${timeframe}</p>
      <p>最小相关性阈值: ${minCorrelation} | 成功交易对: ${symbols.length}/${totalSymbols}</p>
      ${analysisMonths > 1 ? '<p style="color: #10b981;">✨ 使用多月平均相关性分析（共 ' + analysisMonths + ' 个月），鼠标悬停可查看稳定性</p>' : ''}
      ${failedSymbols > 0 ? '<p style="color: #f59e0b;">⚠️ ' + failedSymbols + ' 个交易对获取数据失败（已排除）</p>' : ''}
    </div>

    <div class="info-cards">
      <div class="info-card">
        <h3>成功交易对</h3>
        <div class="value">${symbols.length}</div>
      </div>
      ${failedSymbols > 0 ? '<div class="info-card" style="background: #fef3c7;"><h3>失败交易对</h3><div class="value" style="color: #f59e0b;">' + failedSymbols + '</div></div>' : ''}
      <div class="info-card">
        <h3>最小相关性</h3>
        <div class="value">${minCorrelation}</div>
      </div>
      <div class="info-card">
        <h3>分析周期</h3>
        <div class="value">${period}</div>
      </div>
      <div class="info-card">
        <h3>K线周期</h3>
        <div class="value">${timeframe}</div>
      </div>
    </div>

    <div class="chart-container">
      <h2>📊 相关性矩阵热力图</h2>
      <p style="color: #666; font-size: 13px; margin-bottom: 15px;">
        ℹ️ 颜色越深表示相关性越强。深绿色（≥${minCorrelation}）表示满足配对交易条件。
        ${analysisMonths > 1 ? '<br/>📊 格子显示: <strong>相关系数</strong> / σ=<strong>标准差</strong> / <strong>稳定性评级</strong>' : ''}
      </p>
      
      <div class="heatmap">
        <table class="heatmap-table">
          <thead>
            <tr>
              <th class="row-header"></th>
              ${symbols.map(s => '<th>' + s + '</th>').join('')}
            </tr>
          </thead>
          <tbody id="heatmapBody">
          </tbody>
        </table>
      </div>

      <div class="legend">
        <div class="legend-item">
          <div class="legend-box" style="background: linear-gradient(to right, #ef4444, #fbbf24, #34d399, #10b981);"></div>
          <span>-1.0 (负相关) → 0.0 (无关) → +1.0 (正相关)</span>
        </div>
        <div class="legend-item">
          <div class="legend-box" style="background: #10b981;"></div>
          <span>≥ ${minCorrelation} (满足配对条件)</span>
        </div>
        ${analysisMonths > 1 ? '<div class="legend-item" style="margin-left: 20px;"><strong>稳定性评级:</strong> ✨ 非常稳定(σ<0.05) | ✅ 较稳定(σ<0.10) | ⚠️ 中等波动(σ<0.15) | ❌ 波动大(σ≥0.15)</div>' : ''}
        <div class="legend-item">
          <div class="legend-box" style="background: #f3f4f6;"></div>
          <span>自身相关性 (1.0)</span>
        </div>
      </div>
    </div>

    <div class="chart-container">
      <h2>📊 币种平均相关性排名</h2>
      <p style="color: #666; font-size: 13px; margin-bottom: 15px;">
        ℹ️ 显示每个币种与其他所有币种的平均相关性，可用于识别市场领导者和最佳配对候选
      </p>
      <div id="rankingTable"></div>
    </div>

    <div class="footer">
      <p>🤖 加密货币统计套利系统 | 相关性分析工具</p>
    </div>
  </div>

  <div class="tooltip" id="tooltip"></div>

  <script>
    const correlationMatrix = ${JSON.stringify(correlationMatrix)};
    const symbols = ${JSON.stringify(symbols)};
    const minCorrelation = ${minCorrelation};
    const stabilityMatrix = ${correlationStability ? JSON.stringify(correlationStability) : 'null'};
    const analysisMonths = ${analysisMonths};
    const monthlyCorrelations = ${JSON.stringify(monthlyCorrelations)};

    // 获取两个币种在每个月的相关系数
    function getMonthlyCorrelations(symbol1, symbol2) {
      const monthly = [];
      
      if (!monthlyCorrelations || monthlyCorrelations.length === 0) {
        console.log('monthlyCorrelations is empty or undefined');
        return monthly;
      }
      
      for (const monthData of monthlyCorrelations) {
        if (!monthData || !monthData.symbols || !monthData.matrix) {
          console.log('Invalid monthData structure:', monthData);
          continue;
        }
        
        const idx1 = monthData.symbols.indexOf(symbol1);
        const idx2 = monthData.symbols.indexOf(symbol2);
        
        if (idx1 !== -1 && idx2 !== -1) {
          // 尝试从matrix中获取相关性
          let correlation = null;
          
          // 方式1: 对象格式 matrix[symbol1][symbol2]
          if (monthData.matrix[symbol1] && typeof monthData.matrix[symbol1][symbol2] === 'number') {
            correlation = monthData.matrix[symbol1][symbol2];
          }
          // 方式2: 数组格式 matrix[idx1][idx2]
          else if (Array.isArray(monthData.matrix) && monthData.matrix[idx1] && typeof monthData.matrix[idx1][idx2] === 'number') {
            correlation = monthData.matrix[idx1][idx2];
          }
          
          if (correlation !== null) {
            monthly.push({
              date: monthData.year + '-' + String(monthData.month).padStart(2, '0'),
              correlation: correlation
            });
          }
        }
      }
      
      return monthly;
    }

    // 生成热力图
    function getColor(value) {
      if (value === 1.0) {
        return '#f3f4f6'; // 自身相关性，灰色
      }
      
      const absValue = Math.abs(value);
      
      if (value >= minCorrelation) {
        // 满足条件的强正相关：深绿色
        const intensity = Math.floor((value - minCorrelation) / (1 - minCorrelation) * 155 + 100);
        return 'rgb(16, ' + intensity + ', 129)';
      } else if (value >= 0.5) {
        // 中等正相关：黄绿色
        const intensity = Math.floor((value - 0.5) / (minCorrelation - 0.5) * 155 + 100);
        return 'rgb(' + 155 + ', ' + intensity + ', 100)';
      } else if (value >= 0) {
        // 弱正相关：黄色
        const intensity = Math.floor((value / 0.5) * 155 + 100);
        return 'rgb(251, ' + intensity + ', 100)';
      } else {
        // 负相关：红色
        const intensity = Math.floor((1 - Math.abs(value)) * 200 + 50);
        return 'rgb(239, ' + intensity + ', ' + intensity + ')';
      }
    }

    function generateHeatmap() {
      const tbody = document.getElementById('heatmapBody');
      
      symbols.forEach((row_symbol, i) => {
        const tr = document.createElement('tr');
        
        // 行标题
        const th = document.createElement('td');
        th.className = 'row-header';
        th.textContent = row_symbol;
        tr.appendChild(th);
        
        // 相关性单元格
        symbols.forEach((col_symbol, j) => {
          const td = document.createElement('td');
          // 处理对象格式和数组格式
          const value = typeof correlationMatrix[row_symbol] === 'object' 
            ? correlationMatrix[row_symbol][col_symbol] 
            : correlationMatrix[i][j];
          const stability = stabilityMatrix && typeof stabilityMatrix[row_symbol] === 'object'
            ? stabilityMatrix[row_symbol][col_symbol]
            : (stabilityMatrix ? stabilityMatrix[i][j] : null);
          
          td.className = 'corr-cell';
          td.style.backgroundColor = getColor(value);
          
          // 设置文字颜色
          const textColor = (value >= 0.7 || value < 0) ? 'white' : '#333';
          td.style.color = textColor;
          
          // 构建格子内容
          const cellContent = document.createElement('div');
          cellContent.className = 'cell-content';
          
          // 相关系数
          const corrValue = document.createElement('div');
          corrValue.className = 'corr-value';
          corrValue.textContent = value.toFixed(2);
          corrValue.style.color = textColor;
          cellContent.appendChild(corrValue);
          
          // 稳定性和评级（只对非自身相关性显示）
          if (stability !== null && value !== 1.0 && analysisMonths > 1) {
            // 稳定性值
            const stabilityValue = document.createElement('div');
            stabilityValue.className = 'stability-value';
            stabilityValue.textContent = 'σ=' + stability.toFixed(3);
            stabilityValue.style.color = textColor;
            cellContent.appendChild(stabilityValue);
            
            // 评级图标
            const ratingDiv = document.createElement('div');
            ratingDiv.className = 'stability-rating';
            let ratingIcon = '';
            if (stability < 0.05) {
              ratingIcon = '✨';
            } else if (stability < 0.10) {
              ratingIcon = '✅';
            } else if (stability < 0.15) {
              ratingIcon = '⚠️';
            } else {
              ratingIcon = '❌';
            }
            ratingDiv.textContent = ratingIcon;
            cellContent.appendChild(ratingDiv);
          }
          
          td.appendChild(cellContent);
          
          // Tooltip显示详细信息，包括月度相关系数
          td.addEventListener('mouseenter', () => {
            const tooltip = document.getElementById('tooltip');
            tooltip.style.display = 'block';
            tooltip.style.position = 'fixed';
            tooltip.style.left = '50%';
            tooltip.style.top = '10px';
            tooltip.style.transform = 'translateX(-50%)';
            tooltip.style.maxWidth = '500px';
            tooltip.style.maxHeight = '80vh';
            tooltip.style.overflow = 'auto';
            
            let status = '';
            if (value === 1.0) {
              status = '自身相关性';
            } else if (value >= minCorrelation) {
              status = '✅ 满足配对条件';
            } else {
              status = '❌ 相关性不足';
            }
            
            let html = '<strong>' + row_symbol + ' ↔ ' + col_symbol + '</strong><br/>' +
              '平均相关系数: ' + value.toFixed(3) + '<br/>' +
              '状态: ' + status;
            
            // 添加稳定性信息
            if (stability !== null && value !== 1.0) {
              let stabilityRating = '';
              if (stability < 0.05) {
                stabilityRating = '非常稳定 ✨';
              } else if (stability < 0.10) {
                stabilityRating = '较稳定 ✅';
              } else if (stability < 0.15) {
                stabilityRating = '中等波动 ⚠️';
              } else {
                stabilityRating = '波动较大 ❌';
              }
              
              html += '<br/>稳定性 (标准差): ' + stability.toFixed(3) + '<br/>' +
                '评级: ' + stabilityRating;
            }
            
            // 添加月度相关系数详情
            if (analysisMonths > 1 && value !== 1.0 && monthlyCorrelations.length > 0) {
              const monthly = getMonthlyCorrelations(row_symbol, col_symbol);
              
              console.log('Monthly data for', row_symbol, col_symbol, ':', monthly);
              
              if (monthly.length > 0) {
                html += '<br/><br/><strong>📊 月度相关系数变化:</strong>';
                html += '<table style="width: 100%; margin-top: 5px; font-size: 11px; border-collapse: collapse;">';
                html += '<tr style="background: #e5e7eb;"><th style="padding: 3px; border: 1px solid #ddd; color: #111827;">月份</th><th style="padding: 3px; border: 1px solid #ddd; color: #111827;">相关系数</th><th style="padding: 3px; border: 1px solid #ddd; color: #111827;">趋势</th></tr>';
                
                for (let i = 0; i < monthly.length; i++) {
                  const m = monthly[i];
                  let trend = '';
                  let trendColor = '#666';
                  
                  if (i > 0) {
                    const diff = m.correlation - monthly[i - 1].correlation;
                    if (diff > 0.05) {
                      trend = '↑↑ 显著上升';
                      trendColor = '#10b981';
                    } else if (diff > 0.01) {
                      trend = '↑ 上升';
                      trendColor = '#34d399';
                    } else if (diff < -0.05) {
                      trend = '↓↓ 显著下降';
                      trendColor = '#ef4444';
                    } else if (diff < -0.01) {
                      trend = '↓ 下降';
                      trendColor = '#f87171';
                    } else {
                      trend = '→ 稳定';
                      trendColor = '#6b7280';
                    }
                  } else {
                    trend = '—';
                  }
                  
                  const bgColor = i % 2 === 0 ? '#ffffff' : '#f9fafb';
                  html += '<tr style="background: ' + bgColor + ';">';
                  html += '<td style="padding: 3px; border: 1px solid #ddd; color: #374151;">' + m.date + '</td>';
                  html += '<td style="padding: 3px; border: 1px solid #ddd; text-align: center; font-weight: bold; color: #111827;">' + m.correlation.toFixed(3) + '</td>';
                  html += '<td style="padding: 3px; border: 1px solid #ddd; text-align: center; color: ' + trendColor + ';">' + trend + '</td>';
                  html += '</tr>';
                }
                
                html += '</table>';
                
                // 计算波动范围
                const corrs = monthly.map(m => m.correlation);
                const minCorr = Math.min(...corrs);
                const maxCorr = Math.max(...corrs);
                const range = maxCorr - minCorr;
                
                html += '<div style="margin-top: 5px; font-size: 11px; color: #374151;">';
                html += '变化范围: ' + minCorr.toFixed(3) + ' ~ ' + maxCorr.toFixed(3) + ' (波动幅度: ' + range.toFixed(3) + ')';
                html += '</div>';
              } else {
                html += '<br/><br/><div style="color: #d97706; font-size: 11px;">⚠️ 无月度数据（调试: monthlyCorrelations.length=' + monthlyCorrelations.length + '）</div>';
              }
            }
            
            tooltip.innerHTML = html;
          });
          
          td.addEventListener('mouseleave', () => {
            document.getElementById('tooltip').style.display = 'none';
          });
          
          tr.appendChild(td);
        });
        
        tbody.appendChild(tr);
      });
    }

    generateHeatmap();
    
    // 生成平均相关性排名
    function generateRanking() {
      const rankings = [];
      
      // 计算每个币种的平均相关性和平均稳定性
      symbols.forEach((symbol, i) => {
        let totalCorr = 0;
        let totalStability = 0;
        let count = 0;
        
        symbols.forEach((otherSymbol, j) => {
          if (i !== j) {
            const corr = typeof correlationMatrix[symbol] === 'object'
              ? correlationMatrix[symbol][otherSymbol]
              : correlationMatrix[i][j];
            const stability = stabilityMatrix && typeof stabilityMatrix[symbol] === 'object'
              ? stabilityMatrix[symbol][otherSymbol]
              : (stabilityMatrix ? stabilityMatrix[i][j] : null);
            
            totalCorr += corr;
            if (stability !== null) {
              totalStability += stability;
            }
            count++;
          }
        });
        
        const avgCorr = totalCorr / count;
        const avgStability = count > 0 ? totalStability / count : 0;
        
        rankings.push({
          symbol: symbol,
          avgCorrelation: avgCorr,
          avgStability: avgStability
        });
      });
      
      // 按平均相关性排序（从大到小）
      rankings.sort((a, b) => b.avgCorrelation - a.avgCorrelation);
      
      // 生成表格
      const container = document.getElementById('rankingTable');
      let html = '<table style="width: 100%; border-collapse: collapse; font-size: 13px;">';
      html += '<thead><tr style="background: #f3f4f6;">';
      html += '<th style="padding: 10px; border: 1px solid #e5e7eb; text-align: center;">排名</th>';
      html += '<th style="padding: 10px; border: 1px solid #e5e7eb; text-align: left;">币种</th>';
      html += '<th style="padding: 10px; border: 1px solid #e5e7eb; text-align: center;">平均相关性</th>';
      if (analysisMonths > 1) {
        html += '<th style="padding: 10px; border: 1px solid #e5e7eb; text-align: center;">平均稳定性 (σ)</th>';
        html += '<th style="padding: 10px; border: 1px solid #e5e7eb; text-align: center;">稳定性评级</th>';
      }
      html += '<th style="padding: 10px; border: 1px solid #e5e7eb; text-align: left;">说明</th>';
      html += '</tr></thead><tbody>';
      
      rankings.forEach((item, index) => {
        const bgColor = index % 2 === 0 ? '#ffffff' : '#f9fafb';
        let ratingIcon = '';
        let ratingText = '';
        
        if (analysisMonths > 1) {
          if (item.avgStability < 0.05) {
            ratingIcon = '✨';
            ratingText = '非常稳定';
          } else if (item.avgStability < 0.10) {
            ratingIcon = '✅';
            ratingText = '较稳定';
          } else if (item.avgStability < 0.15) {
            ratingIcon = '⚠️';
            ratingText = '中等波动';
          } else {
            ratingIcon = '❌';
            ratingText = '波动较大';
          }
        }
        
        let description = '';
        if (item.avgCorrelation >= 0.7) {
          description = '🌟 市场领导者，与多数币种强相关';
        } else if (item.avgCorrelation >= 0.5) {
          description = '📊 中等相关性，适合作为配对候选';
        } else if (item.avgCorrelation >= 0.3) {
          description = '🔍 弱相关性，需谨慎选择配对';
        } else {
          description = '⚠️ 独立性强，不建议用于配对交易';
        }
        
        html += '<tr style="background: ' + bgColor + ';">';
        html += '<td style="padding: 10px; border: 1px solid #e5e7eb; text-align: center; font-weight: bold;">' + (index + 1) + '</td>';
        html += '<td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: 600;">' + item.symbol + '</td>';
        html += '<td style="padding: 10px; border: 1px solid #e5e7eb; text-align: center; font-weight: bold; color: ' + 
                (item.avgCorrelation >= 0.7 ? '#10b981' : item.avgCorrelation >= 0.5 ? '#3b82f6' : '#6b7280') + ';">' + 
                item.avgCorrelation.toFixed(3) + '</td>';
        
        if (analysisMonths > 1) {
          html += '<td style="padding: 10px; border: 1px solid #e5e7eb; text-align: center;">' + item.avgStability.toFixed(3) + '</td>';
          html += '<td style="padding: 10px; border: 1px solid #e5e7eb; text-align: center; font-size: 16px;" title="' + ratingText + '">' + ratingIcon + '</td>';
        }
        
        html += '<td style="padding: 10px; border: 1px solid #e5e7eb; font-size: 12px; color: #666;">' + description + '</td>';
        html += '</tr>';
      });
      
      html += '</tbody></table>';
      container.innerHTML = html;
    }
    
    generateRanking();
  </script>
</body>
</html>`;
  }

  /**
   * 生成多个配对的对比图表
   */
  generateComparisonChart(results) {
    const filename = `backtest_comparison_${Date.now()}.html`;
    const filepath = path.join(this.outputDir, filename);

    const html = this.generateComparisonHTML(results);
    fs.writeFileSync(filepath, html, 'utf-8');
    
    logger.info(`📊 对比图表已生成: ${filepath}`);
    return filepath;
  }

  /**
   * 生成对比HTML
   */
  generateComparisonHTML(results) {
    const labels = results.map(r => `${r.pair[0]} / ${r.pair[1]}`);
    const returns = results.map(r => r.totalReturn);
    const winRates = results.map(r => r.winRate);
    const drawdowns = results.map(r => -Math.abs(r.maxDrawdown));
    const sharpeRatios = results.map(r => r.sharpeRatio || 0);
    const correlations = results.map(r => r.correlation || 0);

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>回测对比 - 多配对分析</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
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
      max-width: 1400px;
      margin: 0 auto;
    }
    
    .header {
      background: white;
      border-radius: 10px;
      padding: 30px;
      margin-bottom: 20px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      text-align: center;
    }
    
    .header h1 {
      color: #333;
      margin-bottom: 10px;
      font-size: 28px;
    }
    
    .chart-container {
      background: white;
      border-radius: 10px;
      padding: 30px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      margin-bottom: 20px;
    }
    
    .chart-container h2 {
      color: #333;
      margin-bottom: 20px;
      font-size: 18px;
    }
    
    .chart-wrapper {
      position: relative;
      height: 400px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    
    th {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px;
      text-align: left;
      font-weight: 600;
    }
    
    td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    
    tbody tr:hover {
      background: #f9fafb;
    }
    
    .positive {
      color: #10b981;
      font-weight: 600;
    }
    
    .negative {
      color: #ef4444;
      font-weight: 600;
    }
    
    .pair-link {
      color: #3b82f6;
      text-decoration: none;
      font-weight: 600;
    }
    
    .pair-link:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 回测配对对比分析</h1>
      <p>生成时间: ${new Date().toLocaleString('zh-CN')}</p>
    </div>

    <div class="chart-container">
      <h2>收益率对比</h2>
      <div class="chart-wrapper">
        <canvas id="returnChart"></canvas>
      </div>
    </div>

    <div class="chart-container">
      <h2>胜率对比</h2>
      <div class="chart-wrapper">
        <canvas id="winRateChart"></canvas>
      </div>
    </div>

    <div class="chart-container">
      <h2>最大回撤对比</h2>
      <div class="chart-wrapper">
        <canvas id="drawdownChart"></canvas>
      </div>
    </div>

    <!-- 详细数据表格 -->
    <div class="chart-container">
      <h2>📋 详细数据对比</h2>
      <table>
        <thead>
          <tr>
            <th>排名</th>
            <th>交易对</th>
            <th>相关系数</th>
            <th>收益率</th>
            <th>夏普比率</th>
            <th>胜率</th>
            <th>最大回撤</th>
            <th>交易次数</th>
            <th>详细报告</th>
          </tr>
        </thead>
        <tbody id="dataTable">
        </tbody>
      </table>
    </div>
  </div>

  <script>
    const labels = ${JSON.stringify(labels)};
    const returns = ${JSON.stringify(returns)};
    const winRates = ${JSON.stringify(winRates)};
    const drawdowns = ${JSON.stringify(drawdowns)};
    const sharpeRatios = ${JSON.stringify(sharpeRatios)};
    const correlations = ${JSON.stringify(correlations)};
    const results = ${JSON.stringify(results)};

    // 收益率图表
    new Chart(document.getElementById('returnChart'), {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: '收益率 (%)',
          data: returns,
          backgroundColor: returns.map(r => r >= 0 ? 'rgba(16, 185, 129, 0.8)' : 'rgba(239, 68, 68, 0.8)'),
          borderColor: returns.map(r => r >= 0 ? '#10b981' : '#ef4444'),
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            ticks: {
              callback: value => value.toFixed(1) + '%'
            }
          }
        }
      }
    });

    // 胜率图表
    new Chart(document.getElementById('winRateChart'), {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: '胜率 (%)',
          data: winRates,
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: '#3b82f6',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            min: 0,
            max: 100,
            ticks: {
              callback: value => value + '%'
            }
          }
        }
      }
    });

    // 最大回撤图表
    new Chart(document.getElementById('drawdownChart'), {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: '最大回撤 (%)',
          data: drawdowns,
          backgroundColor: 'rgba(239, 68, 68, 0.8)',
          borderColor: '#ef4444',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            ticks: {
              callback: value => Math.abs(value).toFixed(1) + '%'
            }
          }
        }
      }
    });

    // 填充详细数据表格
    const tbody = document.getElementById('dataTable');
    results.forEach((result, index) => {
      const row = tbody.insertRow();
      const returnClass = result.totalReturn >= 0 ? 'positive' : 'negative';
      const sharpeClass = result.sharpeRatio >= 0 ? 'positive' : 'negative';
      
      // 使用实际生成的文件名
      const reportFile = result.reportFilename || 'N/A';
      const linkHtml = reportFile !== 'N/A' 
        ? \`<a href="\${reportFile}" class="pair-link" target="_blank">查看详情 →</a>\`
        : 'N/A';
      
      row.innerHTML = \`
        <td><strong>\${index + 1}</strong></td>
        <td><strong>\${result.pair[0]} / \${result.pair[1]}</strong></td>
        <td>\${result.correlation ? result.correlation.toFixed(3) : 'N/A'}</td>
        <td class="\${returnClass}">\${result.totalReturn >= 0 ? '+' : ''}\${result.totalReturn.toFixed(2)}%</td>
        <td class="\${sharpeClass}">\${result.sharpeRatio ? result.sharpeRatio.toFixed(2) : 'N/A'}</td>
        <td>\${result.winRate.toFixed(1)}%</td>
        <td class="negative">\${result.maxDrawdown.toFixed(2)}%</td>
        <td>\${result.totalTrades || 0}</td>
        <td>\${linkHtml}</td>
      \`;
    });
  </script>
</body>
</html>`;
  }
}

