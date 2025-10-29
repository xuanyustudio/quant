# 🇨🇳 加密货币自动化套利系统（国内版）

专为中国大陆用户优化的套利交易机器人，无需翻墙即可使用。

## ✨ 特点

- 🌏 **国内可用**：使用 OKX、Gate.io、火币等国内可访问的交易所
- 💰 **自动套利**：实时监控价格差异，自动执行套利交易
- 🛡️ **风险可控**：内置风险管理系统
- 📊 **详细日志**：完整的交易记录
- 🔐 **安全可靠**：API密钥本地管理

## 🌐 访问方案

### 方案一：使用国内交易所（推荐）
- OKX + Gate.io（无需翻墙）
- 参考：[QUICKSTART_CHINA.md](QUICKSTART_CHINA.md)

### 方案二：自建代理服务器
- 通过海外 VPS 转发币安 API
- 参考：[docs/PROXY_SETUP.md](docs/PROXY_SETUP.md)

## 🚀 5分钟快速开始

### 1️⃣ 安装

```bash
npm install
```

### 2️⃣ 配置

```bash
# 复制配置文件
cp env.example .env
cp src/config/config.china.js src/config/config.js
```

### 3️⃣ 填写 API 密钥

编辑 `.env` 文件：

```env
# OKX（推荐）
OKX_API_KEY=你的密钥
OKX_SECRET=你的密钥
OKX_PASSWORD=你的API密码

# Gate.io
GATE_API_KEY=你的密钥
GATE_SECRET=你的密钥
```

### 4️⃣ 测试连接

```bash
npm run test:connection
```

### 5️⃣ 启动

```bash
npm start
```

## 📚 文档

- **快速开始**：[QUICKSTART_CHINA.md](QUICKSTART_CHINA.md)
- **详细设置**：[docs/CHINA_SETUP.md](docs/CHINA_SETUP.md)
- **完整文档**：[README.md](README.md)

## 🏦 推荐交易所

| 交易所 | 国内访问 | 流动性 | 手续费 | 推荐度 |
|--------|----------|--------|--------|--------|
| OKX | ✅ 可访问 | 高 | 0.1% | ⭐⭐⭐⭐⭐ |
| Gate.io | ✅ 可访问 | 中 | 0.2% | ⭐⭐⭐⭐ |
| 火币 | ✅ 可访问 | 中 | 0.2% | ⭐⭐⭐⭐ |
| MEXC | ✅ 可访问 | 中 | 0.2% | ⭐⭐⭐ |
| 币安 | ❌ 需翻墙 | 极高 | 0.1% | ⭐⭐⭐⭐⭐ |

## 💡 推荐配置

### 新手配置：OKX + Gate.io
```
优势：
✅ 都可以直接访问
✅ 流动性充足
✅ 套利机会适中
```

### 进阶配置：OKX + Gate + 火币
```
优势：
✅ 更多套利机会
✅ 三方套利可能
⚠️ 需要分散资金
```

## 📊 套利示例

```
实时价格：
OKX   BTC/USDT: 42,000 USDT
Gate  BTC/USDT: 42,280 USDT

套利机会：
在 OKX 买入：42,050 USDT
在 Gate 卖出：42,250 USDT
毛利润：200 USDT (0.48%)
扣除手续费（0.2%）后
净利润：116 USDT (0.28%)
```

## ⚠️ 风险提示

- 市场有风险，投资需谨慎
- 建议从小额开始测试
- 先在模拟模式运行
- 设置止损限制

## 🛠️ 常用命令

```bash
npm start                  # 启动套利系统
npm run monitor           # 价格监控（不交易）
npm run test:connection   # 测试交易所连接
```

## 📞 获取 API 密钥

### OKX
1. 登录 https://www.okx.com
2. 头像 → API → 创建 API
3. 记录：API Key、Secret Key、Passphrase

### Gate.io
1. 登录 https://www.gate.io
2. 个人中心 → API Keys
3. 记录：API Key、Secret Key

### 火币/HTX
1. 登录 https://www.htx.com
2. 账户 → API 管理
3. 记录：API Key、Secret Key

**重要**：只开启"交易"权限，禁用"提币"权限！

## ❓ 常见问题

**Q: 不翻墙真的能用吗？**  
A: 可以！OKX、Gate.io、火币在国内都可以直接访问。

**Q: 需要多少启动资金？**  
A: 建议至少 500-1000 USDT，分散到2-3个交易所。

**Q: 能保证盈利吗？**  
A: 不能。市场有风险，但系统会帮助你发现和执行套利机会。

**Q: 需要一直盯着电脑吗？**  
A: 不需要。系统可以自动运行，但建议定期检查日志。

## 📈 预期收益

根据历史数据（仅供参考）：

| 市场状况 | 机会频率 | 单次利润 | 日收益率 |
|----------|----------|----------|----------|
| 低波动 | 1-3次/天 | 0.3-0.5% | 0.3-0.5% |
| 正常 | 5-10次/天 | 0.5-1% | 0.5-1% |
| 高波动 | 10+次/天 | 1-2% | 1-2% |

**注意**：过往表现不代表未来收益。

## 🔐 安全建议

1. ✅ API 只开启交易权限
2. ✅ 设置 IP 白名单
3. ✅ 定期更换密钥
4. ✅ 小额资金测试
5. ❌ 不要开启提币权限

## 📱 技术支持

- 查看日志：`logs/combined.log`
- 错误日志：`logs/error.log`
- 交易日志：`logs/trades.log`

## 🎯 下一步

1. 阅读 [QUICKSTART_CHINA.md](QUICKSTART_CHINA.md) 完成设置
2. 在测试模式运行 24 小时
3. 观察套利机会和系统稳定性
4. 小额资金开始自动交易
5. 逐步优化策略

---

## 📜 许可证

MIT License

## ⚖️ 免责声明

本软件仅供学习研究使用。使用本软件交易的风险由用户自行承担。

**加密货币投资有风险，入市需谨慎！**

---

**祝你套利顺利！** 🚀💰

有问题请查看详细文档或检查日志文件。

