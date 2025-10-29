# ⚡ 快速开始指南

5 分钟快速启动加密货币套利系统！

## 📦 第一步：安装

```bash
npm install
```

## 🔑 第二步：配置 API 密钥

1. 复制配置模板：
```bash
cp env.example .env
```

2. 在 `.env` 文件中填入你的 API 密钥：
```env
BINANCE_API_KEY=你的密钥
BINANCE_SECRET=你的密钥
# ... 其他交易所
```

## 🧪 第三步：测试连接

测试你的 API 配置是否正确：

```bash
npm run test:connection
```

应该看到类似输出：
```
✅ Binance 连接测试成功！
✅ OKX 连接测试成功！
```

## 👀 第四步：监控价格（可选）

运行价格监控工具，观察实时价格差异：

```bash
npm run monitor
```

这会显示不同交易所的实时价格和潜在套利机会，但不会执行交易。

## 🚀 第五步：启动套利系统

### 测试模式（推荐）

```bash
npm start
```

程序会：
- ✅ 连接交易所
- ✅ 监控价格
- ✅ 检测套利机会
- ✅ 显示机会（但不交易）

### 自动交易模式（谨慎使用）

1. 编辑 `src/config/config.js`：
```javascript
execution: {
  autoTrade: true,  // 改为 true
  tradeAmount: 50   // 建议从小金额开始
}
```

2. 启动：
```bash
npm start
```

## 📊 查看日志

实时查看运行日志：

```bash
# Linux/Mac
tail -f logs/combined.log

# Windows PowerShell
Get-Content logs/combined.log -Wait -Tail 20
```

## ⚙️ 基本配置

所有配置在 `src/config/config.js`：

```javascript
{
  // 启用/禁用交易所
  exchanges: {
    binance: { enabled: true },
    okx: { enabled: true },
    huobi: { enabled: false }
  },
  
  // 监控的交易对
  tradingPairs: [
    'BTC/USDT',
    'ETH/USDT'
  ],
  
  // 最小利润率
  arbitrage: {
    minProfitPercent: 0.5  // 0.5%
  },
  
  // 自动交易开关
  execution: {
    autoTrade: false,     // false = 只观察
    tradeAmount: 100      // USDT
  }
}
```

## ⚠️ 安全提示

### 启用自动交易前，确保：

- ✅ 在测试模式运行至少 24 小时
- ✅ API 只有现货交易权限（无提币权限）
- ✅ 设置了 IP 白名单
- ✅ 只投入可以承受损失的小额资金

### API 权限设置：

在每个交易所的 API 管理中：
- ✅ 启用：现货交易
- ❌ 禁用：提币权限
- ✅ 启用：IP 白名单

## 🎯 工作流程

```
1. 扫描价格 → 2. 检测套利机会 → 3. 风险验证 → 4. 执行交易（如果启用）
```

系统每 3 秒扫描一次（可配置）。

## 📱 可用命令

```bash
npm start                  # 启动套利系统
npm run dev               # 开发模式（自动重启）
npm run test:connection   # 测试交易所连接
npm run monitor           # 价格监控工具
```

## 🆘 遇到问题？

### 连接失败
- 检查 `.env` 文件中的 API 密钥
- 确认网络连接正常
- 查看 `logs/error.log`

### 没有套利机会
- 增加监控的交易对数量
- 降低 `minProfitPercent`
- 等待市场波动

### 查看详细日志
```bash
cat logs/combined.log    # 所有日志
cat logs/error.log       # 错误日志
cat logs/trades.log      # 交易日志
```

## 📚 更多信息

- 详细设置：查看 [SETUP.md](SETUP.md)
- 完整文档：查看 [README.md](README.md)

---

**准备好了吗？运行 `npm start` 开始吧！** 🚀

