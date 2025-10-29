# 配对交易自动下单功能 - 更新说明

## ✅ 已完成的更新

### 1. 实现真正的自动下单

之前的系统只是**信号监控**，现在已经实现**真实订单执行**：

#### 更新文件
- `src/statistical-arbitrage/index.js`

#### 新增方法

**`executeOpenPosition(position, signal)`** - 执行开仓订单
- 根据信号类型决定交易方向
- 同时向交易所提交两个市价单
- 自动处理失败回滚

**`executeClosePosition(position)`** - 执行平仓订单
- 反向平掉两个持仓
- 锁定盈亏

### 2. 完整的交易流程

```
信号生成 → 策略记录 → 真实下单 → 交易所成交 → 持仓管理
```

#### 开仓流程
```javascript
// 1. 检测到开仓信号
if (signal.action === 'OPEN_LONG' || 'OPEN_SHORT') {
  
  // 2. 策略层记录
  const position = this.strategy.openPosition(...);
  
  // 3. 执行真实订单 ⭐ 新增
  const result = await this.executeOpenPosition(position, signal);
  
  // 4. 失败回滚
  if (!result.success) {
    this.strategy.positions.delete(pairKey);
  }
}
```

#### 平仓流程
```javascript
// 1. 检测到平仓信号
const updated = this.strategy.updatePosition(...);

// 2. 如果需要平仓
if (updated && updated.status === 'CLOSED') {
  
  // 3. 执行真实平仓订单 ⭐ 新增
  const closeResult = await this.executeClosePosition(updated);
}
```

---

## 📊 策略原理确认

您的理解**完全正确**！配对交易就是这样工作的：

### 开仓：价差偏离
```
两个币种价格关系偏离
    ↓
一个做多（买入低估币）
一个做空（卖出高估币）
    ↓
等待价差回归
```

### 平仓：价差回归
```
价差回归到正常范围
    ↓
同时平掉多单和空单
    ↓
锁定套利利润
```

### 市场中性
- ✅ 不管市场整体涨跌
- ✅ 只要价差回归就能盈利
- ✅ 风险相对较低

---

## 🚀 如何使用

### 启用自动交易

修改配置文件中的 `autoTrade` 参数：

```javascript
// src/statistical-arbitrage/live-trading.js

const strategyConfig = {
  autoTrade: true,  // ⭐ 改为 true 启用自动交易
  tradeAmount: 200, // 单个配对使用 $200
  // ...
};
```

### 运行实盘交易

```bash
npm run stat-arb:live -- --config=./output/live_trading_config_xxx.json
```

---

## ⚠️ 重要提示

### 开始前必读

1. **从小资金开始**
   - 建议：$100-$200 每个配对
   - 最多 2-3 个配对同时运行

2. **先监控模式测试**
   - 第一天：`autoTrade: false`（只看信号）
   - 确认信号质量后再启用自动交易

3. **风险控制**
   - 设置好 `stopLossThreshold`（建议 4.0-5.0）
   - 监控前几笔交易的执行情况
   - 准备好手动干预

4. **账户准备**
   - 确保有足够余额（包括手续费）
   - API 权限包括交易权限
   - 如在国内，确保代理正常

### 订单执行风险

**可能的风险：两腿订单只成交一个**

系统已经做了保护：
- ✅ 失败时会记录错误日志
- ✅ 提示需要手动检查账户
- ✅ 开仓失败会回滚策略记录

**但仍需人工监控：**
- 🔍 查看日志确认订单状态
- 👁️ 定期检查交易所账户
- ⚙️ 必要时手动处理异常持仓

---

## 📈 交易日志示例

### 开仓日志
```
🔄 开始执行开仓订单...
────────────────────────────────────────────────────
📊 交易类型: 做多价差
   策略: 买入低估币种，卖出高估币种

📝 订单详情:
   BTC/USDT: BUY 0.00512000
   ETH/USDT: SELL 0.08650000

⏳ 提交订单中...
✅ BTC/USDT 订单已成交: 12345678
   成交价格: $43250.50
   成交数量: 0.00512000
✅ ETH/USDT 订单已成交: 12345679
   成交价格: $2567.80
   成交数量: 0.08650000

✅ 开仓完成！两腿订单均已执行
────────────────────────────────────────────────────
```

### 平仓日志
```
🔄 开始执行平仓订单...
────────────────────────────────────────────────────
📊 平仓类型: 平多价差

📝 平仓订单:
   BTC/USDT: SELL 0.00512000
   ETH/USDT: BUY 0.08650000

⏳ 提交平仓订单中...
✅ BTC/USDT 平仓订单已成交: 12345680
✅ ETH/USDT 平仓订单已成交: 12345681

✅ 平仓完成！
────────────────────────────────────────────────────
```

---

## 🔍 关键代码位置

### 1. 自动交易开关
```
src/statistical-arbitrage/index.js
第 865-891 行：开仓逻辑
第 852-861 行：平仓逻辑
```

### 2. 订单执行方法
```
src/statistical-arbitrage/index.js
第 945-1025 行：executeOpenPosition()
第 1027-1096 行：executeClosePosition()
```

### 3. 配置文件
```
src/statistical-arbitrage/live-trading.js
第 151-178 行：strategyConfig 配置
```

---

## 📚 详细文档

完整的使用指南请参考：
**[docs/AUTO_TRADING_GUIDE.md](./docs/AUTO_TRADING_GUIDE.md)**

内容包括：
- ✅ 策略原理详解
- ✅ 配置方法
- ✅ 风险控制
- ✅ 测试流程
- ✅ 故障排查
- ✅ 最佳实践

---

## ✅ 测试建议

### 阶段1：回测（无风险）
```bash
npm run stat-arb:backtest-single -- \
  --symbol1=BTC/USDT \
  --symbol2=ETH/USDT \
  --days=30
```

### 阶段2：监控模式（观察信号）
```javascript
autoTrade: false  // 只看信号，不下单
```
运行 1-2 天

### 阶段3：小资金实盘
```javascript
autoTrade: true
tradeAmount: 100  // $100 起步
```
运行 3-5 天，密切监控

### 阶段4：正常运营
确认稳定后，逐步增加资金

---

## 🆘 紧急停止

如需立即停止：
1. **按 Ctrl+C** 停止程序
2. 或修改 `autoTrade: false`

⚠️ **注意**：停止程序不会自动平仓现有持仓！

---

## 💬 反馈与改进

如果遇到任何问题或有改进建议，请：
1. 查看日志：`logs/combined.log` 和 `logs/error.log`
2. 检查配置是否正确
3. 查阅文档：`docs/AUTO_TRADING_GUIDE.md`

---

**祝交易顺利！记得从小资金开始测试。🚀**

