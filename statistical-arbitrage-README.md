# 📈 统计套利系统（配对交易）

基于相关性分析和协整检验的统计套利交易系统，适用于币安等加密货币交易所。

## 🎯 策略原理

### 配对交易（Pairs Trading）

配对交易是一种市场中性策略，通过寻找两个高度相关的资产，当它们的价格关系偏离历史均值时：

1. **价差扩大**（Z-Score > 2）：
   - 做空高位资产（卖出）
   - 做多低位资产（买入）
   - 等待价差回归

2. **价差缩小**（Z-Score < -2）：
   - 做多高位资产（买入）
   - 做空低位资产（卖出）
   - 等待价差回归

3. **价差回归**（|Z-Score| < 0.5）：
   - 平仓所有持仓
   - 获取价差回归的收益

### 示例

```
BTC/USDT 和 ETH/USDT 通常高度相关（相关系数 > 0.9）

历史价格比率均值: 15.0 (BTC价格 / ETH价格)
当前价格比率: 16.5
Z-Score: 2.5（价差扩大）

交易操作:
- 卖出 BTC（预期价格下跌）
- 买入 ETH（预期价格上涨）

当价格比率回归到 15.0 附近时平仓获利
```

## 📦 项目结构

```
src/statistical-arbitrage/
├── DataCollector.js          # 数据收集器
├── StatisticalAnalyzer.js    # 统计分析（相关性、协整性、Z-Score）
├── PairsStrategy.js           # 配对交易策略
├── Backtest.js                # 回测引擎
├── index.js                   # 主程序
└── config.js                  # 配置文件
```

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置

编辑 `src/statistical-arbitrage/config.js`：

```javascript
export default {
  exchange: {
    id: 'binance',
    apiKey: process.env.BINANCE_API_KEY,
    secret: process.env.BINANCE_SECRET
  },
  
  strategy: {
    // 监控的交易对
    symbols: ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', ...],
    
    // 相关性阈值
    minCorrelation: 0.75,
    
    // Z-Score阈值
    entryThreshold: 2.0,      // 开仓
    exitThreshold: 0.5,       // 平仓
    stopLossThreshold: 3.5,   // 止损
    
    // 资金管理
    initialCapital: 10000,
    tradeAmount: 1000,
    
    // 启用实盘（建议先回测）
    enableLiveTrading: false,
    autoTrade: false
  }
};
```

### 3. 寻找配对

```bash
node src/statistical-arbitrage/index.js --find-pairs
```

输出示例：
```
🔍 分析配对相关性...
─────────────────────────────────────────────

✅ 发现 12 个高相关性配对:

1. BTC/USDT / ETH/USDT
   相关系数: 0.956

2. MATIC/USDT / DOT/USDT
   相关系数: 0.882

3. SOL/USDT / AVAX/USDT
   相关系数: 0.876
```

### 4. 运行回测

**批量回测所有配对**：

```bash
node src/statistical-arbitrage/index.js --backtest
```

**单币对历史回测**（推荐）：

```bash
# 无需修改config.js，直接使用命令行参数
node src/statistical-arbitrage/backtest-single-pair.js \
  --symbol1=DOT/USDT \
  --symbol2=INJ/USDT \
  --start=2025-05-01 \
  --end=2025-05-31
```

单币对回测优势：
- ✅ **灵活**：命令行参数覆盖配置，无需修改config.js
- ✅ **快速**：跳过相关性分析，直接回测指定配对
- ✅ **历史验证**：测试策略在不同时间段的稳定性

回测输出：
```
📊 回测结果:
─────────────────────────────────────────────
初始资金: 10000.00 USDT
最终资金: 11250.00 USDT
总盈亏: 1250.00 USDT (12.50%)

📈 交易统计:
总交易次数: 25
盈利交易: 18 (72.0%)
亏损交易: 7
平均盈利: 95.50 USDT
平均亏损: 42.30 USDT
盈亏比: 2.26

⚠️  风险指标:
最大回撤: 5.32%
夏普比率: 1.85
平均持仓时间: 245 分钟
```

