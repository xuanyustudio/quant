# 币对级别参数配置 🎯

## ✨ 新功能

每个交易币对现在可以有**独立的策略参数**，实现最大化收益！

### 支持的参数

每个币对可以单独配置：
- **`lookbackPeriod`** - 回看周期
- **`entryThreshold`** - 开仓Z-Score阈值
- **`exitThreshold`** - 平仓Z-Score阈值
- **`stopLossThreshold`** - 止损Z-Score阈值

---

## 🎯 为什么需要币对级别参数？

### 问题：一套参数不适合所有币对

不同的币对有不同的特性：
- **波动性不同**：HOOK/USDT 和 MINA/USDT 波动率差异大
- **相关性不同**：不同币对的价差回归速度不一致
- **最优参数不同**：经过 `optimize-params.js` 优化后，每个币对有各自的最优参数

### 解决方案：币对级别参数覆盖

```
全局默认参数（config.js）
      ↓
适用于所有币对
      ↓
币对特定参数（可选）
      ↓
覆盖全局默认，仅适用于该币对
```

---

## 📋 配置方法

### 1. 在 `config.js` 中配置

```javascript
// src/statistical-arbitrage/config.js

strategy: {
  // 全局默认参数
  lookbackPeriod: 100,
  entryThreshold: 3.1,
  exitThreshold: 0.6,
  stopLossThreshold: 4.75,
  
  // 币对级别参数（覆盖全局默认）
  pairSpecificParams: {
    'HOOK/USDT_MINA/USDT': {
      lookbackPeriod: 120,
      entryThreshold: 3.5,
      exitThreshold: 0.8,
      stopLossThreshold: 5.0
    },
    'POLYX/USDT_ID/USDT': {
      lookbackPeriod: 80,
      entryThreshold: 2.8,
      exitThreshold: 0.5,
      stopLossThreshold: 4.5
    }
  }
}
```

### 2. 使用 `optimize-params.js` 自动生成

```bash
# 优化单个币对的参数
npm run stat-arb:optimize-params -- --symbol1=HOOK/USDT --symbol2=MINA/USDT --start=2025-01-01 --end=2025-01-31

# 优化后，脚本会自动：
# 1. 找到最优参数
# 2. 生成配置代码
# 3. 可以直接复制到 config.js
```

### 3. 在实盘配置中使用

```json
// output/live_trading_config_xxx.json

{
  "pairs": [
    {
      "symbols": ["HOOK/USDT", "MINA/USDT"],
      "params": {
        "lookbackPeriod": 120,
        "entryThreshold": 3.5,
        "exitThreshold": 0.8,
        "stopLossThreshold": 5.0
      }
    }
  ]
}
```

---

## 🔄 参数优先级

```
币对特定参数 > 全局默认参数
```

### 示例

**配置**：
```javascript
// 全局默认
lookbackPeriod: 100,
entryThreshold: 3.1,

// 币对特定
pairSpecificParams: {
  'HOOK/USDT_MINA/USDT': {
    entryThreshold: 3.5
    // 没有设置 lookbackPeriod
  }
}
```

**实际使用**：
- `lookbackPeriod`: `100` （使用全局默认）
- `entryThreshold`: `3.5` （使用币对特定）

---

## 📊 使用场景

### 场景1：多币对实盘交易

```javascript
pairSpecificParams: {
  // 高波动币对 - 更大的阈值
  'HOOK/USDT_MINA/USDT': {
    entryThreshold: 3.5,
    stopLossThreshold: 5.5
  },
  
  // 低波动币对 - 更小的阈值
  'POLYX/USDT_ID/USDT': {
    entryThreshold: 2.5,
    stopLossThreshold: 4.0
  },
  
  // 快速回归币对 - 更短的回看期
  'BTC/USDT_ETH/USDT': {
    lookbackPeriod: 60,
    exitThreshold: 0.3
  }
}
```

### 场景2：参数优化后应用

```bash
# 1. 优化参数
npm run stat-arb:optimize-params -- --symbol1=HOOK/USDT --symbol2=MINA/USDT

# 2. 脚本输出最优参数：
#    最优参数组合:
#    lookbackPeriod: 120
#    entryThreshold: 3.5
#    exitThreshold: 0.8
#    stopLossThreshold: 5.0

# 3. 复制到 config.js 的 pairSpecificParams
```

### 场景3：回测比较

```javascript
// 测试1：使用全局参数
pairSpecificParams: {}  // 空对象

// 测试2：使用优化后的参数
pairSpecificParams: {
  'HOOK/USDT_MINA/USDT': {
    // ... 优化后的参数
  }
}

// 对比两次回测收益率
```

---

## 🛠️ 技术实现

