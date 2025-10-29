# 🏗️ 系统架构文档

## 概述

本套利系统采用模块化设计，各组件职责清晰，易于扩展和维护。

## 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        Main Process                          │
│                      (src/index.js)                         │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   ArbitrageEngine                           │
│              (src/core/ArbitrageEngine.js)                  │
│                                                             │
│  • 主循环控制                                                │
│  • 协调各模块                                                │
│  • 状态管理                                                  │
└───┬─────────┬────────────┬──────────────┬──────────────────┘
    │         │            │              │
    ▼         ▼            ▼              ▼
┌────────┐ ┌────────┐ ┌─────────┐ ┌──────────────┐
│Exchange│ │Arbitr. │ │  Trade  │ │     Risk     │
│Manager │ │Detector│ │Executor │ │   Manager    │
└────────┘ └────────┘ └─────────┘ └──────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│        Exchange APIs (CCXT)         │
│  • Binance  • OKX  • Huobi  • Gate │
└─────────────────────────────────────┘
```

## 核心模块

### 1. ArbitrageEngine（套利引擎）

**职责：**
- 系统主控制器
- 协调所有子模块
- 执行主循环逻辑
- 管理系统状态

**关键方法：**
```javascript
- start()         // 启动引擎
- stop()          // 停止引擎
- mainLoop()      // 主循环
- fetchPrices()   // 获取价格数据
```

**数据流：**
```
fetchPrices() → detectOpportunities() → validateOpportunity() → execute()
```

### 2. ExchangeManager（交易所管理器）

**职责：**
- 管理多个交易所连接
- 统一的 API 调用接口
- 连接状态监控

**关键方法：**
```javascript
- initialize()              // 初始化所有交易所
- getExchange(name)         // 获取特定交易所实例
- fetchBalance(exchange)    // 获取余额
- createOrder(...)          // 创建订单
```

**支持的交易所：**
- Binance (币安)
- OKX
- Huobi (火币)
- Gate.io

### 3. ArbitrageDetector（套利检测器）

**职责：**
- 分析价格数据
- 检测套利机会
- 计算潜在利润

**核心算法：**

```javascript
// 跨交易所套利检测
for each pair:
  for each exchange_pair (i, j):
    profit1 = (ex[j].bid - ex[i].ask) / ex[i].ask
    if profit1 > minProfit:
      opportunity.add({
        buy: ex[i],
        sell: ex[j],
        profit: profit1
      })
```

**利润计算公式：**
```
净利润率 = (卖出价 - 买入价) / 买入价 × 100% - 手续费
```

### 4. TradeExecutor（交易执行器）

**职责：**
- 执行交易订单
- 同时下买单和卖单
- 订单状态跟踪

**执行流程：**
```
1. 验证余额
2. 计算交易数量
3. 并行下单（买入 + 卖出）
4. 记录交易
```

**订单类型：**
- Limit Order（限价单）
- Market Order（市价单）

### 5. RiskManager（风险管理器）

**职责：**
- 交易前风险评估
- 止损控制
- 交易频率限制

**风险控制项：**

| 风险项 | 默认值 | 说明 |
|--------|--------|------|
| 最大每日亏损 | 100 USDT | 达到后停止交易 |
| 最大持仓 | 1000 USDT | 单笔交易上限 |
| 最大滑点 | 0.5% | 价格偏差容忍度 |
| 交易频率 | 10次/小时 | 防止过度交易 |

**验证逻辑：**
```javascript
validateOpportunity(opp) {
  ✓ 利润率是否合理（< 10%）
  ✓ 价格是否有效
  ✓ 是否超过每日亏损
  ✓ 交易频率是否过高
  ✓ 数据是否新鲜（< 10秒）
}
```

## 数据结构

### Opportunity（套利机会）

```javascript
{
  pair: 'BTC/USDT',           // 交易对
  buyExchange: 'binance',     // 买入交易所
  sellExchange: 'okx',        // 卖出交易所
  buyPrice: 42000,            // 买入价格
  sellPrice: 42300,           // 卖出价格
  profit: 300,                // 绝对利润
  profitPercent: 0.71,        // 利润率（%）
  timestamp: 1698123456789    // 时间戳
}
```

### Trade（交易记录）

```javascript
{
  timestamp: 1698123456789,
  opportunity: { ... },       // 套利机会详情
  buyOrder: {                 // 买单详情
    id: '123456',
    status: 'closed',
    filled: 0.1
  },
  sellOrder: { ... },         // 卖单详情
  amount: 0.1,                // 交易数量
  status: 'executed'          // 交易状态
}
```

## 配置系统

### 配置文件层次

```
config.js                     // 主配置
  ├── exchanges {}           // 交易所配置
  ├── tradingPairs []        // 交易对列表
  ├── arbitrage {}           // 套利参数
  ├── execution {}           // 交易执行参数
  ├── risk {}                // 风险管理参数
  └── notifications {}       // 通知配置

