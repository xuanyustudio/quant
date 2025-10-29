# 实盘合约交易部署检查清单

## ✅ 已完成的配置

### 1. 默认策略已改为合约策略

**配置文件：`src/statistical-arbitrage/config.js`**

```javascript
strategyType: 'futures',        // ⭐ 默认使用合约策略
useContractForShort: true,      // ⭐ 使用合约真正做空
leverage: 1,                    // ⭐ 1x杠杆（安全）
marginType: 'cross',            // ⭐ 全仓模式
```

---

## 🔍 实盘交易检查项

### ⚠️ 关键问题：当前实盘下单逻辑需要完善

查看 `src/statistical-arbitrage/index.js` 第 865-891 行：

```javascript
if (this.strategyConfig.autoTrade) {
  logger.info(`   🤖 自动交易: 执行开仓...`);
  
  // 1. 在策略层记录持仓
  const position = this.strategy.openPosition(...);
  
  // 2. 执行真实订单到交易所
  const result = await this.executeOpenPosition(position, signal);
  
  if (!result.success) {
    logger.error('⚠️  开仓失败，回滚持仓记录...');
    this.strategy.positions.delete(pairKey);
  }
}
```

**状态**：
- ✅ `executeOpenPosition()` 方法已实现
- ✅ 支持合约订单（`executeContractOrder()`）
- ✅ 支持现货+合约混合
- ⚠️  需要实盘测试验证

---

## 📋 部署前检查清单

### 阶段1：环境准备 ✅

- [x] API 密钥配置
  ```bash
  # .env 文件
  BINANCE_API_KEY=your_api_key
  BINANCE_SECRET=your_secret_key
  HTTPS_PROXY=http://127.0.0.1:7897  # 如需代理
  ```

- [x] API 权限检查
  - [ ] 现货交易权限
  - [ ] **合约交易权限** ⭐ 必须开通
  - [ ] 资金划转权限（现货↔️合约账户）

- [x] 网络连接
  ```bash
  # 测试币安连接
  node test-binance-proxy.js
  ```

### 阶段2：合约账户准备 ⭐

#### 2.1 开通合约账户

1. 登录币安
2. 进入 **合约交易** 页面
3. 开通 **USDT永续合约**
4. 完成合约账户激活

#### 2.2 资金划转

```
现货账户 → 合约账户（USDT-M）
建议划转金额：$500-$1000（测试）
```

#### 2.3 API设置

1. 在 API 管理页面
2. 确保API有 **合约交易** 权限
3. 设置IP白名单（或不限制）
4. 启用合约交易功能

### 阶段3：回测验证 ⭐ 重要

#### 3.1 合约策略回测

```bash
npm run stat-arb:backtest-pair -- \
  --symbol1=BTC/USDT \
  --symbol2=ETH/USDT \
  --start=2024-10-01 \
  --end=2024-10-31 \
  --strategy=futures
```

**检查项**：
- [ ] 回测能正常运行
- [ ] 盈亏计算正确（两个币种都有盈亏）
- [ ] 方向显示正确（做多/做空）
- [ ] HTML报告正常生成
- [ ] 策略表现满意（收益率、回撤等）

#### 3.2 对比现货策略

```bash
npm run stat-arb:backtest-pair -- \
  --symbol1=BTC/USDT \
  --symbol2=ETH/USDT \
  --start=2024-10-01 \
  --end=2024-10-31 \
  --strategy=spot
```

**对比指标**：
- [ ] 合约策略收益更高
- [ ] 合约策略回撤更小
- [ ] 合约策略更稳定

### 阶段4：参数优化

#### 4.1 检查当前参数

```javascript
// config.js
entryThreshold: 3.1,         // 开仓阈值
exitThreshold: 0.6,          // 平仓阈值
stopLossThreshold: 4.75,     // 止损阈值
lookbackPeriod: 100,         // 回看周期
tradeAmount: 200,            // 交易金额
leverage: 1,                 // 杠杆（建议保持1x）
```

#### 4.2 优化建议

