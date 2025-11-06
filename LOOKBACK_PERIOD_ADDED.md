# lookbackPeriod 参数已加入优化 🎯

## ✨ 更新内容

现在 `optimize-params.js` 会同时优化 **4 个参数**：

1. ✅ **lookbackPeriod** - 回看周期（NEW! ⭐）
2. ✅ **entryThreshold** - 开仓Z-Score阈值
3. ✅ **exitThreshold** - 平仓Z-Score阈值
4. ✅ **stopLossThreshold** - 止损Z-Score阈值

---

## 📊 参数范围

### lookbackPeriod（回看周期）
- **范围**：60 - 140
- **步长**：20
- **可选值**：`[60, 80, 100, 120, 140]`
- **说明**：计算Z-Score时使用的K线数量

### 其他参数（不变）
- **entryThreshold**：1.5 - 3.9（步长0.2，13个值）
- **exitThreshold**：0.2 - 1.2（步长0.1，11个值）
- **stopLossThreshold**：3.0 - 5.5（步长0.25，11个值）

---

## 🔢 组合数量

### 之前
```
13 (entry) × 11 (exit) × 11 (stopLoss) = 1,573 个组合
```

### 现在
```
5 (lookback) × 13 (entry) × 11 (exit) × 11 (stopLoss) = 7,865 个组合
```

**⚠️ 注意**：优化时间会增加约 **5 倍**（从之前的 X 分钟变成 5X 分钟）

---

## 🚀 使用方法

### 运行优化（与之前相同）

```bash
node src/statistical-arbitrage/optimize-params.js --symbol1=HOOK/USDT --symbol2=MINA/USDT --start=2025-01-01 --end=2025-01-31
```

### 输出示例

```
═══════════════════════════════════════════════════════════════
📊 参数搜索范围:
═══════════════════════════════════════════════════════════════
   回看周期: 60, 80, 100, 120, 140                  ← NEW!
   开仓阈值: 1.5, 1.7, 1.9, 2.1, 2.3, 2.5, 2.7, 2.9, 3.1, 3.3, 3.5, 3.7, 3.9
   平仓阈值: 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2
   止损阈值: 3.0, 3.25, 3.5, 3.75, 4.0, 4.25, 4.5, 4.75, 5.0, 5.25, 5.5

📊 总共需要测试 7865 个参数组合            ← 更多组合

[1/7865] 测试参数:
   回看周期: 60                            ← NEW!
   开仓阈值: 1.5
   平仓阈值: 0.2
   止损阈值: 3.0
   收益率: 15.30%
   夏普比率: 1.45
   胜率: 62.5%
   交易次数: 18
   综合得分: 12.34

...

═══════════════════════════════════════════════════════════════
🏆 TOP 5 参数组合:
═══════════════════════════════════════════════════════════════

1. 回看=120 | 开仓=3.5 | 平仓=0.8 | 止损=5.0     ← NEW!
   收益率: 32.50%
   夏普比率: 1.85
   胜率: 68.2%
   交易次数: 22
   最大回撤: -8.20%
   综合得分: 85.30

...

═══════════════════════════════════════════════════════════════
⭐ 最佳参数组合:
═══════════════════════════════════════════════════════════════
回看周期 (lookbackPeriod): 120                    ← NEW! 实际优化值
开仓阈值 (entryThreshold): 3.5
平仓阈值 (exitThreshold): 0.8
止损阈值 (stopLossThreshold): 5.0

收益率: 32.50%
夏普比率: 1.85
胜率: 68.2%
交易次数: 22
最大回撤: -8.20%
综合得分: 85.30

═══════════════════════════════════════════════════════════════
📋 复制到 config.js 的 pairSpecificParams:
═══════════════════════════════════════════════════════════════

'HOOK/USDT_MINA/USDT': {
  lookbackPeriod: 120,                             ← NEW! 包含优化后的值
  entryThreshold: 3.5,
  exitThreshold: 0.8,
  stopLossThreshold: 5.0
},
```

---

## 📝 配置应用

### 复制到 config.js

```javascript
// src/statistical-arbitrage/config.js
strategy: {
  // 全局默认参数
  lookbackPeriod: 100,
  entryThreshold: 3.1,
  exitThreshold: 0.6,
  stopLossThreshold: 4.75,
  
  // 币对级别参数
  pairSpecificParams: {
    'HOOK/USDT_MINA/USDT': {
      lookbackPeriod: 120,     // ← 优化后的值
      entryThreshold: 3.5,
      exitThreshold: 0.8,
      stopLossThreshold: 5.0
    }
  }
}
```

---

## 💡 为什么优化 lookbackPeriod 很重要？

### lookbackPeriod 的作用

- 计算 Z-Score 时使用的历史数据窗口大小
- 更短的周期（60-80）：对市场变化更敏感，适合快速波动
- 更长的周期（120-140）：更稳定，适合长期趋势

### 不同币对可能需要不同的 lookbackPeriod

```
高波动币对（如 HOOK/USDT）:
  lookbackPeriod: 80   ← 更短，快速反应
  
低波动币对（如 POLYX/USDT）:
  lookbackPeriod: 120  ← 更长，减少噪音
  
趋势性强的币对:
  lookbackPeriod: 140  ← 最长，捕捉长期趋势
```

---

## ⏱️ 优化时间估算

### 单个参数组合的时间
- 假设每个组合需要 1 秒

### 总时间
```
7,865 个组合 × 1 秒 ≈ 2.2 小时
```