### 1. 策略层 (`PairsStrategy.js`)

```javascript
export class PairsStrategy {
  constructor(config = {}) {
    // 全局默认参数
    this.defaultLookbackPeriod = config.lookbackPeriod || 100;
    this.defaultEntryThreshold = config.entryThreshold || 2.0;
    // ...
    
    // 币对级别参数
    this.pairSpecificParams = config.pairSpecificParams || {};
  }
  
  // 获取币对参数（优先使用币对级别）
  getPairParams(pairKey) {
    const pairParams = this.pairSpecificParams[pairKey] || {};
    
    return {
      lookbackPeriod: pairParams.lookbackPeriod || this.defaultLookbackPeriod,
      entryThreshold: pairParams.entryThreshold || this.defaultEntryThreshold,
      exitThreshold: pairParams.exitThreshold || this.defaultExitThreshold,
      stopLossThreshold: pairParams.stopLossThreshold || this.defaultStopLossThreshold
    };
  }
  
  analyzePair(symbol1, symbol2, prices1, prices2, pairKey) {
    // 获取币对参数
    const params = this.getPairParams(pairKey || `${symbol1}_${symbol2}`);
    
    // 使用币对参数进行分析
    const zScores = this.analyzer.calculateZScore(spread, params.lookbackPeriod);
    const signal = this.generateSignal(currentZScore, positionType, params);
    
    return {
      // ...
      params // 返回使用的参数
    };
  }
}
```

### 2. 回测引擎 (`Backtest.js`)

自动从配置读取并使用币对参数：
```javascript
const backtestConfig = {
  strategy: {
    lookbackPeriod: 100,  // 全局默认
    pairSpecificParams: {
      'HOOK/USDT_MINA/USDT': { /* ... */ }
    }
  }
};

const backtest = new Backtest(backtestConfig);
// 自动使用正确的参数
```

### 3. 实盘交易 (`index.js`)

自动从配置读取并使用币对参数：
```javascript
const analysis = this.strategy.analyzePair(
  symbol1,
  symbol2,
  closePrices1,
  closePrices2,
  pairKey  // ← 传入 pairKey，策略内部会查找对应参数
);

// analysis.params 包含实际使用的参数
logger.info(`使用参数: entry=${analysis.params.entryThreshold}`);
```

---

## 📝 完整示例

### 配置文件 (`config.js`)

```javascript
export default {
  strategy: {
    // ========== 全局默认参数 ==========
    lookbackPeriod: 100,
    entryThreshold: 3.1,
    exitThreshold: 0.6,
    stopLossThreshold: 4.75,
    
    // ========== 币对级别参数 ==========
    pairSpecificParams: {
      // 优化后的参数（来自 optimize-params.js）
      'HOOK/USDT_MINA/USDT': {
        lookbackPeriod: 120,
        entryThreshold: 3.5,
        exitThreshold: 0.8,
        stopLossThreshold: 5.0
      },
      
      'POLYX/USDT_ID/USDT': {
        lookbackPeriod: 80,
        entryThreshold: 2.8,
        exitThreshold: 0.5,
        stopLossThreshold: 4.5
      },
      
      // 更多币对...
    }
  }
}
```

### 回测脚本

```bash
# 使用配置的参数回测
npm run stat-arb:backtest-pair -- --symbol1=HOOK/USDT --symbol2=MINA/USDT --start=2025-01-01 --end=2025-01-31

# 回测会自动使用 pairSpecificParams 中配置的参数
# lookbackPeriod: 120
# entryThreshold: 3.5
# ...
```

### 实盘配置

```bash
# 生成实盘配置时，会包含币对参数
npm run stat-arb:portfolio-optimizer

# 生成的 JSON 中会包含：
{
  "pairs": [
    {
      "symbols": ["HOOK/USDT", "MINA/USDT"],
      "params": {
        "lookbackPeriod": 120,
        "entryThreshold": 3.5,
        // ...
      }
    }
  ]
}
```

---

## 🚀 工作流程

### 1. 优化参数

```bash
# 为每个币对优化参数
npm run stat-arb:optimize-params -- --symbol1=HOOK/USDT --symbol2=MINA/USDT --start=2025-01-01 --end=2025-01-31
```

**输出示例**：
```
╔═══════════════════════════════════════════════════════════════╗
║                    🏆 最优参数组合                            ║
╚═══════════════════════════════════════════════════════════════╝

参数：
  lookbackPeriod: 120
  entryThreshold: 3.5
  exitThreshold: 0.8
  stopLossThreshold: 5.0

收益：
  总收益: +$325.00
  收益率: +32.5%
  胜率: 68.2%

复制到 config.js 的 pairSpecificParams：

'HOOK/USDT_MINA/USDT': {
  lookbackPeriod: 120,
  entryThreshold: 3.5,
  exitThreshold: 0.8,
  stopLossThreshold: 5.0
}
```

