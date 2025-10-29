# ⚡ 统计套利快速开始

5分钟快速启动配对交易策略！

## 🎯 什么是统计套利？

统计套利（配对交易）通过寻找两个高度相关的资产，当它们的价格关系偏离时进行反向操作，等待价格回归获利。

**简单例子：**
```
BTC 和 ETH 通常一起涨跌（相关性高）
某天 BTC 涨了 10%，但 ETH 只涨了 5%
→ BTC 相对 ETH "太贵了"
→ 卖出 BTC，买入 ETH
→ 等待价格关系回归正常
→ 获利平仓
```

## 🚀 快速开始

### 1. 配置 API

编辑 `.env` 文件：

```env
# 币安 API（如果国内访问受限，使用代理或国内交易所）
BINANCE_API_KEY=你的API密钥
BINANCE_SECRET=你的Secret密钥
```

### 2. 寻找配对

```bash
node src/statistical-arbitrage/index.js --find-pairs
```

输出：
```
🔍 分析配对相关性...
─────────────────────────────────────────────

✅ 发现 12 个高相关性配对:

1. BTC/USDT / ETH/USDT
   相关系数: 0.956  ⭐ 极强相关

2. SOL/USDT / AVAX/USDT
   相关系数: 0.876  ⭐ 强相关
```

### 3. 运行回测

测试策略的历史表现：

```bash
node src/statistical-arbitrage/index.js --backtest
```

回测结果：
```
📊 回测结果:
─────────────────────────────────────────────
初始资金: 10000.00 USDT
最终资金: 11250.00 USDT
总盈亏: 1250.00 USDT (12.50%) ✅

📈 交易统计:
总交易次数: 25
盈利交易: 18 (72.0%) ✅
亏损交易: 7

⚠️  风险指标:
最大回撤: 5.32% ✅
夏普比率: 1.85 ✅
```

### 4. 模拟运行

先不用真金白银，观察系统如何工作：

编辑 `src/statistical-arbitrage/config.js`：

```javascript
strategy: {
  enableLiveTrading: false,  // 关闭实盘
  autoTrade: false,          // 不自动交易
}
```

运行：
```bash
node src/statistical-arbitrage/index.js
```

会显示：
```
📊 BTC/USDT/ETH/USDT
   Z-Score: 2.3
   信号: OPEN_SHORT
   
📊 SOL/USDT/AVAX/USDT
   Z-Score: -0.8
   信号: HOLD
```

### 5. 启用实盘（谨慎！）

⚠️ 确认以下几点：
- [ ] 回测收益 > 10%
- [ ] 胜率 > 60%
- [ ] 最大回撤 < 15%
- [ ] 已在模拟模式运行 24 小时

启用实盘：

```javascript
strategy: {
  enableLiveTrading: true,   // 启用实盘 ⚠️
  autoTrade: true,           // 自动交易 ⚠️
  tradeAmount: 500,          // 从小额开始！
}
```

## 📊 配置调优

### 基础配置

```javascript
// src/statistical-arbitrage/config.js

strategy: {
  // 监控的币种（15-20个为宜）
  symbols: [
    'BTC/USDT', 'ETH/USDT', 'BNB/USDT',
    'SOL/USDT', 'AVAX/USDT', ...
  ],
  
  // 相关性要求（越高越稳定，但配对越少）
  minCorrelation: 0.75,  // 0.7-0.9
  
  // 开仓阈值（Z-Score）
  entryThreshold: 2.0,   // 1.5 激进 | 2.0 平衡 | 2.5 保守
  
  // 平仓阈值
  exitThreshold: 0.5,    // 0.3 快速 | 0.5 平衡 | 1.0 等待完全回归
  
  // 时间周期
  timeframe: '1h',       // 1m 高频 | 1h 推荐 | 4h 稳健
  
  // 每次交易金额
  tradeAmount: 1000,     // USDT
}
```

### 推荐参数组合

**稳健型（推荐新手）：**
```javascript
{
  minCorrelation: 0.85,
  entryThreshold: 2.5,
  exitThreshold: 0.5,
  timeframe: '1h',
  tradeAmount: 500
}
```

**平衡型（推荐）：**
```javascript
{
  minCorrelation: 0.8,
  entryThreshold: 2.0,
  exitThreshold: 0.5,
  timeframe: '1h',
  tradeAmount: 1000
}
```

**进取型（有经验）：**
```javascript
{
  minCorrelation: 0.75,
  entryThreshold: 1.5,
  exitThreshold: 0.3,
  timeframe: '15m',
  tradeAmount: 2000
}
```

