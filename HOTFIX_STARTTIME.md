# 🔧 紧急修复：Parameter 'startTime' was empty

## 问题

错误信息：
```
Parameter 'startTime' was empty.
BadRequest: binance {"code":-1105,"msg":"Parameter 'startTime' was empty."}
```

## 原因

实盘交易时，`DataCollector.fetchOHLCV` 被调用时没有传入 `since` 参数，导致它为 `null`，而币安API要求必须提供一个有效的 `startTime`。

## ✅ 已修复

修改了 `src/statistical-arbitrage/DataCollector.js`：

- 当 `since` 为 `null` 或 `undefined` 时，自动计算起始时间
- 计算公式：`startTime = 现在时间 - (数据条数 × 时间周期)`
- 例如：获取110条15分钟K线 = 往前推 110 × 15分钟 ≈ 27.5小时

## 🚀 如何应用

### 在服务器上执行：

```bash
# 1. 上传修复后的文件
#    src/statistical-arbitrage/DataCollector.js

# 2. 重启PM2
pm2 restart stat-arb

# 3. 查看日志
pm2 logs stat-arb --lines 50
```

## 📊 预期结果

修复后，应该能看到：

```
📊 获取 ID/USDT 15m K线数据...
✅ 获取 110 条数据

📊 ID/USDT / HOOK/USDT [2025/10/28 23:00:01]
   💰 当前价格: ID/USDT=$0.50123456 | HOOK/USDT=$0.39876543
   📈 价格比率: 1.2567
   📊 相关系数: 0.823 ✨
   🎯 Z-Score: 1.04
   ⏸️ 信号: HOLD - 观望
   💼 持仓状态: 无持仓
```

## 🔍 验证修复

```bash
# 查看最新日志
pm2 logs stat-arb --lines 100

# 应该看到：
# ✅ 获取 XXX 条数据（不再有 startTime 错误）
# 📊 显示完整的价格和Z-Score信息
```

## 💡 技术细节

**修改前：**
```javascript
const ohlcv = await this.exchange.fetchOHLCV(symbol, timeframe, since, limit);
// 当 since = null 时，币安API报错
```

**修改后：**
```javascript
let startTime = since;
if (!startTime) {
  const timeframeMs = this.getTimeframeMs(timeframe);
  startTime = Date.now() - (limit * timeframeMs);
}
const ohlcv = await this.exchange.fetchOHLCV(symbol, timeframe, startTime, limit);
// startTime 始终有值
```

## 📝 修改文件

- ✅ `src/statistical-arbitrage/DataCollector.js` (行 62-69)

---

## 一键更新命令

```bash
# 上传文件后，运行：
pm2 restart stat-arb && sleep 2 && pm2 logs stat-arb --lines 50
```

---

祝修复顺利！🎉