### 5. 实盘运行

⚠️ **在启用实盘前**：
- 先在回测中验证策略
- 确认配对的稳定性
- 从小额资金开始

启用实盘：

```javascript
// config.js
strategy: {
  enableLiveTrading: true,  // 启用实盘
  autoTrade: true,          // 启用自动交易
  tradeAmount: 500,         // 从小额开始
}
```

运行：
```bash
node src/statistical-arbitrage/index.js
```

## 📊 策略参数详解

### 相关性阈值（minCorrelation）

- **0.7-0.8**: 中等相关，配对较多但稳定性一般
- **0.8-0.9**: 强相关，推荐使用
- **0.9+**: 极强相关，最稳定但配对较少

### Z-Score阈值

```javascript
entryThreshold: 2.0      // 开仓阈值
- 1.5: 激进，交易频繁，风险高
- 2.0: 平衡，推荐
- 2.5: 保守，交易较少，胜率高

exitThreshold: 0.5       // 平仓阈值
- 0.3: 快速平仓，收益小
- 0.5: 推荐
- 1.0: 等待完全回归，可能错过平仓时机

stopLossThreshold: 3.5   // 止损阈值
- 3.0: 严格止损
- 3.5: 推荐
- 4.0: 宽松止损，承受更大回撤
```

### 时间周期（timeframe）

| 周期 | 适合场景 | 优点 | 缺点 |
|------|----------|------|------|
| 1m | 高频交易 | 机会多 | 噪音大，手续费高 |
| 5m | 短线交易 | 平衡 | 需要密切监控 |
| 1h | 日内交易 | 稳定性好 | 机会适中 |
| 4h | 波段交易 | 噪音小 | 机会较少 |
| 1d | 长线交易 | 最稳定 | 资金占用时间长 |

推荐：**1h**（日内交易，稳定性和机会数平衡）

### 回看周期（lookbackPeriod）

- **50-100**: 短期，适应快，但可能受噪音影响
- **100-200**: 中期，推荐
- **200+**: 长期，稳定但反应慢

## 🔍 配对选择建议

### 优质配对特征

1. **高相关性**: 相关系数 > 0.8
2. **相同板块**: 
   - Layer1（BTC, ETH, BNB）
   - Layer2（MATIC, ARB, OP）
   - DeFi（UNI, AAVE, CRV）
3. **协整性好**: CV < 0.1
4. **流动性充足**: 24h成交量 > 1000万USDT

### 推荐配对组合

**稳健型：**
```javascript
['BTC/USDT', 'ETH/USDT']    // 市值前2，最稳定
['ETH/USDT', 'BNB/USDT']    // 主流平台币
```

**进取型：**
```javascript
['SOL/USDT', 'AVAX/USDT']   // Layer1竞争者
['MATIC/USDT', 'DOT/USDT']  // 生态链
['LINK/USDT', 'UNI/USDT']   // DeFi龙头
```

**高风险：**
```javascript
['DOGE/USDT', 'SHIB/USDT']  // Meme币（高波动）
```

## 📈 回测分析

### 关键指标

1. **总收益率**: 
   - 目标: > 10%
   - 优秀: > 20%

2. **胜率**:
   - 目标: > 60%
   - 优秀: > 70%

3. **盈亏比**:
   - 目标: > 1.5
   - 优秀: > 2.0

4. **最大回撤**:
   - 可接受: < 15%
   - 优秀: < 10%

5. **夏普比率**:
   - 良好: > 1.0
   - 优秀: > 1.5
   - 卓越: > 2.0

### 回测示例分析

```javascript
// 配对: BTC/USDT vs ETH/USDT
// 时间: 最近100天，1小时K线

结果:
- 总收益: 15.3%
- 胜率: 68%
- 盈亏比: 2.1
- 最大回撤: 7.8%
- 夏普比率: 1.92

评价: ⭐⭐⭐⭐⭐ 优秀，可用于实盘
```

## ⚠️ 风险管理

### 1. 仓位管理

