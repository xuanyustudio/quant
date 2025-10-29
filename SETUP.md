# 🛠️ 详细设置指南

本文档提供详细的设置步骤，帮助你快速启动加密货币套利系统。

## 📋 前置要求

### 1. 软件要求

- **Node.js**: 版本 16.0 或更高
  ```bash
  node --version  # 检查版本
  ```

- **npm**: 通常随 Node.js 一起安装
  ```bash
  npm --version
  ```

### 2. 交易所账户

你需要在至少 2 个交易所注册账户：

- [币安 Binance](https://www.binance.com/)
- [OKX](https://www.okx.com/)
- [火币 Huobi](https://www.huobi.com/)
- [Gate.io](https://www.gate.io/)

## 🔐 获取 API 密钥

### 币安 (Binance)

1. 登录币安账户
2. 进入 **用户中心** → **API管理**
3. 点击 **创建API**
4. 完成安全验证
5. 设置 API 权限：
   - ✅ 启用现货交易
   - ❌ 禁用提币权限
6. 设置 IP 白名单（推荐）
7. 保存 **API Key** 和 **Secret Key**

### OKX

1. 登录 OKX 账户
2. 进入 **个人中心** → **API**
3. 点击 **创建API密钥**
4. 设置权限：
   - ✅ 交易权限
   - ❌ 提币权限
5. 设置 IP 白名单
6. 保存 **API Key**、**Secret Key** 和 **Passphrase**

### 火币 (Huobi)

1. 登录火币账户
2. 进入 **API管理**
3. 创建新的 API Key
4. 权限设置：
   - ✅ 交易权限
   - ❌ 提币权限
5. IP 白名单设置
6. 保存凭证

### Gate.io

1. 登录 Gate.io
2. 进入 **API Keys** 管理
3. 创建新密钥
4. 设置权限和 IP 白名单
5. 保存凭证

## 🚀 安装步骤

### 第一步：克隆/下载项目

如果你还没有项目文件，确保已在工作目录中。

### 第二步：安装依赖

```bash
npm install
```

这将安装所有必需的包：
- `ccxt`: 交易所 API 统一接口
- `dotenv`: 环境变量管理
- `winston`: 日志系统
- `node-telegram-bot-api`: Telegram 通知（可选）

### 第三步：配置环境变量

1. 复制环境变量模板：

```bash
cp env.example .env
```

2. 编辑 `.env` 文件：

```env
# 币安配置
BINANCE_API_KEY=你的币安API密钥
BINANCE_SECRET=你的币安Secret密钥

# OKX配置
OKX_API_KEY=你的OKX_API密钥
OKX_SECRET=你的OKX_Secret密钥
OKX_PASSWORD=你的OKX_API密码

# 火币配置
HUOBI_API_KEY=你的火币API密钥
HUOBI_SECRET=你的火币Secret密钥

# Gate.io配置
GATE_API_KEY=你的Gate_API密钥
GATE_SECRET=你的Gate_Secret密钥

# 日志级别
LOG_LEVEL=info
```

### 第四步：调整配置参数

编辑 `src/config/config.js`：

```javascript
export default {
  // 选择要启用的交易所
  exchanges: {
    binance: { enabled: true, ... },
    okx: { enabled: true, ... },
    huobi: { enabled: false, ... },  // 可以禁用某些交易所
    gate: { enabled: false, ... }
  },
  
  // 选择要监控的交易对
  tradingPairs: [
    'BTC/USDT',
    'ETH/USDT',
    // 添加更多...
  ],
  
  // 套利参数
  arbitrage: {
    minProfitPercent: 0.5  // 最小利润率
  },
  
  // ⚠️ 重要：初始设置
  execution: {
    autoTrade: false,      // 先用 false 测试
    tradeAmount: 100       // 每次交易金额（USDT）
  }
}
```

## 🧪 测试运行

### 测试连接

首先运行程序测试交易所连接：

```bash
npm start
```

你应该看到类似输出：

```
[2025-10-24 10:00:00] INFO: 🚀 启动加密货币套利系统...
[2025-10-24 10:00:01] INFO: 🔄 初始化交易所连接...
[2025-10-24 10:00:02] INFO: ✅ binance 连接成功 | 账户资金已加载
[2025-10-24 10:00:03] INFO: ✅ okx 连接成功 | 账户资金已加载
[2025-10-24 10:00:04] INFO: ✅ 所有交易所连接成功
[2025-10-24 10:00:04] INFO: 📊 监控交易对: BTC/USDT, ETH/USDT
```

### 观察套利机会

程序会持续扫描并在发现套利机会时显示：

```
[2025-10-24 10:05:30] INFO: 💰 发现 1 个套利机会
[2025-10-24 10:05:30] INFO: [模拟模式] 套利机会: BTC/USDT | binance -> okx | 利润: 0.65%
```

**注意**：在 `autoTrade: false` 模式下，程序只会显示机会，不会执行交易。

## 📊 监控和日志

### 查看实时日志

```bash
# Linux/Mac
tail -f logs/combined.log

# Windows PowerShell
Get-Content logs/combined.log -Wait
```

### 查看错误日志

```bash
cat logs/error.log
```

### 查看交易日志

```bash
cat logs/trades.log
```

## ⚡ 启用自动交易

**⚠️ 在启用自动交易前，请确保：**

1. ✅ 程序已在测试模式稳定运行至少 24 小时
2. ✅ 确认套利检测逻辑正确
3. ✅ 设置了合理的风险控制参数
4. ✅ 账户中只有可以承受损失的小额资金

**启用步骤：**

1. 编辑 `src/config/config.js`：

```javascript
execution: {
  autoTrade: true,    // 改为 true
  tradeAmount: 50,    // 建议从小金额开始
}
```

2. 重启程序：

```bash
npm start
```

3. 密切监控前几笔交易

## 🔧 优化建议

### 提高扫描频率

```javascript
scanInterval: 2000,  // 改为 2 秒
```

**注意**：频率太高可能触发交易所 API 限制。

### 添加更多交易对

```javascript
tradingPairs: [
  'BTC/USDT',
  'ETH/USDT',
  'BNB/USDT',
  'SOL/USDT',
  'XRP/USDT',
  'ADA/USDT',
  'DOGE/USDT',
  // ... 更多
]
```

### 调整手续费率

根据你的实际费率（可能有VIP折扣）调整：

```javascript
fees: {
  binance: 0.001,  // 0.1%
  okx: 0.0008,     // 0.08%（VIP1）
}
```

## 🛡️ 安全最佳实践

1. **API 密钥安全**
   - 永远不要将 `.env` 文件提交到 git
   - 定期轮换 API 密钥
   - 使用最小必要权限

2. **资金安全**
   - 初期只用小额资金测试
   - 设置每日止损限制
   - 分散资金到多个交易所

3. **监控**
   - 定期检查日志
   - 设置异常告警
   - 监控账户余额变化

4. **备份**
   - 定期备份配置文件
   - 保存交易日志
   - 记录盈亏情况

## 📱 可选：Telegram 通知

1. 创建 Telegram Bot：
   - 在 Telegram 中找到 @BotFather
   - 发送 `/newbot` 创建机器人
   - 获取 Bot Token

2. 获取你的 Chat ID：
   - 给你的 bot 发送消息
   - 访问 `https://api.telegram.org/bot<YourBOTToken>/getUpdates`
   - 找到 `chat.id`

3. 配置：

```env
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

```javascript
notifications: {
  telegram: {
    enabled: true,
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID
  }
}
```

## 🐛 常见问题

### Q: 程序启动后没有发现任何套利机会？

A: 这很正常。加密货币市场效率很高，套利机会并不常见。你可以：
- 增加监控的交易对数量
- 降低 `minProfitPercent` 阈值（但要确保扣除手续费后还有利润）
- 等待市场波动期

### Q: API 连接总是超时？

A: 可能的原因：
- 网络问题（尝试使用VPN）
- API 密钥错误
- 交易所维护中
- 达到 API 调用频率限制

### Q: 如何计算实际利润？

A: 实际利润 = 价差利润 - 买入手续费 - 卖出手续费 - 提币费（如果需要转移资金）

### Q: 程序可以 24/7 运行吗？

A: 可以，但建议：
- 使用稳定的服务器或VPS
- 设置自动重启机制
- 配置异常告警
- 定期检查运行状态

## 📞 获取帮助

如果遇到问题：

1. 查看 `logs/error.log` 了解错误详情
2. 检查配置文件是否正确
3. 确认 API 密钥权限设置
4. 在项目 GitHub 提交 Issue

---

**祝你套利顺利！** 🎉

