# 🇨🇳 国内用户设置指南

专门为国内用户准备的设置指南，解决网络访问问题。

## 🚫 问题说明

币安（Binance）的 API 在国内无法直接访问：
- `api.binance.com` - 无法连接
- 需要翻墙或使用代理

## ✅ 解决方案

### 方案一：使用国内可访问的交易所（推荐）

以下交易所在国内可以正常访问：

#### 1. OKX（欧易）
- ✅ 国内可访问
- ✅ 流动性好
- ✅ 手续费低（0.1%）
- 官网：https://www.okx.com/

#### 2. Gate.io（芝麻开门）
- ✅ 国内可访问
- ✅ 币种丰富
- ✅ API稳定
- 官网：https://www.gate.io/

#### 3. 火币 Huobi（HTX）
- ✅ 国内交易所
- ✅ 完全可访问
- 官网：https://www.htx.com/

#### 4. MEXC（抹茶）
- ✅ 国内可访问
- ✅ 币种多
- ✅ 新币机会多
- 官网：https://www.mexc.com/

### 方案二：使用代理访问币安

如果你有代理服务器（VPN、梯子等），可以配置代理访问币安。

#### 步骤：

1. **启动你的代理软件**（如 Clash、V2Ray 等）

2. **获取代理地址**，通常是：
   ```
   HTTP代理: http://127.0.0.1:7890
   SOCKS5代理: socks5://127.0.0.1:7891
   ```

3. **配置环境变量**

在 `.env` 文件中添加：
```env
# 代理配置
PROXY_URL=http://127.0.0.1:7890

# 或者使用 SOCKS5
# PROXY_URL=socks5://127.0.0.1:7891
```

4. **更新代码以支持代理**

编辑 `src/exchanges/ExchangeManager.js`：

```javascript
this.exchanges[name] = new ExchangeClass({
  apiKey: config.apiKey,
  secret: config.secret,
  password: config.password,
  enableRateLimit: true,
  // 添加代理配置
  proxy: process.env.PROXY_URL || config.options?.proxy,
  options: {
    defaultType: config.defaultType || 'spot',
    ...config.options
  }
});
```

## 🚀 快速开始（国内版）

### 第一步：使用国内配置

我已经为你准备了国内专用配置文件：

```bash
# 方法1：替换配置文件
cp src/config/config.china.js src/config/config.js

# 方法2：或者手动编辑 src/config/config.js
# 将 binance.enabled 改为 false
# 确保 okx, gate, huobi 的 enabled 为 true
```

### 第二步：配置 API 密钥

编辑 `.env` 文件：

```env
# ========== OKX（推荐）==========
OKX_API_KEY=你的OKX_API密钥
OKX_SECRET=你的OKX_Secret密钥
OKX_PASSWORD=你的OKX_API密码

# ========== Gate.io ==========
GATE_API_KEY=你的Gate_API密钥
GATE_SECRET=你的Gate_Secret密钥

# ========== 火币 Huobi ==========
HUOBI_API_KEY=你的火币API密钥
HUOBI_SECRET=你的火币Secret密钥

# ========== MEXC（可选）==========
MEXC_API_KEY=你的MEXC_API密钥
MEXC_SECRET=你的MEXC_Secret密钥

# ========== 如果使用代理访问币安 ==========
PROXY_URL=http://127.0.0.1:7890
BINANCE_API_KEY=你的币安API密钥
BINANCE_SECRET=你的币安Secret密钥
```

### 第三步：获取 API 密钥

#### OKX API 密钥获取步骤：

1. 登录 OKX 账户
2. 点击右上角头像 → **API**
3. 点击 **创建API**
4. 设置权限：
   - ✅ 交易权限
   - ❌ 提币权限
5. 设置 IP 白名单（推荐）
6. **记录三个信息**：
   - API Key
   - Secret Key
   - Passphrase（密码短语）

#### Gate.io API 密钥获取：

1. 登录 Gate.io 账户
2. 个人中心 → **API密钥**
3. 创建新密钥
4. 设置权限：
   - ✅ 现货交易
   - ❌ 提币权限
5. 保存 API Key 和 Secret Key

#### 火币 API 密钥获取：

1. 登录火币账户
2. 账户 → **API管理**
3. 创建API密钥
4. 设置权限：
   - ✅ 交易权限
   - ❌ 提币权限
5. 保存 API Key 和 Secret Key

### 第四步：测试连接

```bash
npm install
npm run test:connection
```

应该看到：
```
✅ okx 连接成功
✅ gate 连接成功
✅ huobi 连接成功
```

### 第五步：启动系统

```bash
npm start
```

## 📊 推荐的交易所组合

### 组合一：OKX + Gate.io
- ✅ 都可以国内访问
- ✅ 流动性好
- ✅ API稳定
- **适合：新手和稳定套利**