## 💡 策略理解

### Z-Score 解读

```
Z-Score = (当前价差 - 平均价差) / 标准差

 Z > 2.0:  价差太大 → 做空价差（卖高买低）
-2.0 < Z < 2.0:  正常范围 → 持有或观望
 Z < -2.0: 价差太小 → 做多价差（买高卖低）
 |Z| < 0.5: 价差回归 → 平仓获利
```

### 实际案例

**案例 1：BTC/ETH 配对**

```
历史价格比率: BTC/ETH = 15.0 (平均)
标准差: 0.5

今日情况:
BTC: $45,000
ETH: $2,700
当前比率: 45000/2700 = 16.67

Z-Score = (16.67 - 15.0) / 0.5 = 3.34 (价差太大！)

操作:
1. 卖出 BTC (预期相对下跌)
2. 买入 ETH (预期相对上涨)

预期:
- BTC 跌到 $44,000 或
- ETH 涨到 $2,900 或
- 两者同时发生
→ 价格比率回归到 15.0 附近
→ 平仓获利
```

## 📈 回测解读

### 好的回测结果

```
✅ 总收益: > 10%
✅ 胜率: > 60%
✅ 盈亏比: > 1.5
✅ 最大回撤: < 15%
✅ 夏普比率: > 1.0
✅ 交易次数: 20-50 次（数据充足）
```

### 需要警惕

```
⚠️ 收益过高 (> 50%)  → 可能过拟合
⚠️ 胜率过高 (> 90%)  → 可能过拟合
⚠️ 交易次数太少 (< 10) → 数据不足
⚠️ 最大回撤大 (> 25%) → 风险太高
```

## 🛡️ 风险控制

### 1. 仓位管理

```javascript
// 永远不要满仓！
tradeAmount: 1000,     // 单次交易 1000 USDT
maxPositions: 3,       // 最多 3 个持仓
// 总占用: 3000 USDT
// 建议账户至少: 10000 USDT
```

### 2. 止损设置

```javascript
stopLossThreshold: 3.5,  // Z-Score > 3.5 强制平仓
maxDailyLoss: 500,       // 单日亏损超过 500 停止
```

### 3. 监控频率

```
每小时检查一次: 系统运行状态
每天检查一次: 持仓和盈亏
每周检查一次: 策略表现和参数优化
```

## ⚠️ 常见错误

### 1. 相关性失效

**现象：** 两个币种不再同步涨跌

**原因：**
- 重大新闻（某个币被交易所下架）
- 市场结构改变
- 极端行情

**处理：** 立即平仓，暂停该配对

### 2. 价差不回归

**现象：** Z-Score 持续在高位（> 3）

**原因：**
- 市场趋势改变
- 相关性结构性破坏

**处理：**
- Z > 3.5 止损
- 检查新闻和市场环境

### 3. 过度交易

**现象：** 交易频率太高，手续费吃掉利润

**原因：**
- 阈值设置太低
- 时间周期太短

**处理：**
- 提高 entryThreshold
- 使用更长时间周期（1h → 4h）

## 📋 每日检查清单

**运行前：**
- [ ] 检查配对相关性是否正常
- [ ] 确认 API 连接正常
- [ ] 检查账户余额充足

**运行中：**
- [ ] 查看当前持仓和盈亏
- [ ] 检查是否有异常信号
- [ ] 查看日志是否有错误

**运行后：**
- [ ] 记录当日交易情况
- [ ] 计算胜率和盈亏
- [ ] 必要时调整参数

## 🎯 优化建议

### 第一周

- 观察系统运行
- 记录所有信号
- 不要频繁调参数

### 第一个月

- 收集数据分析
- 找出最优配对
- 小幅调整参数

### 长期

- 定期回测验证
- 根据市场调整
- 添加新的配对

## 🆘 需要帮助？

1. **查看日志**
   ```bash
   cat logs/combined.log
   ```

2. **查看回测详情**
   ```bash
   node src/statistical-arbitrage/index.js --backtest
   ```

3. **重新寻找配对**
   ```bash
   node src/statistical-arbitrage/index.js --find-pairs
   ```

## 📚 深入学习

- 完整文档: `statistical-arbitrage-README.md`
- 策略原理: `docs/STRATEGIES.md`
- 风险管理: `docs/RISK_MANAGEMENT.md`

---

**祝交易顺利！记住：慢慢来，稳定盈利比暴富更重要！** 📈💰

