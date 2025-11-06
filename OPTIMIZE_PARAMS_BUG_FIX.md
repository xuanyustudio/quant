# 参数优化脚本 Bug 修复

## 🐛 问题描述

运行 `optimize-params.js` 时出现多个问题：

1. **lookbackPeriod 为 undefined**
   - 日志显示：`前undefined个数据点 (约NaN小时)`
   - 原因：`PairsStrategy` 构造函数中将 `lookbackPeriod` 改为了 `defaultLookbackPeriod`，但 `Backtest.js` 仍在访问 `this.strategy.lookbackPeriod`

2. **大量无效回测**
   - 7150 个参数组合中大部分都无交易
   - 导致优化过程耗时极长
   - 原因：参数网格过于密集

3. **日志输出混乱**
   - 每个参数组合都输出完整回测日志
   - 控制台被大量无用信息淹没
   - 难以找到有用的优化结果

4. **程序卡死**
   - 由于组合数量过多且每个都输出日志
   - 导致程序运行缓慢或卡死

## ✅ 修复方案

### 1. 修复 lookbackPeriod 未定义问题

**文件：** `src/statistical-arbitrage/PairsStrategy.js`

```javascript
export class PairsStrategy {
  constructor(config = {}) {
    this.config = config;
    this.analyzer = new StatisticalAnalyzer(config);
    
    // 全局默认策略参数
    this.defaultLookbackPeriod = config.lookbackPeriod || 100;
    this.defaultEntryThreshold = config.entryThreshold || 2.0;
    this.defaultExitThreshold = config.exitThreshold || 0.5;
    this.defaultStopLossThreshold = config.stopLossThreshold || 3.5;
    
    // ⚠️ 为了向后兼容，保留 lookbackPeriod 属性（Backtest.js 会用到）
    this.lookbackPeriod = this.defaultLookbackPeriod;  // ✅ 新增
    
    // ...
  }
}
```

**原因：**
- `Backtest.js` 第 110 行使用 `this.strategy.lookbackPeriod`
- 但在引入币对级别参数时，将其改为了 `defaultLookbackPeriod`
- 导致回测引擎获取不到正确的 `lookbackPeriod` 值

**解决：**
- 保留 `lookbackPeriod` 属性用于向后兼容
- 同时保留 `defaultLookbackPeriod` 用于币对级别参数系统

### 2. 优化参数网格

**文件：** `src/statistical-arbitrage/optimize-params.js`

**修改前：**
```javascript
const paramGrid = {
  lookbackPeriod: [60, 80, 100, 120, 140],                    // 5个
  entryThreshold: [1.5, 1.7, 1.9, ..., 3.9],                 // 13个
  exitThreshold: [0.2, 0.3, 0.4, ..., 1.2],                  // 11个
  stopLossThreshold: [3.0, 3.25, 3.5, ..., 5.5]              // 11个
};
// 总组合数：5 * 13 * 11 * 11 ≈ 7,865 个（满足约束后约 7,150 个）
```

**修改后：**
```javascript
const paramGrid = {
  // 回看周期：60-140，步长20（5个值）
  lookbackPeriod: [60, 80, 100, 120, 140],
  
  // 开仓阈值：2.0-4.0，步长0.5（5个值，覆盖主要范围）
  entryThreshold: [2.0, 2.5, 3.0, 3.5, 4.0],
  
  // 平仓阈值：0.3-1.0，步长0.2（4个值）
  exitThreshold: [0.3, 0.5, 0.7, 1.0],
  
  // 止损阈值：3.5-5.5，步长0.5（5个值）
  stopLossThreshold: [3.5, 4.0, 4.5, 5.0, 5.5]
};
// 总组合数：5 * 5 * 4 * 5 = 500 个（满足约束后约 400-450 个）
```

**优化结果：**
- 组合数量从 **7,150** 减少到 **~450** 个（减少 **94%**）
- 预计运行时间从 **数小时** 减少到 **10-20分钟**
- 参数范围仍然覆盖了合理的策略空间

### 3. 启用静默模式

**文件：** `src/statistical-arbitrage/optimize-params.js`

```javascript
async runSingleBacktest(prices1, prices2, timestamps, params) {
  // ...
  
  // 运行回测（静默模式，不生成报告）
  const result = await backtest.run(
    this.symbol1,
    this.symbol2,
    prices1,
    prices2,
    timestamps,
    { generateReport: false }  // ✅ 优化时禁用详细日志
  );
  
  return result;
}
```