```javascript
strategy: {
  tradeAmount: 1000,        // 单次交易金额
  maxPositions: 3,          // 最大同时持仓
  positionSize: 0.5,        // 使用50%资金
}
```

### 2. 止损设置

- **Z-Score止损**: Z > 3.5 强制平仓
- **最大回撤**: 总资金回撤 > 20% 停止交易
- **单日亏损**: 单日亏损 > 500 USDT 停止交易

### 3. 监控告警

```javascript
// 需要人工介入的情况
- 价差持续不回归 (持仓超过48小时)
- Z-Score异常 (> 5)
- 连续3笔亏损
- 单笔亏损 > 10%
```

## 🛠️ 实盘建议

### 第一阶段：模拟（1-2周）

```javascript
enableLiveTrading: false,
autoTrade: false,
```

观察：
- 信号频率
- 持仓时间
- 回归速度

### 第二阶段：小额实盘（1个月）

```javascript
enableLiveTrading: true,
autoTrade: true,
tradeAmount: 100,  // 小额测试
```

验证：
- 实际滑点
- 手续费影响
- 执行延迟

### 第三阶段：正常运行

```javascript
tradeAmount: 1000,
maxPositions: 3,
```

持续优化：
- 调整参数
- 添加配对
- 风险控制

## 📊 性能基准

### 不同市场环境表现

| 市场状态 | 预期收益 | 胜率 | 交易频率 |
|----------|----------|------|----------|
| 震荡市 | 2-5%/月 | 65-75% | 高 |
| 上涨市 | 1-3%/月 | 55-65% | 中 |
| 下跌市 | 1-3%/月 | 55-65% | 中 |
| 极端波动 | -2-0%/月 | 40-50% | 低 |

**最适合**：震荡市场（配对相关性稳定）
**不适合**：极端单边市场（相关性失效）

## 🔧 优化方向

### 1. 动态参数调整

根据市场波动自动调整Z-Score阈值：

```javascript
// 高波动期：提高阈值
if (volatility > 0.05) {
  entryThreshold = 2.5;
}
```

### 2. 多周期确认

结合不同时间周期：

```javascript
// 1h周期信号 + 4h周期确认
const signal1h = getSignal('1h');
const signal4h = getSignal('4h');

if (signal1h === 'OPEN' && signal4h === 'OPEN') {
  // 双周期确认，可靠性更高
  openPosition();
}
```

### 3. 机器学习优化

使用历史数据训练最优参数：

```python
# 使用贝叶斯优化寻找最优参数
optimal_params = bayesian_optimize(
  entryThreshold: [1.5, 3.0],
  exitThreshold: [0.3, 1.0],
  lookback: [50, 200]
)
```

## 📚 相关资料

- [配对交易详解](https://www.investopedia.com/articles/trading/04/090804.asp)
- [统计套利策略](https://www.quantconnect.com/tutorials/strategy-library/pairs-trading-with-stocks)
- [协整检验](https://en.wikipedia.org/wiki/Cointegration)

## 🆘 常见问题

### Q: 为什么找不到高相关性的配对？

A: 尝试：
- 降低相关性阈值（0.7）
- 增加监控的交易对数量
- 更换时间周期（尝试 4h 或 1d）

### Q: 回测效果很好，但实盘亏损？

A: 可能原因：
- 过拟合（回测数据太少）
- 实际滑点和手续费高于预期
- 市场环境变化（相关性降低）

### Q: Z-Score一直不回归怎么办？

A: 
- 检查是否有重大新闻（市场结构改变）
- 及时止损（Z > 3.5）
- 考虑更换配对

### Q: 如何选择最佳配对？

A: 综合评估：
1. 相关系数 > 0.8
2. 回测收益 > 10%
3. 胜率 > 60%
4. 最大回撤 < 15%
5. 半衰期适中（10-50个周期）

---

## 📄 许可证

MIT License

## ⚖️ 免责声明

本策略仅供学习研究使用。加密货币交易有风险，请谨慎投资。

---

**祝交易顺利！** 📈💰

