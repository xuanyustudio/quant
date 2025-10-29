# 🤖 加密货币自动化套利系统

专业的加密货币套利交易系统，支持多种套利策略。

## ✨ 核心功能

### 1. 跨交易所套利（Cross-Exchange Arbitrage）

利用不同交易所之间的价格差异进行套利。

- 支持多交易所（币安、OKX、火币、Gate.io）
- 实时价格监控
- 自动套利执行
- 风险控制系统

**适用场景：** 市场效率低、交易所间价差明显时

### 2. 统计套利/配对交易（Statistical Arbitrage / Pairs Trading）⭐ 新增

基于统计分析的市场中性策略，通过寻找相关性强的资产配对进行交易。

- 相关性分析
- 协整性检验
- Z-Score信号生成
- 完整回测系统
- 动态仓位管理

**适用场景：** 震荡市场、高相关性资产

## 🚀 快速开始

### 统计套利（推荐）

```bash
# 1. 安装依赖
npm install

# 2. 配置API
cp env.example .env
# 编辑 .env 填入API密钥

# 3. 寻找配对
npm run stat-arb:find-pairs

# 4. 运行回测
npm run stat-arb:backtest

# 5. 实盘运行
npm run stat-arb
```

📖 **详细教程：** [QUICKSTART_STAT_ARB.md](QUICKSTART_STAT_ARB.md)

### 跨交易所套利

```bash
# 1. 配置
cp env.example .env

# 2. 测试连接
npm run test:connection

# 3. 启动套利
npm start
```

📖 **详细教程：** [QUICKSTART.md](QUICKSTART.md)

## 📊 策略对比

| 策略 | 风险等级 | 收益潜力 | 资金要求 | 技术难度 | 推荐度 |
|------|----------|----------|----------|----------|--------|
| 统计套利 | 低-中 | 稳定 | 中 | 中 | ⭐⭐⭐⭐⭐ |
| 跨交易所套利 | 中 | 中-高 | 高 | 中 | ⭐⭐⭐⭐ |

## 📁 项目结构

```
crypto-arbitrage-bot/
├── src/
│   ├── statistical-arbitrage/      # 统计套利（新）
│   │   ├── DataCollector.js        # 数据收集
│   │   ├── StatisticalAnalyzer.js  # 统计分析
│   │   ├── PairsStrategy.js        # 配对策略
│   │   ├── Backtest.js             # 回测引擎
│   │   ├── index.js                # 主程序
│   │   └── config.js               # 配置
│   │
│   ├── core/                       # 跨交易所套利
│   │   └── ArbitrageEngine.js
│   ├── exchanges/
│   ├── strategies/
│   ├── execution/
│   └── risk/
│
├── docs/                           # 文档
│   ├── STATISTICAL_ARBITRAGE_GUIDE.md
│   ├── CHINA_SETUP.md
│   ├── PROXY_SETUP.md
│   └── STRATEGIES.md
│
├── statistical-arbitrage-README.md  # 统计套利完整文档
├── QUICKSTART_STAT_ARB.md          # 统计套利快速开始
└── README.md                        # 本文件
```

## 📚 文档导航

### 统计套利（配对交易）

- 📖 [完整指南](statistical-arbitrage-README.md) - 策略原理、使用方法
- ⚡ [快速开始](QUICKSTART_STAT_ARB.md) - 5分钟入门
- 🎓 [深度教程](docs/STATISTICAL_ARBITRAGE_GUIDE.md) - 算法详解、案例分析

### 跨交易所套利

- 📖 [完整文档](README.md) - 系统说明
- ⚡ [快速开始](QUICKSTART.md) - 快速入门
- 🇨🇳 [国内用户指南](docs/CHINA_SETUP.md) - 解决访问问题
- 🌐 [代理部署](docs/PROXY_SETUP.md) - 自建代理服务器

### 策略与优化

