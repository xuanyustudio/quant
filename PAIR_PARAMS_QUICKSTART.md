# 币对参数优化快速指南 ⚡

## 🎯 快速开始（3步搞定）

###  第1步：优化参数

```bash
npm run stat-arb:optimize-params -- --symbol1=HOOK/USDT --symbol2=MINA/USDT --start=2025-01-01 --end=2025-01-31
```

### 第2步：复制配置

脚本会输出类似这样的配置：

```
═══════════════════════════════════════════════════════════════
📋 复制到 config.js 的 pairSpecificParams:
═══════════════════════════════════════════════════════════════

'HOOK/USDT_MINA/USDT': {
  lookbackPeriod: 100,  // 可选，默认使用全局值
  entryThreshold: 3.5,
  exitThreshold: 0.8,
  stopLossThreshold: 5.0
},
```

**复制这段代码！**

### 第3步：更新配置文件

打开 `src/statistical-arbitrage/config.js`，找到 `pairSpecificParams` 部分：

```javascript
// src/statistical-arbitrage/config.js
strategy: {
  // ... 其他配置 ...
  
  // ========== 币对级别参数 ==========
  pairSpecificParams: {
    // 粘贴优化后的配置到这里 ↓
    'HOOK/USDT_MINA/USDT': {
      entryThreshold: 3.5,
      exitThreshold: 0.8,
      stopLossThreshold: 5.0
    },
    
    // 可以添加更多币对...
  }
}
```

保存文件即可！🎉

---

## 🚀 完整工作流程

### 1. 为每个币对优化参数

```bash
# 币对1: HOOK/USDT vs MINA/USDT
npm run stat-arb:optimize-params -- --symbol1=HOOK/USDT --symbol2=MINA/USDT --start=2025-01-01 --end=2025-01-31

# 币对2: POLYX/USDT vs ID/USDT
npm run stat-arb:optimize-params -- --symbol1=POLYX/USDT --symbol2=ID/USDT --start=2025-01-01 --end=2025-01-31
```

### 2. 更新 config.js

```javascript
pairSpecificParams: {
  'HOOK/USDT_MINA/USDT': {
    entryThreshold: 3.5,
    exitThreshold: 0.8,
    stopLossThreshold: 5.0
  },
  'POLYX/USDT_ID/USDT': {
    entryThreshold: 2.8,
    exitThreshold: 0.5,
    stopLossThreshold: 4.5
  }
}
```

### 3. 回测验证

```bash
# 回测币对1
npm run stat-arb:backtest-pair -- --symbol1=HOOK/USDT --symbol2=MINA/USDT --start=2025-01-01 --end=2025-01-31

# 回测币对2
npm run stat-arb:backtest-pair -- --symbol1=POLYX/USDT --symbol2=ID/USDT --start=2025-01-01 --end=2025-01-31
```

### 4. 实盘部署

```bash
npm run stat-arb:live -- --config=./output/live_trading_config_xxx.json
```

---

## 📊 优化输出示例

### 完整输出

```
═══════════════════════════════════════════════════════════════
📊 参数优化结果
═══════════════════════════════════════════════════════════════

🏆 TOP 5 参数组合:

1. 开仓=3.5 | 平仓=0.8 | 止损=5.0
   收益率: 32.50%
   夏普比率: 1.85
   胜率: 68.2%
   交易次数: 22
   最大回撤: -8.20%
   综合得分: 85.30

2. 开仓=3.3 | 平仓=0.7 | 止损=4.75
   收益率: 28.30%
   夏普比率: 1.72
   胜率: 65.0%
   交易次数: 25
   最大回撤: -9.50%
   综合得分: 80.15

...

═══════════════════════════════════════════════════════════════
⭐ 最佳参数组合:
═══════════════════════════════════════════════════════════════
回看周期 (lookbackPeriod): 100 (使用默认值，或单独优化)
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
  lookbackPeriod: 100,  // 可选，默认使用全局值
  entryThreshold: 3.5,
  exitThreshold: 0.8,
  stopLossThreshold: 5.0
},

完整配置示例:

// src/statistical-arbitrage/config.js
strategy: {
  // ...其他配置...
  
  pairSpecificParams: {
    'HOOK/USDT_MINA/USDT': {
      entryThreshold: 3.5,
      exitThreshold: 0.8,
      stopLossThreshold: 5.0
    }
  }
}
```