- [ ] 如果信号太少：降低 `entryThreshold` (如 2.5)
- [ ] 如果止损太频繁：提高 `stopLossThreshold` (如 5.0)
- [ ] 如果想快速平仓：降低 `exitThreshold` (如 0.5)

### 阶段5：模拟运行（监控模式）

#### 5.1 只监控不交易

```javascript
// config.js 或 live-trading.js
autoTrade: false,  // ⚠️ 先设为 false
```

启动监控：
```bash
npm run stat-arb:live -- --config=./output/live_trading_config_xxx.json
```

**观察内容**：
- [ ] 信号生成是否正常
- [ ] Z-Score计算是否合理
- [ ] 是否有频繁的开平仓信号
- [ ] 运行1-2小时无错误

#### 5.2 检查日志

```bash
# 查看实时日志
tail -f logs/combined.log

# 查看错误日志
tail -f logs/error.log
```

### 阶段6：小资金实盘测试 ⭐

#### 6.1 启用自动交易

```javascript
// 修改配置
autoTrade: true,
tradeAmount: 100,  // 从 $100 开始
maxPositions: 1,   // 只允许1个持仓
```

#### 6.2 启动实盘

```bash
# 使用 PM2 管理（推荐）
pm2 start ecosystem.config.cjs

# 或直接运行
npm run stat-arb:live -- --config=./output/live_trading_config_xxx.json
```

#### 6.3 密切监控（前3天）

**每天检查**：
- [ ] 查看持仓情况
  ```bash
  # 登录币安查看合约持仓
  ```
  
- [ ] 查看交易记录
  ```bash
  tail -f logs/trades.log
  ```

- [ ] 检查账户余额
  - 现货余额
  - 合约余额
  - 总盈亏

- [ ] 查看程序运行状态
  ```bash
  pm2 status
  pm2 logs stat-arb
  ```

#### 6.4 异常处理

**如果发现问题：**

1. **立即停止**
   ```bash
   pm2 stop stat-arb
   ```

2. **检查持仓**
   - 登录币安查看现货和合约持仓
   - 如有未平仓位，手动平仓

3. **分析日志**
   ```bash
   grep "ERROR" logs/error.log
   grep "开仓" logs/combined.log
   grep "平仓" logs/combined.log
   ```

4. **修复问题后重启**

---

## ⚠️ 关键风险点

### 1. 合约交易特有风险

#### 资金费率（Funding Rate）

- **频率**：每8小时收取一次
- **费率**：通常 ±0.01%
- **影响**：长期持仓会累积成本

**监控方法**：
```
登录币安 → 合约 → 持仓 → 查看资金费率
```

#### 强平风险

即使使用 1x 杠杆，极端行情也可能强平：

**防范措施**：
- ✅ 使用 1x 杠杆
- ✅ 设置止损（`stopLossThreshold: 4.75`）
- ✅ 预留足够保证金
- ✅ 实时监控持仓

### 2. 订单执行风险

#### 两腿订单不完全成交

**场景**：
```
开仓时：
- BTC 合约订单成交 ✅
- ETH 现货订单失败 ❌
```

**后果**：单边暴露风险

**系统保护**：
```javascript
// 代码中已有回滚机制
if (!result.success) {
  logger.error('⚠️  开仓失败，回滚持仓记录...');
  this.strategy.positions.delete(pairKey);
}
```

**人工检查**：
- 每天检查账户持仓
- 确保持仓对数正确
- 如有单边持仓立即手动平仓

### 3. 网络连接风险

#### 代理失效

**症状**：
```
ERROR: connect ETIMEDOUT
ERROR: Invalid API-key
```

**解决**：
```bash
# 检查代理
curl --proxy http://127.0.0.1:7897 https://api.binance.com/api/v3/ping

# 重启代理（如使用 V2Ray/Clash）
```

#### API限流

**症状**：
```
ERROR: Too many requests
```

**防范**：
```javascript
// 配置中已启用
enableRateLimit: true,
scanInterval: 60000,  // 1分钟扫描一次
```

---

## 📊 监控指标

### 每日检查