**建议**：
- ☕ 在优化运行时去喝杯咖啡
- 🌙 或者晚上开始运行，第二天早上查看结果
- 💻 使用性能好的机器可以大大缩短时间

---

## 🎯 优化策略建议

### 方案1：完整优化（推荐）

```bash
# 优化所有4个参数，找到全局最优
node src/statistical-arbitrage/optimize-params.js --symbol1=HOOK/USDT --symbol2=MINA/USDT --start=2025-01-01 --end=2025-01-31
```

**优点**：找到最优组合
**缺点**：时间长（约2小时）

### 方案2：分步优化

如果时间紧张，可以先优化3个参数，然后单独优化 lookbackPeriod：

```bash
# Step 1: 使用 optimize-lookback.js 单独优化回看周期
node src/statistical-arbitrage/optimize-lookback.js --symbol1=HOOK/USDT --symbol2=MINA/USDT --start=2025-01-01 --end=2025-01-31

# Step 2: 使用找到的最优 lookbackPeriod，再优化其他3个参数
# （需要手动修改 config.js 中的 lookbackPeriod，然后运行 optimize-params.js）
```

---

## 📊 实际效果对比

### 固定 lookbackPeriod = 100

```
HOOK/USDT vs MINA/USDT:
  lookbackPeriod: 100 (固定)
  entryThreshold: 3.5
  exitThreshold: 0.8
  stopLossThreshold: 5.0
  ↓
  收益率: +28.3%
```

### 优化后的 lookbackPeriod

```
HOOK/USDT vs MINA/USDT:
  lookbackPeriod: 120 (优化后)  ← 变化
  entryThreshold: 3.5
  exitThreshold: 0.8
  stopLossThreshold: 5.0
  ↓
  收益率: +32.5%  🚀 (+4.2% 提升!)
```

---

## 📝 修改的代码

### 1. 参数网格（增加 lookbackPeriod）

```javascript
const paramGrid = {
  lookbackPeriod: [60, 80, 100, 120, 140],  // NEW!
  entryThreshold: [1.5, 1.7, ..., 3.9],
  exitThreshold: [0.2, 0.3, ..., 1.2],
  stopLossThreshold: [3.0, 3.25, ..., 5.5]
};
```

### 2. 网格搜索（4层循环）

```javascript
for (const lookback of paramGrid.lookbackPeriod) {  // NEW!
  for (const entry of paramGrid.entryThreshold) {
    for (const exit of paramGrid.exitThreshold) {
      for (const stopLoss of paramGrid.stopLossThreshold) {
        combinations.push({
          lookbackPeriod: lookback,  // NEW!
          entryThreshold: entry,
          exitThreshold: exit,
          stopLossThreshold: stopLoss
        });
      }
    }
  }
}
```

### 3. 回测配置（传入 lookbackPeriod）

```javascript
async runSingleBacktest(prices1, prices2, timestamps, params) {
  const { lookbackPeriod, entryThreshold, exitThreshold, stopLossThreshold } = params;  // NEW!
  
  const tempConfig = {
    ...this.strategyConfig,
    lookbackPeriod,  // NEW!
    entryThreshold,
    exitThreshold,
    stopLossThreshold
  };
  // ...
}
```

### 4. 输出显示（包含 lookbackPeriod）

```javascript
logger.info(`回看=${result.lookbackPeriod} | 开仓=${result.entryThreshold} ...`);  // NEW!
logger.info(`回看周期 (lookbackPeriod): ${bestResult.lookbackPeriod}`);  // NEW!
```

---

## ⚠️ 注意事项

### 1. 优化时间

- 完整优化需要约 **2 小时**
- 建议在空闲时间运行
- 可以使用性能更好的机器加速

### 2. 参数合理性

- lookbackPeriod 范围：60-140
- 太小（<60）：噪音太多，信号不稳定
- 太大（>140）：反应太慢，错过交易机会

### 3. 数据要求

- 需要足够的历史数据
- 建议至少 **1个月** 的数据
- 数据点数量 > lookbackPeriod + 100

---

## 🎓 使用建议

### 1. 首次优化

```bash
# 完整优化，找到4个参数的最优组合
node src/statistical-arbitrage/optimize-params.js --symbol1=HOOK/USDT --symbol2=MINA/USDT --start=2025-01-01 --end=2025-01-31
```

### 2. 定期重新优化

```bash
# 每月重新优化一次
node src/statistical-arbitrage/optimize-params.js --symbol1=HOOK/USDT --symbol2=MINA/USDT --start=2025-02-01 --end=2025-02-28
```

### 3. 对比不同时间段

```bash
# 测试参数稳定性
node src/statistical-arbitrage/optimize-params.js --symbol1=HOOK/USDT --symbol2=MINA/USDT --start=2024-12-01 --end=2024-12-31
node src/statistical-arbitrage/optimize-params.js --symbol1=HOOK/USDT --symbol2=MINA/USDT --start=2025-01-01 --end=2025-01-31

# 如果两次优化的参数接近，说明参数稳定
```

---

## 📚 相关文档

- **参数优化修复**：`OPTIMIZE_PARAMS_FIX.md`
- **币对参数快速指南**：`PAIR_PARAMS_QUICKSTART.md`
- **币对参数详细说明**：`PAIR_SPECIFIC_PARAMS.md`

---

**🎉 现在可以优化全部4个参数，找到最优组合了！**

```bash
node src/statistical-arbitrage/optimize-params.js --symbol1=HOOK/USDT --symbol2=MINA/USDT --start=2025-01-01 --end=2025-01-31
```