---

## 💡 高级技巧

### 同时优化多个币对

```bash
# 创建批量优化脚本 optimize-all.sh
#!/bin/bash

pairs=(
  "HOOK/USDT MINA/USDT"
  "POLYX/USDT ID/USDT"
  "BTC/USDT ETH/USDT"
)

for pair in "${pairs[@]}"; do
  IFS=' ' read -r symbol1 symbol2 <<< "$pair"
  echo "优化 $symbol1 vs $symbol2..."
  npm run stat-arb:optimize-params -- --symbol1=$symbol1 --symbol2=$symbol2 --start=2025-01-01 --end=2025-01-31
  echo ""
done
```

### 不同时间段测试

```bash
# 测试1: 牛市
npm run stat-arb:optimize-params -- --symbol1=HOOK/USDT --symbol2=MINA/USDT --start=2024-10-01 --end=2024-11-30

# 测试2: 熊市
npm run stat-arb:optimize-params -- --symbol1=HOOK/USDT --symbol2=MINA/USDT --start=2025-01-01 --end=2025-02-28

# 选择在两种情况下都表现好的参数
```

### 参数稳定性测试

```bash
# 在不同时间段使用相同参数回测
npm run stat-arb:backtest-pair -- --symbol1=HOOK/USDT --symbol2=MINA/USDT --start=2024-12-01 --end=2024-12-31
npm run stat-arb:backtest-pair -- --symbol1=HOOK/USDT --symbol2=MINA/USDT --start=2025-01-01 --end=2025-01-31

# 如果两个月收益都不错，说明参数稳定
```

---

## ⚠️ 注意事项

### 1. 不要过度优化

❌ **错误**：使用1周的数据优化参数
```bash
npm run stat-arb:optimize-params -- --symbol1=HOOK/USDT --symbol2=MINA/USDT --start=2025-01-24 --end=2025-01-31
```

✅ **正确**：使用至少1个月的数据
```bash
npm run stat-arb:optimize-params -- --symbol1=HOOK/USDT --symbol2=MINA/USDT --start=2025-01-01 --end=2025-01-31
```

### 2. 验证参数有效性

优化完成后：
- ✅ 在不同时间段回测
- ✅ 检查交易次数（太少或太多都不好）
- ✅ 检查最大回撤（不应该超过20%）

### 3. 定期更新参数

- ✅ 每月重新优化一次
- ✅ 监控实盘表现
- ✅ 如果实盘收益率明显低于回测，重新优化

---

## 📋 配置模板

### 基础配置

```javascript
// config.js
strategy: {
  // 全局默认参数
  lookbackPeriod: 100,
  entryThreshold: 3.1,
  exitThreshold: 0.6,
  stopLossThreshold: 4.75,
  
  // 币对参数（优化后粘贴到这里）
  pairSpecificParams: {
    // 在这里添加优化后的参数
  }
}
```

### 多币对配置

```javascript
pairSpecificParams: {
  'HOOK/USDT_MINA/USDT': {
    entryThreshold: 3.5,
    exitThreshold: 0.8,
    stopLossThreshold: 5.0
  },
  'POLYX/USDT_ID/USDT': {
    entryThreshold: 2.8,
    exitThreshold: 0.5,
    stopLossThreshold: 4.5
  },
  'BTC/USDT_ETH/USDT': {
    lookbackPeriod: 60,  // 快速回归币对
    entryThreshold: 2.5,
    exitThreshold: 0.3,
    stopLossThreshold: 4.0
  }
}
```

---

## 🎓 学习资源

- **详细文档**：`PAIR_SPECIFIC_PARAMS.md`
- **参数优化指南**：`docs/STATISTICAL_ARBITRAGE_GUIDE.md`
- **回测使用说明**：`docs/BACKTEST_FUTURES_GUIDE.md`

---

**🎉 现在开始优化您的第一个币对参数吧！**

```bash
npm run stat-arb:optimize-params -- --symbol1=HOOK/USDT --symbol2=MINA/USDT --start=2025-01-01 --end=2025-01-31
```

