# 🔧 修复API连接错误

## 当前问题

从日志可以看到：

```
获取K线数据失败 [ID/USDT]:
❌ 处理 ID/USDT/HOOK/USDT 时出错:

获取K线数据失败 [MINA/USDT]:
❌ 处理 MINA/USDT/POLYX/USDT 时出错:
```

**根本原因：** 服务器无法访问币安API，最可能是**IP白名单**问题。

---

## 🚀 快速解决方案

### 方案1：添加服务器IP到币安白名单（推荐）

#### **第1步：查询服务器IP**

在服务器上运行：

```bash
curl ifconfig.me
```

输出示例：`123.45.67.89`

#### **第2步：添加到币安白名单**

1. 登录币安账户
2. 进入 **API管理**
3. 找到您的API密钥，点击 **编辑**
4. 在 **"IP访问限制"** 部分
5. 添加服务器IP：`123.45.67.89`
6. 点击 **保存**

#### **第3步：等待生效（1-2分钟）**

#### **第4步：重启系统**

```bash
pm2 restart stat-arb
pm2 logs stat-arb
```

---

### 方案2：取消IP限制（快速但安全性降低）

如果您的服务器IP经常变化，或者只是测试：

1. 登录币安账户
2. 进入 **API管理**
3. 找到您的API密钥，点击 **编辑**
4. 在 **"IP访问限制"** 部分选择 **"不限制"**
5. 点击 **保存**
6. 重启系统：`pm2 restart stat-arb`

⚠️ **注意：** 这会降低安全性，**务必不要开启提现权限**！

---

## 🔍 诊断工具

我已经为您创建了一个诊断工具。在服务器上运行：

```bash
# 1. 上传新文件：
#    - src/statistical-arbitrage/DataCollector.js
#    - src/statistical-arbitrage/index.js
#    - diagnose-live-trading.js

# 2. 运行诊断
node diagnose-live-trading.js
```

这个工具会：
- ✅ 检查环境变量配置
- ✅ 查询服务器IP
- ✅ 测试币安API连接
- ✅ 测试获取K线数据
- ✅ 检查配置文件
- ✅ 检查PM2状态

---

## 📊 验证修复

修复后，运行：

```bash
pm2 restart stat-arb
pm2 logs stat-arb --lines 50
```

**成功的标志：**

```
📊 ID/USDT / HOOK/USDT [2025/10/28 23:00:01]
   💰 当前价格: ID/USDT=$0.50123456 | HOOK/USDT=$0.39876543
   📈 价格比率: 1.2567
   📊 相关系数: 0.823 ✨
   🎯 Z-Score: 1.04
   ⏸️ 信号: HOLD - 观望: Z=1.04
   💼 持仓状态: 无持仓
```

如果看到完整的价格和统计信息，说明修复成功！✅

---

## 🆘 如果还是不行

### 1. 检查API密钥

```bash
cat .env | grep BINANCE
```

确保：
- `BINANCE_API_KEY` 正确
- `BINANCE_API_SECRET` 正确（注意不是 `BINANCE_SECRET`）

### 2. 检查API权限

登录币安 → API管理 → 检查权限：
- ✅ **读取** 权限已开启
- ✅ **现货交易** 权限已开启
- ❌ **提现** 权限已关闭（安全）

### 3. 手动测试API

```bash
node test-api-connection.js
```

### 4. 完整重启

```bash
pm2 delete stat-arb
pm2 start ecosystem.config.cjs
pm2 logs stat-arb
```

---

## 💡 常见错误和解决方法

### 错误1：`Invalid API-key, IP, or permissions`

**原因：** IP不在白名单或API密钥错误

**解决：**
1. 查询IP：`curl ifconfig.me`
2. 添加到币安白名单
3. 或取消IP限制

---

### 错误2：`binance GET ... fetch failed`

**原因：** 网络连接问题

**解决：**
1. 检查服务器网络：`ping api.binance.com`
2. 检查代理设置：`echo $HTTPS_PROXY`
3. 确保 `USE_PROXY=false`（服务器环境）

---

### 错误3：`insufficient permissions`

**原因：** API权限不足

**解决：**
1. 登录币安 → API管理
2. 编辑API → 权限设置
3. 开启"读取"和"现货交易"权限

---

## 📝 更新文件清单

需要上传到服务器的文件：

1. ✅ `src/statistical-arbitrage/DataCollector.js` - 增强错误输出
2. ✅ `src/statistical-arbitrage/index.js` - 增强错误处理
3. ✅ `diagnose-live-trading.js` - 诊断工具（新文件）

---

## 🎯 完整修复流程

```bash
# 1. 上传更新的文件

# 2. 查询服务器IP
curl ifconfig.me

# 3. 将IP添加到币安白名单（浏览器操作）

# 4. 运行诊断工具
node diagnose-live-trading.js

# 5. 如果诊断通过，重启系统
pm2 restart stat-arb

# 6. 查看日志
pm2 logs stat-arb --lines 50

# 7. 如果看到价格和Z-Score，说明成功！✅
```

---

祝修复顺利！💪

