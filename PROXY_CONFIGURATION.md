# 🌐 代理配置说明

## 什么时候需要代理？

### ✅ 需要代理（中国大陆本地运行）

如果您在**中国大陆**的**本地电脑**上运行代码，需要代理访问币安等交易所：

```env
USE_PROXY=true
HTTPS_PROXY=http://127.0.0.1:7890  # Clash等代理软件的地址
```

**原因：** 币安等交易所的API在中国大陆被墙，无法直接访问。

### ❌ 不需要代理（海外服务器）

如果您在**海外服务器**（如AWS、阿里云国际、腾讯云国际等）上运行：

```env
USE_PROXY=false
# HTTPS_PROXY=  # 可以注释掉或留空
```

**原因：** 海外服务器可以直接访问币安API，不需要代理。

---

## 🔧 配置方法

### 方法1：编辑 .env 文件（推荐）

```bash
# 打开配置文件
nano .env

# 或
vim .env
```

**本地电脑（需要代理）：**
```env
USE_PROXY=true
HTTPS_PROXY=http://127.0.0.1:7890
```

**海外服务器（不需要代理）：**
```env
USE_PROXY=false
```

### 方法2：临时环境变量

```bash
# Linux/Mac
export USE_PROXY=false
node src/statistical-arbitrage/live-trading.js --config=...

# Windows PowerShell
$env:USE_PROXY="false"
node src/statistical-arbitrage/live-trading.js --config=...
```

---

## 📋 常用代理软件端口

### Clash
```env
HTTPS_PROXY=http://127.0.0.1:7890
```

### V2Ray/V2RayN
```env
HTTPS_PROXY=http://127.0.0.1:10809
```

### Shadowsocks
```env
HTTPS_PROXY=http://127.0.0.1:1080
```

### 自定义代理
```env
HTTPS_PROXY=http://your-proxy-host:port
```

---

## 🧪 测试代理配置

运行测试脚本检查配置是否正确：

```bash
node test-api-connection.js
```

**成功输出示例（使用代理）：**
```
✅ 代理已配置: http://127.0.0.1:7890
✅ API密钥已配置

🔌 测试币安API连接...
✅ 币安API连接成功！
```

**成功输出示例（不使用代理）：**
```
🌐 直连模式（不使用代理）
✅ API密钥已配置

🔌 测试币安API连接...
✅ 币安API连接成功！
```

---

## 🚨 常见问题

### 问题1：代理连接失败

```
❌ fetch failed
```

**解决方法：**
1. 确认代理软件正在运行
2. 检查代理端口是否正确
3. 确认代理软件的"允许局域网连接"已开启

### 问题2：IP被限制

```
AuthenticationError: {"code":-2015,"msg":"Invalid API-key, IP, or permissions"}
```

**解决方法：**
1. 查询当前IP：`node check-my-ip.js`
2. 在币安API管理中添加该IP到白名单
3. 或者取消IP限制（降低安全性）

### 问题3：服务器应该用代理吗？

**不需要！** 海外服务器可以直接访问币安API。

设置：
```env
USE_PROXY=false
```

如果您的海外服务器也无法访问（极少数情况）：
- 检查服务器地域（某些地区可能有限制）
- 尝试更换服务器地域
- 或在服务器上配置代理

---

## 📊 配置决策流程图

```
是否在中国大陆？
    │
    ├─ 是 → 在本地电脑？
    │       │
    │       ├─ 是 → USE_PROXY=true + 配置代理地址
    │       │
    │       └─ 否（VPN到海外）→ USE_PROXY=false
    │
    └─ 否（海外）→ USE_PROXY=false
```

---

## 💡 最佳实践

### 开发环境（本地）
```env
USE_PROXY=true
HTTPS_PROXY=http://127.0.0.1:7890
```

### 生产环境（服务器）
```env
USE_PROXY=false
```

### 切换环境
只需修改 `USE_PROXY` 即可：

```bash
# 从本地切换到服务器
sed -i 's/USE_PROXY=true/USE_PROXY=false/' .env

# 从服务器切换到本地
sed -i 's/USE_PROXY=false/USE_PROXY=true/' .env
```

---

## 🔗 相关文档

- **API连接测试**: 运行 `node test-api-connection.js`
- **IP查询工具**: 运行 `node check-my-ip.js`
- **服务器部署**: 查看 `SERVER_QUICKSTART.md`
- **PM2管理**: 查看 `docs/PM2_GUIDE.md`

---

需要帮助？检查日志：
```bash
pm2 logs stat-arb
```