- 📈 [策略详解](docs/STRATEGIES.md) - 各种套利策略
- 🏗️ [系统架构](docs/ARCHITECTURE.md) - 技术细节

## 🎯 使用建议

### 新手推荐路线

1. **第1周：学习和回测**
   ```bash
   npm run stat-arb:find-pairs  # 寻找配对
   npm run stat-arb:backtest    # 运行回测
   ```

2. **第2-3周：模拟运行**
   ```javascript
   // config.js
   enableLiveTrading: false  // 不实际交易
   autoTrade: false         // 只观察信号
   ```

3. **第4周：小额实盘**
   ```javascript
   enableLiveTrading: true
   autoTrade: true
   tradeAmount: 100  // 小额测试
   ```

4. **第2个月：正常运行**
   ```javascript
   tradeAmount: 1000
   maxPositions: 3
   ```

### 稳健投资者

- 优先使用：**统计套利**
- 推荐配对：BTC/ETH, ETH/BNB
- 时间周期：1h 或 4h
- 仓位控制：单笔 < 30% 资金

### 进取投资者

- 两种策略结合使用
- 更多配对选择
- 较短时间周期
- 动态参数优化

## ⚠️ 风险提示

### 统计套利风险

1. **相关性失效** - 市场结构改变
2. **价差不回归** - 极端行情
3. **模型过拟合** - 回测数据不足
4. **执行延迟** - 滑点和手续费

### 跨交易所套利风险

1. **提币风险** - 转账时间、手续费
2. **价格波动** - 套利过程中价格变化
3. **交易所风险** - 暂停提币、API限制
4. **资金占用** - 需要在多个所持有资金

## 🛡️ 安全建议

### API 安全

- ✅ 只开启交易权限
- ❌ 禁用提币权限
- ✅ 设置 IP 白名单
- ✅ 定期更换密钥

### 资金安全

- 初期只投入小额资金
- 设置每日止损限制
- 分散资金到多个交易所
- 定期提取利润

### 系统安全

- 使用稳定的服务器/VPS
- 定期备份配置和日志
- 监控系统运行状态
- 及时更新代码

## 💰 预期收益

### 统计套利

| 市场状态 | 月收益 | 胜率 | 最大回撤 |
|----------|--------|------|----------|
| 震荡市 | 3-8% | 65-75% | 5-10% |
| 趋势市 | 1-4% | 55-65% | 8-15% |

### 跨交易所套利

| 市场状态 | 月收益 | 成功率 | 资金要求 |
|----------|--------|--------|----------|
| 低效市场 | 5-15% | 60-70% | 高 |
| 高效市场 | 1-5% | 40-50% | 高 |

**注意：** 过往表现不代表未来收益，实际收益会受市场环境影响。

## 🔧 系统要求

- Node.js >= 16.0
- 内存 >= 2GB
- 稳定的网络连接
- （可选）海外 VPS（用于访问币安）

## 📦 依赖

```json
{
  "ccxt": "^4.1.0",           // 交易所API
  "dotenv": "^16.3.1",        // 环境变量
  "winston": "^3.11.0",       // 日志系统
  "express": "^4.18.2",       // Web服务（代理用）
  "http-proxy-middleware": "^2.0.6"  // HTTP代理
}
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## ⚖️ 免责声明

本项目仅供学习和研究使用。使用本软件进行实盘交易的风险由用户自行承担。

**加密货币投资有风险，请谨慎投资！**

---

## 🎓 学习资源

- [配对交易原理](https://www.investopedia.com/articles/trading/04/090804.asp)
- [统计套利策略](https://www.quantconnect.com/tutorials/strategy-library/pairs-trading-with-stocks)
- [CCXT文档](https://docs.ccxt.com/)

## 📞 获取帮助

- 查看文档目录
- 检查日志文件 `logs/`
- 提交 Issue

---

**祝交易顺利！** 🚀💰

如有问题，请查阅相关文档或检查日志文件。