### 组合二：OKX + 火币
- ✅ 国内访问流畅
- ✅ 价格差异较大
- **适合：追求机会数量**

### 组合三：OKX + Gate + 火币
- ✅ 三个交易所
- ✅ 更多套利机会
- ⚠️ 需要分散资金
- **适合：有一定资金量**

### 组合四（进阶）：国内交易所 + 币安（代理）
- ✅ 币安流动性最好
- ⚠️ 需要稳定代理
- **适合：有稳定代理的用户**

## 🔧 代理配置详解

### 支持的代理类型

- HTTP 代理：`http://host:port`
- HTTPS 代理：`https://host:port`
- SOCKS5 代理：`socks5://host:port`
- 带认证的代理：`http://username:password@host:port`

### 常见代理软件端口

| 软件 | HTTP端口 | SOCKS5端口 |
|------|----------|------------|
| Clash | 7890 | 7891 |
| V2Ray | 10809 | 10808 |
| Shadowsocks | 1087 | 1080 |
| Surge | 6152 | - |

### 测试代理是否工作

```bash
# Linux/Mac
curl -x http://127.0.0.1:7890 https://api.binance.com/api/v3/ping

# Windows PowerShell
Invoke-WebRequest -Uri "https://api.binance.com/api/v3/ping" -Proxy "http://127.0.0.1:7890"
```

如果返回 `{}` 表示代理工作正常。

## ⚠️ 注意事项

### 1. 网络稳定性

- 国内网络偶尔会有波动
- 建议使用有线网络
- 避免高峰时段（晚上8-11点）

### 2. 交易所选择

**推荐优先级：**
1. OKX（最推荐，流动性好）
2. Gate.io（币种多）
3. 火币（老牌交易所）
4. MEXC（新币多但风险大）

### 3. API 限制

不同交易所的 API 调用限制：

| 交易所 | 请求限制 | 权重系统 |
|--------|----------|----------|
| OKX | 20次/2秒 | 否 |
| Gate | 900次/秒 | 否 |
| 火币 | 100次/10秒 | 是 |
| 币安 | 1200次/分钟 | 是 |

### 4. 手续费对比

| 交易所 | Maker | Taker | VIP折扣 |
|--------|-------|-------|---------|
| OKX | 0.08% | 0.1% | 最低0.05% |
| Gate | 0.15% | 0.2% | 最低0.1% |
| 火币 | 0.1% | 0.15% | 最低0.05% |
| 币安 | 0.1% | 0.1% | 最低0.02% |

## 🆘 常见问题

### Q: 为什么我配置了代理，币安还是连不上？

A: 检查以下几点：
1. 代理软件是否正在运行？
2. 代理端口是否正确？
3. 是否开启了"系统代理"？
4. 尝试在浏览器中访问 https://www.binance.com 测试

### Q: 只用国内交易所能赚钱吗？

A: 可以！国内交易所之间也有价格差异。实际上：
- OKX vs Gate 经常有套利机会
- 流动性足够支撑小额套利
- 无需翻墙，更稳定

### Q: OKX 的 API 密码（Passphrase）在哪里？

A: 创建 API 时你自己设置的密码，务必记录下来。如果忘记了只能删除重新创建。

### Q: 火币改名 HTX 后，API 还能用吗？

A: 可以！API 地址没变，CCXT 库中仍使用 `huobi` 作为ID。

### Q: MEXC（抹茶）靠谱吗？

A: MEXC 是正规交易所，但：
- ✅ 优点：币种多，上新快
- ⚠️ 缺点：流动性相对较小
- 💡 建议：可以作为第三、第四个交易所使用

## 📱 推荐工具

### 1. 网络监控

```bash
# 安装 ping 监控工具
npm install -g fast-ping

# 监控交易所延迟
fast-ping api.okx.com
fast-ping api.gateio.ws
fast-ping api.huobi.pro
```

### 2. 代理切换

如果使用多个代理，可以配置代理池：

```javascript
// 在 .env 中配置多个代理
PROXY_POOL=http://127.0.0.1:7890,http://127.0.0.1:7891
```

## 🎯 总结

### 国内用户最佳实践

1. **首选方案**：OKX + Gate.io（无需翻墙）
2. **进阶方案**：添加火币或 MEXC
3. **高级方案**：稳定代理 + 币安

### 配置检查清单

- [ ] 选择了国内可访问的交易所
- [ ] 正确配置了 API 密钥
- [ ] 设置了 IP 白名单（推荐）
- [ ] 测试连接成功
- [ ] 在测试模式运行正常

---

**祝你套利顺利！如有问题随时查看日志文件。** 🚀

💡 **小贴士**：建议先用 OKX + Gate.io 的组合，熟悉系统后再考虑添加其他交易所。