.env                         // 环境变量（敏感信息）
  ├── API Keys
  ├── Secrets
  └── Passwords
```

### 配置优先级

```
环境变量 > config.js > 默认值
```

## 工作流程

### 完整循环流程

```
1. 启动
   ├── 加载配置
   ├── 初始化交易所连接
   └── 验证 API 权限

2. 主循环（每 3 秒）
   ├── 获取所有交易所价格
   ├── 检测套利机会
   ├── 风险评估
   └── 执行交易（如果启用）

3. 异常处理
   ├── 记录错误日志
   ├── 发送通知
   └── 继续运行

4. 优雅退出
   ├── 关闭所有连接
   └── 保存日志
```

### 交易执行流程

```
检测到机会
    ↓
验证余额充足？
    ↓ 是
风险检查通过？
    ↓ 是
计算交易数量
    ↓
并行下单
    ├─→ 买单（交易所A）
    └─→ 卖单（交易所B）
    ↓
等待成交
    ↓
记录结果
```

## 日志系统

### 日志级别

- **ERROR**: 错误信息（需要立即关注）
- **WARN**: 警告信息（可能的问题）
- **INFO**: 一般信息（正常运行）
- **DEBUG**: 调试信息（开发使用）

### 日志文件

```
logs/
├── combined.log    // 所有级别日志
├── error.log       // 仅错误日志
└── trades.log      // 交易记录
```

### 日志格式

```
[YYYY-MM-DD HH:mm:ss] LEVEL: message
```

示例：
```
[2025-10-24 10:30:15] INFO: 💰 发现 2 个套利机会
[2025-10-24 10:30:16] INFO: [模拟模式] 套利机会: BTC/USDT | binance -> okx | 利润: 0.65%
```

## 扩展点

### 添加新交易所

1. 在 `config.js` 添加配置
2. 在 `.env` 添加 API 密钥
3. ExchangeManager 自动支持（通过 CCXT）

### 添加新策略

1. 在 `src/strategies/` 创建新文件
2. 实现检测逻辑
3. 在 ArbitrageEngine 中调用

### 添加通知渠道

1. 在 `src/utils/` 创建通知模块
2. 在关键点添加通知调用
3. 在 config.js 配置

## 性能考虑

### 优化点

1. **并行请求**: 同时获取多个交易所数据
2. **缓存**: 避免重复请求市场数据
3. **速率限制**: 遵守交易所 API 限制
4. **异步执行**: 非阻塞式交易执行

### 瓶颈

1. **网络延迟**: 影响套利时机
2. **API 限制**: 调用频率限制
3. **订单延迟**: 成交速度

### 改进建议

1. 使用 WebSocket 获取实时价格
2. 部署到靠近交易所服务器的位置
3. 使用更高级的 VIP API
4. 实现智能订单路由

## 安全设计

### API 密钥保护

- 通过环境变量管理
- 不硬编码在代码中
- 不提交到版本控制

### 权限最小化

- 仅开启交易权限
- 禁用提币权限
- 使用 IP 白名单

### 错误处理

- 所有 API 调用都有错误处理
- 失败后自动重试（带延迟）
- 详细错误日志

## 测试

### 单元测试（待实现）

```
tests/
├── core/
│   └── ArbitrageEngine.test.js
├── strategies/
│   └── ArbitrageDetector.test.js
└── risk/
    └── RiskManager.test.js
```

### 集成测试

```bash
npm run test:connection  # 测试交易所连接
npm run monitor          # 测试价格获取
```

## 监控与维护

### 日常监控

- 检查日志文件
- 监控余额变化
- 验证交易记录

### 性能指标

- 扫描频率
- 发现的机会数量
- 交易成功率
- 实际利润

### 故障恢复

1. 自动重启机制
2. 错误通知
3. 状态备份

---

**更新日期**: 2025-10-24