| 指标 | 目标 | 异常阈值 |
|------|------|---------|
| 账户余额 | 稳定增长 | 单日亏损 > 5% |
| 持仓数量 | ≤ maxPositions | > 设定值 |
| 胜率 | > 60% | < 50% |
| 最大回撤 | < 10% | > 15% |
| 日交易次数 | 1-5次 | > 10次 |

### 每周总结

- [ ] 总盈亏：_____ USDT
- [ ] 交易次数：_____ 次
- [ ] 胜率：_____ %
- [ ] 最大回撤：_____ %
- [ ] 是否需要调整参数：是 / 否

---

## 🚀 部署步骤（最终）

### 1. 确认配置

```javascript
// config.js
strategyType: 'futures',     // ✅
useContractForShort: true,   // ✅
leverage: 1,                 // ✅
autoTrade: true,             // ⚠️ 确认启用
tradeAmount: 100,            // 💰 小额起步
maxPositions: 1,             // 🛡️ 限制仓位
```

### 2. 运行回测

```bash
npm run stat-arb:backtest-pair -- \
  --symbol1=BTC/USDT \
  --symbol2=ETH/USDT \
  --start=2024-10-01 \
  --end=2024-10-31 \
  --strategy=futures
```

### 3. 启动监控模式（1-2天）

```bash
# autoTrade: false
npm run stat-arb:live -- --config=./output/live_trading_config_xxx.json
```

### 4. 启用小资金实盘（3-7天）

```bash
# autoTrade: true, tradeAmount: 100
pm2 start ecosystem.config.cjs
```

### 5. 逐步增加资金

```
第1周：$100/笔
第2周：$200/笔（如稳定）
第3周：$500/笔（如继续稳定）
...
```

---

## 📞 紧急联系

### 立即停止交易

```bash
pm2 stop stat-arb
```

### 查看持仓

1. 登录币安
2. 现货账户：查看现货持仓
3. 合约账户：查看合约持仓
4. 如有异常持仓，手动平仓

### 联系信息

保存好：
- [ ] 币安客服联系方式
- [ ] API密钥备份
- [ ] 紧急处理流程

---

## ✅ 部署确认

在启动实盘前，确认以下所有项：

**技术准备**：
- [ ] API密钥配置正确
- [ ] 合约交易权限已开通
- [ ] 合约账户已划入资金
- [ ] 网络连接稳定（代理正常）
- [ ] 回测结果满意

**策略配置**：
- [ ] `strategyType: 'futures'`
- [ ] `leverage: 1`（安全）
- [ ] `autoTrade: true`
- [ ] `tradeAmount: 100`（小额）
- [ ] `maxPositions: 1`（保守）

**监控准备**：
- [ ] 手机可以随时查看币安持仓
- [ ] 电脑可以随时查看日志
- [ ] 准备好紧急停止命令
- [ ] 理解风险和应对措施

**心理准备**：
- [ ] 接受可能的小额亏损
- [ ] 不频繁干预策略
- [ ] 遵守止损纪律
- [ ] 记录和分析每笔交易

---

## 🎯 成功标准

### 第1周（测试期）

- ✅ 系统稳定运行无崩溃
- ✅ 交易执行正常（无卡单）
- ✅ 盈亏计算准确
- ✅ 盈亏 > -5%（可接受小亏）

### 第2-4周（验证期）

- ✅ 总盈利 > 0%
- ✅ 胜率 > 55%
- ✅ 最大回撤 < 10%
- ✅ 无重大事故

### 长期（运营期）

- ✅ 月收益率 > 3%
- ✅ 胜率 > 60%
- ✅ 夏普比率 > 1.5
- ✅ 稳定运行 > 3个月

---

**祝您交易顺利！记住：从小额开始，谨慎验证，逐步扩大。🚀**

---

## 📚 相关文档

- [合约策略指南](./docs/FUTURES_STRATEGY_GUIDE.md)
- [回测使用指南](./docs/BACKTEST_FUTURES_GUIDE.md)
- [实盘交易指南](./docs/AUTO_TRADING_GUIDE.md)
- [盈亏计算说明](./PNL_CALCULATION_FIX_V2.md)

