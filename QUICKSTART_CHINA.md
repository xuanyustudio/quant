# ⚡ 快速开始指南（国内版）

## 🇨🇳 专为国内用户准备

5 分钟快速启动，无需翻墙！

## 📦 第一步：安装

```bash
npm install
```

## 🔑 第二步：配置 API 密钥

### 复制配置模板

```bash
cp env.example .env
```

### 在 `.env` 文件中填入 API 密钥

**推荐使用国内可访问的交易所：**

```env
# OKX（推荐，国内可访问）
OKX_API_KEY=你的OKX_API密钥
OKX_SECRET=你的OKX_Secret密钥
OKX_PASSWORD=你的OKX_API密码

# Gate.io（国内可访问）
GATE_API_KEY=你的Gate_API密钥
GATE_SECRET=你的Gate_Secret密钥

# 火币（国内可访问）
HUOBI_API_KEY=你的火币API密钥
HUOBI_SECRET=你的火币Secret密钥
```

## 🏦 第三步：选择交易所

### 方案A：使用国内配置（推荐）

```bash
# 使用国内专用配置
cp src/config/config.china.js src/config/config.js
```

这个配置已经：
- ✅ 启用了 OKX、Gate.io、火币
- ✅ 禁用了币安（避免连接问题）

### 方案B：手动配置

编辑 `src/config/config.js`，确认：

```javascript
exchanges: {
  binance: {
    enabled: false,  // 禁用币安
  },
  okx: {
    enabled: true,   // 启用 OKX
  },
  gate: {
    enabled: true,   // 启用 Gate
  },
  huobi: {
    enabled: true,   // 启用火币
  }
}
```

## 🧪 第四步：测试连接

```bash
npm run test:connection
```

应该看到：
```
✅ okx 连接成功
✅ gate 连接成功  
✅ huobi 连接成功
```

## 🚀 第五步：启动系统

```bash
npm start
```

你应该看到：
```
🚀 启动加密货币套利系统...
🔄 初始化交易所连接...
✅ okx 连接成功 | 账户资金已加载
✅ gate 连接成功 | 账户资金已加载
✅ 所有交易所连接成功
📊 监控交易对: BTC/USDT, ETH/USDT
```

## 📊 （可选）价格监控

想先观察价格差异？运行监控工具：

```bash
npm run monitor
```

这会显示实时价格和潜在套利机会，但不会执行交易。

## 🎯 推荐配置

### 新手推荐：OKX + Gate.io

**优势：**
- ✅ 都可以国内访问
- ✅ 流动性充足
- ✅ API 稳定
- ✅ 套利机会较多

### 进阶推荐：OKX + Gate + 火币

**优势：**
- ✅ 三个交易所更多机会
- ✅ 可以三方套利
- ⚠️ 需要在三个所都有资金

## 🔧 获取 API 密钥

### OKX 快速教程

1. 登录 https://www.okx.com
2. 头像 → **API** → **创建V5 API**
3. 设置权限：
   - ✅ 交易
   - ❌ 提币
4. **记录三个信息**：
   - API Key
   - Secret Key  
   - Passphrase（你自己设的密码）
5. 绑定 IP（推荐但非必需）

### Gate.io 快速教程

1. 登录 https://www.gate.io
2. 个人中心 → **API Keys**
3. **创建 API 密钥**
4. 权限设置：
   - ✅ 现货交易
   - ❌ 提币
5. 保存 API Key 和 Secret

### 火币/HTX 快速教程

1. 登录 https://www.htx.com
2. 账户 → **API 管理**
3. **创建 API Key**
4. 权限：
   - ✅ 交易
   - ❌ 提币
5. 保存密钥

## ⚠️ 重要提示

### 在启用自动交易前：

- ✅ 在测试模式（`autoTrade: false`）运行 24 小时
- ✅ 确认能发现套利机会
- ✅ 检查日志没有错误
- ✅ 只投入小额资金测试

### API 安全设置：

- ✅ 只开启"交易"权限
- ❌ 禁用"提币"权限  
- ✅ 绑定 IP 白名单（推荐）
- ✅ 定期更换密钥

## 📱 常用命令

```bash
npm start                  # 启动套利系统
npm run monitor           # 价格监控工具
npm run test:connection   # 测试连接
```

## 📝 查看日志

```bash
# Windows PowerShell
Get-Content logs/combined.log -Wait -Tail 20

# 如果安装了 Git Bash
tail -f logs/combined.log
```

## ❓ 遇到问题？

### 连接失败
1. 检查 `.env` 中的 API 密钥是否正确
2. 确认 API 密钥的权限设置
3. 检查网络连接
4. 查看 `logs/error.log`

### 没有发现套利机会
- 正常现象，套利机会不是时时都有
- 可以降低配置中的 `minProfitPercent`
- 增加监控的交易对数量
- 耐心等待市场波动

### OKX 需要 Passphrase
- 这是创建 API 时你自己设置的密码
- 不是登录密码
- 如果忘记只能删除重新创建

## 🎉 完成！

系统现在应该正在运行了。查看控制台输出，当发现套利机会时会显示：

```
💰 发现 1 个套利机会
[模拟模式] 套利机会: BTC/USDT | okx -> gate | 利润: 0.65%
```

在 `autoTrade: false` 模式下，系统只会显示机会，不会真实交易。

---

## 📚 更多帮助

- 详细设置：[docs/CHINA_SETUP.md](docs/CHINA_SETUP.md)
- 完整文档：[README.md](README.md)
- 策略优化：[docs/STRATEGIES.md](docs/STRATEGIES.md)

**祝交易顺利！** 🚀