**效果：**
- 不再输出每个参数组合的详细回测日志
- 只显示关键信息：测试进度、收益率、夏普比率、胜率等
- 控制台输出清晰简洁，易于查看优化进度

### 4. 改进进度显示

**已有的进度输出：**
```javascript
logger.info(`[${i + 1}/${combinations.length}] 测试参数:`);
logger.info(`   回看周期: ${params.lookbackPeriod}`);
logger.info(`   开仓阈值: ${params.entryThreshold}`);
logger.info(`   平仓阈值: ${params.exitThreshold}`);
logger.info(`   止损阈值: ${params.stopLossThreshold}`);
```

**结果输出：**
```javascript
logger.info(`   收益率: ${(result.totalReturn || 0).toFixed(2)}%`);
logger.info(`   夏普比率: ${(result.sharpeRatio || 0).toFixed(2)}`);
logger.info(`   胜率: ${(result.winRate || 0).toFixed(1)}%`);
logger.info(`   交易次数: ${result.totalTrades || 0}`);
logger.info(`   综合得分: ${score.toFixed(2)}`);
```

## 📊 优化效果对比

| 指标 | 修复前 | 修复后 |
|------|--------|--------|
| 参数组合数量 | ~7,150 | ~450 |
| 预计运行时间 | 3-5 小时 | 10-20 分钟 |
| 日志输出量 | 极多（难以查看） | 精简（清晰易读） |
| lookbackPeriod | undefined | 正常 |
| 预热期显示 | `前undefined个数据点 (约NaN小时)` | `前100个数据点 (约25.0小时)` |

## 🚀 使用方法

```bash
# 运行参数优化（修复后）
node src/statistical-arbitrage/optimize-params.js \
  --symbol1=HOOK/USDT \
  --symbol2=MINA/USDT \
  --start=2025-01-01 \
  --end=2025-01-31

# 或使用 npm 命令
npm run stat-arb:optimize-params -- \
  --symbol1=HOOK/USDT \
  --symbol2=MINA/USDT \
  --start=2025-01-01 \
  --end=2025-01-31
```

**预期输出：**
```
📊 参数搜索范围:
   回看周期: 60, 80, 100, 120, 140
   开仓阈值: 2.0, 2.5, 3.0, 3.5, 4.0
   平仓阈值: 0.3, 0.5, 0.7, 1.0
   止损阈值: 3.5, 4.0, 4.5, 5.0, 5.5

🔍 开始网格搜索...
📊 总共需要测试 450 个参数组合

[1/450] 测试参数:
   回看周期: 60
   开仓阈值: 2.0
   平仓阈值: 0.5
   止损阈值: 4.0
   收益率: 8.50%
   夏普比率: 1.25
   胜率: 62.5%
   交易次数: 8
   综合得分: 12.34

...

⭐ 最佳参数组合:
   回看周期 (lookbackPeriod): 100
   开仓阈值 (entryThreshold): 3.0
   平仓阈值 (exitThreshold): 0.5
   止损阈值 (stopLossThreshold): 4.5
```

## 💡 下一步优化建议

如果您希望进一步提高优化速度，可以：

1. **减少数据量**
   ```bash
   # 使用更短的时间范围
   --start=2025-08-15 --end=2025-08-30  # 只用半个月数据
   ```

2. **使用两阶段优化**
   - 第一阶段：粗粒度搜索（当前参数网格）
   - 第二阶段：在最佳参数附近细化搜索

3. **并行优化**（未实现）
   - 可以考虑使用 worker threads 并行测试多个参数组合

## 📝 相关文件

- `src/statistical-arbitrage/PairsStrategy.js` - 修复 lookbackPeriod
- `src/statistical-arbitrage/optimize-params.js` - 优化参数网格和启用静默模式
- `src/statistical-arbitrage/Backtest.js` - 回测引擎（已支持 generateReport 参数）

## ✅ 验证

修复后，应该不再出现以下问题：
- ❌ `前undefined个数据点 (约NaN小时)`
- ❌ `Invalid Date`
- ❌ 大量 "回测结果无效，跳过此参数组合"
- ❌ 程序卡死或运行过慢

修复后，应该看到：
- ✅ `前100个数据点 (约25.0小时)`
- ✅ 正常的时间显示
- ✅ 快速的优化进度（10-20分钟完成）
- ✅ 清晰的结果输出

---

**修复时间：** 2025-10-30  
**版本：** v2.1.0