### 2. 更新配置

```javascript
// config.js
pairSpecificParams: {
  'HOOK/USDT_MINA/USDT': {
    lookbackPeriod: 120,
    entryThreshold: 3.5,
    exitThreshold: 0.8,
    stopLossThreshold: 5.0
  }
}
```

### 3. 回测验证

```bash
npm run stat-arb:backtest-pair -- --symbol1=HOOK/USDT --symbol2=MINA/USDT --start=2025-01-01 --end=2025-01-31
```

### 4. 实盘部署

```bash
# 自动使用币对参数
npm run stat-arb:live -- --config=./output/live_trading_config_xxx.json
```

---

## 📊 收益对比示例

### 使用全局参数

```
lookbackPeriod: 100
entryThreshold: 3.1
exitThreshold: 0.6
stopLossThreshold: 4.75

回测结果：
  HOOK/USDT vs MINA/USDT: +15.3%
  POLYX/USDT vs ID/USDT: +12.8%
```

### 使用优化后的币对参数

```
HOOK/USDT vs MINA/USDT:
  lookbackPeriod: 120
  entryThreshold: 3.5
  → +32.5% 🚀

POLYX/USDT vs ID/USDT:
  lookbackPeriod: 80
  entryThreshold: 2.8
  → +28.7% 🚀
```

**收益提升**：
- HOOK/USDT vs MINA/USDT: `+17.2%` 提升
- POLYX/USDT vs ID/USDT: `+15.9%` 提升

---

## ⚠️ 注意事项

### 1. 过度优化风险

❌ **错误**：
```javascript
// 对历史数据过度拟合
'HOOK/USDT_MINA/USDT': {
  lookbackPeriod: 137,    // 过于精确
  entryThreshold: 3.4782, // 小数点过多
  exitThreshold: 0.6234
}
```

✅ **正确**：
```javascript
// 使用合理的参数范围
'HOOK/USDT_MINA/USDT': {
  lookbackPeriod: 140,  // 四舍五入到整数
  entryThreshold: 3.5,  // 保留1位小数
  exitThreshold: 0.6
}
```

### 2. 定期重新优化

市场条件会变化，建议：
- ✅ 每月重新优化参数
- ✅ 比较新旧参数的回测结果
- ✅ 逐步更新，不要一次性改所有参数

### 3. 回测验证

更新参数后：
- ✅ 在不同时间段回测
- ✅ 对比实盘表现
- ✅ 监控收益率变化

---

## 🎓 最佳实践

### 1. 参数优化流程

```bash
# 1. 收集数据（3-6个月）
# 2. 优化参数
npm run stat-arb:optimize-params -- --symbol1=HOOK/USDT --symbol2=MINA/USDT

# 3. 回测验证（不同时间段）
npm run stat-arb:backtest-pair -- --symbol1=HOOK/USDT --symbol2=MINA/USDT --start=2025-02-01 --end=2025-02-28

# 4. 小资金实盘测试
npm run stat-arb:live -- --config=./output/live_trading_config_xxx.json

# 5. 根据实盘表现调整
```

### 2. 参数管理

```javascript
// config.js
pairSpecificParams: {
  // 注释包含优化日期和原因
  
  // 优化日期: 2025-01-15
  // 原因: 提高收益率 15% → 32%
  'HOOK/USDT_MINA/USDT': {
    lookbackPeriod: 120,
    entryThreshold: 3.5,
    exitThreshold: 0.8,
    stopLossThreshold: 5.0
  },
  
  // 优化日期: 2025-01-20
  // 原因: 降低回撤 -15% → -8%
  'POLYX/USDT_ID/USDT': {
    lookbackPeriod: 80,
    entryThreshold: 2.8,
    exitThreshold: 0.5,
    stopLossThreshold: 4.5
  }
}
```

### 3. 监控和调整

```bash
# 定期检查实盘表现
pm2 logs stat-arb | grep "盈亏"

# 如果某个币对表现不佳，重新优化
npm run stat-arb:optimize-params -- --symbol1=POLYX/USDT --symbol2=ID/USDT
```

---

## 📚 相关文档

- **参数优化指南**：`docs/STATISTICAL_ARBITRAGE_GUIDE.md`
- **回测使用说明**：`docs/BACKTEST_FUTURES_GUIDE.md`
- **实盘部署清单**：`LIVE_TRADING_FUTURES_CHECKLIST.md`

---

**🎯 现在您可以为每个币对使用最优参数，最大化收益了！**

