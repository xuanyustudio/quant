# 代理测试步骤

## 步骤 1: 在本地测试新版本代理

### 1.1 在一个终端启动本地代理
```powershell
cd d:\work\web3\proxy
node server.js
```

**预期输出：**
```
🚀 币安 API 代理服务器已启动
   地址: http://0.0.0.0:3000
   模式: HTTP CONNECT + URL 转发 (混合模式)
   时间: 2025-10-24 ...
```

### 1.2 在另一个终端测试 CCXT 连接
```powershell
cd d:\work\web3
node test-local-proxy.js
```

**预期输出（成功）：**
```
测试 2: 通过本地代理访问（localhost:3000）...
✅ 代理访问成功: 2025-10-24 23:xx:xx
   💡 本地代理工作正常！
```

**代理服务器日志（成功）：**
```
[CONNECT] api.binance.com:443
  ✓ 隧道已建立: api.binance.com:443
  ↓ 连接关闭: api.binance.com:443 (↑xxx ↓xxx bytes)
```

---

## 步骤 2: 部署到服务器（image.h4yx.com）

### 2.1 上传新版本
```powershell
# 方法1: 使用 SCP
scp proxy/server.js root@image.h4yx.com:/opt/proxy/

# 方法2: 使用 SSH + 粘贴
# 先复制 proxy/server.js 的内容
# 然后：
ssh root@image.h4yx.com
vi /opt/proxy/server.js
# 粘贴内容并保存
```

### 2.2 重启服务器上的代理

**如果使用 PM2：**
```bash
pm2 restart binance-proxy
pm2 logs binance-proxy --lines 20
```

**如果直接运行：**
```bash
# 先停止旧进程
pkill -f "node.*server.js"

# 启动新进程
cd /opt/proxy
nohup node server.js > proxy.log 2>&1 &

# 查看日志
tail -f proxy.log
```

### 2.3 测试远程代理
在本地运行：
```powershell
cd d:\work\web3
node test-local-proxy.js
```

查看 "测试 3" 的结果：
```
测试 3: 通过远程代理访问（image.h4yx.com:3000）...
✅ 远程代理访问成功: 2025-10-24 23:xx:xx
   💡 远程代理工作正常！可以运行统计套利了
```

---

## 步骤 3: 运行统计套利

### 3.1 配置环境变量
确保 `.env` 文件有：
```bash
# 币安代理（如果使用币安）
BINANCE_PROXY_URL=http://image.h4yx.com:3000

# 或使用 OKX（国内直连，无需代理）
OKX_API_KEY=your_key
OKX_SECRET=your_secret
OKX_PASSWORD=your_password
```

### 3.2 运行回测
```powershell
npm run stat-arb:backtest
```

### 3.3 实时监控（模拟）
```powershell
npm run stat-arb
```

---

## 故障排查

### 问题: 本地测试失败 "fetch failed"
**原因：** 本地代理未启动或端口被占用

**解决：**
```powershell
# 检查端口占用
netstat -ano | findstr :3000

# 如果被占用，杀掉进程
taskkill /F /PID <PID>

# 重新启动代理
cd proxy
node server.js
```

### 问题: 远程测试失败 "fetch failed"
**原因：** 服务器代理未更新或未运行

**解决：**
```bash
# SSH 到服务器
ssh root@image.h4yx.com

# 检查代理是否运行
ps aux | grep server.js

# 如果未运行，启动它
cd /opt/proxy
node server.js
```

### 问题: 仍然出现 "read ECONNRESET"
**原因：** 可能是防火墙或网络问题

**解决：**
1. 检查服务器防火墙：`ufw status`
2. 确保 3000 端口开放：`ufw allow 3000`
3. 尝试使用 OKX（无需代理）：
   ```javascript
   // src/statistical-arbitrage/config.js
   exchange: {
     id: 'okx',  // 改用 OKX
     // ...
   }
   ```

---

## 下一步

✅ **本地测试成功** → 部署到服务器  
✅ **远程测试成功** → 运行统计套利  
❌ **测试失败** → 查看故障排查部分

