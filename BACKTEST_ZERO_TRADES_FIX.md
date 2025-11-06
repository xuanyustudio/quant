# 回测 0 交易问题诊断与解决

## 🐛 问题描述

运行回测命令：
```bash
node src/statistical-arbitrage/backtest-single-pair.js \
  --symbol1=ID/USDT \
  --symbol2=HOOK/USDT \
  --start=2025-10-01 \
  --end=2025-10-31 \
  --strategy=futures
```

结果：**0 笔交易**

## 📊 根本原因分析

### 1. ID/USDT 和 HOOK/USDT 配对问题

虽然整体相关系数高达 **0.970**，但：

| 时间段 | Z-Score | lookback 窗口相关性 | 状态 |
|--------|---------|---------------------|------|
| 10月2日 22:15 | -4.003 | 0.741 | ❌ 跳过（< 0.75） |
| 10月2日 22:30 | -3.614 | 0.696 | ❌ 跳过 |
| 10月6日 01:45 | **12.045** | 0.409 | ❌ 跳过 |
| 10月6日 02:00 | 6.075 | 0.415 | ❌ 跳过 |
| 10月16日 09:30 | -3.588 | **0.129** | ❌ 跳过（极低！） |

**结论：** 这两个币对在 10月 期间的**短期（25小时）相关性极不稳定**，经常出现走势不同步。

### 2. 参数问题

**当前配置（`config.js`）：**
```javascript
minCorrelation: 0.5,      // 最小相关系数
entryThreshold: 3.1,      // 开仓 Z-Score 阈值
enforceCorrelation: false // 已禁用相关性检查
```

即使禁用了相关性检查，如果 Z-Score 始终没有达到 **3.1**，也不会开仓。

## ✅ 解决方案（3选1）

### 方案 1：更换币对（强烈推荐⭐）

使用您实盘已验证的币对：

```bash
# MINA/USDT vs POLYX/USDT（实盘运行良好）
node src/statistical-arbitrage/backtest-single-pair.js \
  --symbol1=MINA/USDT \
  --symbol2=POLYX/USDT \
  --start=2025-10-01 \
  --end=2025-10-31 \
  --strategy=futures
```

**优势：**
- ✅ 实盘已验证相关性稳定
- ✅ 已有成功交易记录
- ✅ 不需要调整参数

### 方案 2：降低开仓阈值（测试用）

临时修改 `config.js`：

```javascript
strategy: {
  // ...
  entryThreshold: 2.0,     // 从 3.1 降到 2.0（更激进）
  exitThreshold: 0.5,
  stopLossThreshold: 3.5,
  enforceCorrelation: false  // 保持禁用
}
```

然后重新运行回测：
```bash
node src/statistical-arbitrage/backtest-single-pair.js \
  --symbol1=ID/USDT \
  --symbol2=HOOK/USDT \
  --start=2025-10-01 \
  --end=2025-10-31 \
  --strategy=futures
```

**注意：** 这只是为了测试策略逻辑，不代表这个配对适合实盘！

### 方案 3：使用已优化的币对组合

查看您实盘的配置，使用已经在交易的币对：

```bash
# 从您的实盘日志中可以看到这两对在交易
node src/statistical-arbitrage/backtest-single-pair.js \
  --symbol1=HOOK/USDT \
  --symbol2=MINA/USDT \
  --start=2025-10-01 \
  --end=2025-10-31 \
  --strategy=futures
```

## 🔍 如何验证配对是否合适

### 1. 检查整体相关性
```bash
# 应该 > 0.7
```

### 2. 检查短期相关性稳定性
- 在 lookback 窗口（100个15分钟K线 = 25小时）内，相关性波动应该小
- 如果相关性经常低于 0.5，说明配对不稳定

### 3. 检查 Z-Score 分布
- 应该有足够的 Z-Score > entryThreshold 的时刻
- 如果从未达到阈值，说明价差偏离不够大

## 📝 修复后的配置建议

**`src/statistical-arbitrage/config.js`（推荐配置）：**

```javascript
strategy: {
  // ========== 相关性分析 ==========
  minCorrelation: 0.6,         // 适中的相关性要求
  enforceCorrelation: true,    // ✅ 启用相关性检查（更安全）
  
  // ========== 交易信号 ==========
  lookbackPeriod: 100,
  entryThreshold: 2.5,         // 适中的开仓阈值
  exitThreshold: 0.5,
  stopLossThreshold: 4.0,
  
  // ========== 币对配置 ==========
  pairs: [
    ['MINA/USDT', 'POLYX/USDT'],  // ✅ 实盘验证
    ['HOOK/USDT', 'MINA/USDT']     // 可选
  ]
}
```

## 🚀 快速测试（3步）

### 1. 恢复推荐配置

修改 `src/statistical-arbitrage/config.js`：
```javascript
minCorrelation: 0.6,
enforceCorrelation: true,
entryThreshold: 2.5,
```

### 2. 运行已验证的币对
```bash
node src/statistical-arbitrage/backtest-single-pair.js \
  --symbol1=MINA/USDT \
  --symbol2=POLYX/USDT \
  --start=2025-10-01 \
  --end=2025-10-31 \
  --strategy=futures
```

### 3. 查看结果
应该看到：
- ✅ 交易次数 > 0
- ✅ 收益率和夏普比率数据
- ✅ 生成 HTML 报告

## 💡 关键要点

1. **不是所有高相关的币对都适合配对交易**
   - 整体相关性高 ≠ 短期相关性稳定
   - ID/USDT 和 HOOK/USDT 就是典型例子

2. **相关性检查很重要**
   - `enforceCorrelation: false` 只用于测试
   - 实盘应该启用，避免在不同步时开仓

3. **参数需要针对每个币对优化**
   - 使用 `optimize-params.js` 脚本
   - 不要盲目套用其他币对的参数

## 📄 相关文档

- `PAIR_SPECIFIC_PARAMS.md` - 币对级别参数配置
- `OPTIMIZE_PARAMS_FIX.md` - 参数优化脚本使用
- `OPTIMIZE_PARAMS_BUG_FIX.md` - 参数优化 Bug 修复

---

**更新时间：** 2025-10-30  
**状态：** 已修复 `lookbackPeriod` 问题，建议更换币对

