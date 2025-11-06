# optimize-params.js 修复说明 🔧

## ✅ 已修复的问题

### 问题1：命令行参数不生效

**症状**：
```bash
node src/statistical-arbitrage/optimize-params.js --symbol1=HOOK/USDT --symbol2=MINA/USDT --start=2025-01-01 --end=2025-01-31
# 但输出还是显示 FIL/USDT 和 OP/USDT
```

**原因**：脚本硬编码了币对，没有读取命令行参数

**修复**：添加了命令行参数解析功能

```javascript
// 新增：解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const params = {};
  
  args.forEach(arg => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.substring(2).split('=');
      params[key] = value;
    }
  });
  
  return params;
}

// 新增：验证参数
function validateParams(params) {
  if (!params.symbol1 || !params.symbol2) {
    logger.error('❌ 缺少必需参数！');
    // ... 显示使用方法
    process.exit(1);
  }
}

// 主函数中使用
const params = parseArgs();
validateParams(params);

const symbol1 = params.symbol1;  // 从命令行获取
const symbol2 = params.symbol2;  // 从命令行获取
const startDate = params.start;  // 从命令行获取
const endDate = params.end;      // 从命令行获取
```

---

### 问题2：回测失败 - toFixed() 错误

**症状**：
```
error: ❌ 回测失败: Cannot read properties of undefined (reading 'toFixed')
```

**原因**：当回测没有交易或失败时，result 中的某些字段是 undefined

**修复**：添加了空值检查和默认值

```javascript
// 修复前
logger.info(`收益率: ${result.totalReturn.toFixed(2)}%`);  // result.totalReturn 可能是 undefined

// 修复后
logger.info(`收益率: ${(result.totalReturn || 0).toFixed(2)}%`);  // 使用默认值 0

// 新增：回测结果有效性检查
if (!result || result.totalReturn === undefined || result.sharpeRatio === undefined) {
  logger.warn(`⚠️  回测结果无效，跳过此参数组合`);
  continue;
}
```

---

## 🚀 现在可以正常使用了

### 正确用法

```bash
# 方法1：直接运行（推荐）
node src/statistical-arbitrage/optimize-params.js --symbol1=HOOK/USDT --symbol2=MINA/USDT --start=2025-01-01 --end=2025-01-31

# 方法2：使用 npm 命令
npm run stat-arb:optimize-params -- --symbol1=HOOK/USDT --symbol2=MINA/USDT --start=2025-01-01 --end=2025-01-31

# 方法3：不指定时间范围（使用默认）
node src/statistical-arbitrage/optimize-params.js --symbol1=HOOK/USDT --symbol2=MINA/USDT
```

---

## 📊 预期输出

```
═══════════════════════════════════════════════════════════════
🎯 参数优化 - HOOK/USDT ↔ MINA/USDT
═══════════════════════════════════════════════════════════════

📅 时间范围: 2025-01-01 至 2025-01-31
📊 数据范围: 744 小时 (2976 条K线)

═══════════════════════════════════════════════════════════════
🔍 开始网格搜索...
═══════════════════════════════════════════════════════════════

📊 总共需要测试 XXX 个参数组合

[1/XXX] 测试参数:
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
```

---

## 📝 修改的代码部分

### 1. 命令行参数解析

```javascript
// 新增函数
function parseArgs() { ... }
function validateParams(params) { ... }

// 主函数修改
async function main() {
  // 解析参数
  const params = parseArgs();
  validateParams(params);
  
  // 使用参数
  const symbol1 = params.symbol1;
  const symbol2 = params.symbol2;
  const startDate = params.start;
  const endDate = params.end;
  
  // 计算时间范围
  if (startDate && endDate) {
    since = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    // ...
  }
}
```

### 2. 空值检查

```javascript
// gridSearch 方法中
// 检查结果是否有效
if (!result || result.totalReturn === undefined || result.sharpeRatio === undefined) {
  logger.warn(`⚠️  回测结果无效，跳过此参数组合`);
  continue;
}

// 使用默认值
logger.info(`收益率: ${(result.totalReturn || 0).toFixed(2)}%`);
logger.info(`夏普比率: ${(result.sharpeRatio || 0).toFixed(2)}`);
logger.info(`胜率: ${(result.winRate || 0).toFixed(1)}%`);
logger.info(`交易次数: ${result.totalTrades || 0}`);

// calculateScore 方法中
const returnScore = (result.totalReturn || 0) * 0.4;
const sharpeScore = (result.sharpeRatio || 0) * 10 * 0.3;
const winRateScore = ((result.winRate || 50) - 50) * 0.2;
const totalTrades = result.totalTrades || 0;

// printResults 方法中
logger.info(`收益率: ${(bestResult.totalReturn || 0).toFixed(2)}%`);
logger.info(`夏普比率: ${(bestResult.sharpeRatio || 0).toFixed(2)}`);
logger.info(`胜率: ${(bestResult.winRate || 0).toFixed(1)}%`);
logger.info(`交易次数: ${bestResult.totalTrades || 0}`);
logger.info(`最大回撤: ${(bestResult.maxDrawdown || 0).toFixed(2)}%`);
logger.info(`综合得分: ${(bestResult.score || 0).toFixed(2)}`);
```

---

## ✅ 测试验证

### 测试1：正常运行

```bash
node src/statistical-arbitrage/optimize-params.js --symbol1=HOOK/USDT --symbol2=MINA/USDT --start=2025-01-01 --end=2025-01-31

# 应该输出：
# 🎯 参数优化 - HOOK/USDT ↔ MINA/USDT  ✅
# （不再是 FIL/USDT ↔ OP/USDT）
```

### 测试2：缺少参数

```bash
node src/statistical-arbitrage/optimize-params.js

# 应该输出：
# ❌ 缺少必需参数！
# 使用方法:
# node src/statistical-arbitrage/optimize-params.js --symbol1=HOOK/USDT --symbol2=MINA/USDT ...
```

### 测试3：不指定时间范围

```bash
node src/statistical-arbitrage/optimize-params.js --symbol1=HOOK/USDT --symbol2=MINA/USDT

# 应该输出：
# ⚠️  未指定时间范围，将使用默认时间范围
# 然后正常运行
```

---

## 🎯 完整使用流程

### 1. 优化参数

```bash
node src/statistical-arbitrage/optimize-params.js --symbol1=HOOK/USDT --symbol2=MINA/USDT --start=2025-01-01 --end=2025-01-31
```

### 2. 复制配置

从输出中复制：
```javascript
'HOOK/USDT_MINA/USDT': {
  entryThreshold: 3.5,
  exitThreshold: 0.8,
  stopLossThreshold: 5.0
},
```

### 3. 更新 config.js

```javascript
// src/statistical-arbitrage/config.js
pairSpecificParams: {
  'HOOK/USDT_MINA/USDT': {
    entryThreshold: 3.5,
    exitThreshold: 0.8,
    stopLossThreshold: 5.0
  }
}
```

### 4. 回测验证

```bash
npm run stat-arb:backtest-pair -- --symbol1=HOOK/USDT --symbol2=MINA/USDT --start=2025-01-01 --end=2025-01-31
```

---

## 🔗 相关文档

- **币对参数快速指南**: `PAIR_PARAMS_QUICKSTART.md`
- **币对参数详细说明**: `PAIR_SPECIFIC_PARAMS.md`
- **参数更新总结**: `PAIR_PARAMS_UPDATE.md`

---

**✅ 修复完成！现在可以正常使用优化功能了！**

