# 🌐 支持 HTTP CONNECT 的代理服务器

## 功能特性

✅ **双模式支持**：
1. **URL转发模式**: 直接访问 `http://proxy:3000/api/v3/ping`
2. **HTTP CONNECT 模式**: 标准 HTTP 代理协议，支持 CCXT 等库

✅ **完全兼容 CCXT**: 可用作 `httpsProxy` 参数

✅ **低延迟隧道**: 使用 TCP 隧道直接转发流量

## 快速开始

### 在服务器上部署

```bash
# 1. 上传文件
scp server.js root@image.h4yx.com:/opt/proxy/

# 2. SSH 到服务器
ssh root@image.h4yx.com

# 3. 启动服务
cd /opt/proxy
node server.js

# 或使用 PM2 后台运行
pm2 start server.js --name binance-proxy-connect
pm2 save
```

### 测试代理

**Linux/Mac:**
```bash
# URL转发模式
curl http://image.h4yx.com:3000/api/v3/ping

# CONNECT 代理模式
export HTTPS_PROXY=http://image.h4yx.com:3000
curl https://api.binance.com/api/v3/ping
```

**Windows PowerShell:**
```powershell
# URL转发模式
curl http://image.h4yx.com:3000/api/v3/ping

# CONNECT 代理模式
$env:HTTPS_PROXY="http://image.h4yx.com:3000"
curl https://api.binance.com/api/v3/ping
```

## 在 CCXT 中使用

### 方法1: 配置文件中设置

`src/statistical-arbitrage/config.js`:

```javascript
export default {
  exchange: {
    id: 'binance',
    apiKey: process.env.BINANCE_API_KEY,
    secret: process.env.BINANCE_SECRET,
    httpsProxy: 'http://image.h4yx.com:3000',  // ← 使用你的代理
    enableRateLimit: true,
    options: {
      adjustForTimeDifference: true,
      defaultType: 'spot'
    }
  },
  // ...
};
```

### 方法2: 环境变量

```bash
# Linux/Mac
export HTTPS_PROXY=http://image.h4yx.com:3000
npm run stat-arb:find-pairs

# Windows
set HTTPS_PROXY=http://image.h4yx.com:3000
npm run stat-arb:find-pairs
```

### 方法3: .env 文件

```env
HTTPS_PROXY=http://image.h4yx.com:3000
```

## 测试脚本

### 自动测试（Linux/Mac）

```bash
chmod +x test-connect-proxy.sh
./test-connect-proxy.sh
```

### 自动测试（Windows）

```powershell
.\test-connect-proxy.ps1
```

### 手动测试

```bash
# 测试健康检查
curl http://image.h4yx.com:3000/health

# 测试 CONNECT 模式
export HTTPS_PROXY=http://image.h4yx.com:3000
node -e "
import ccxt from 'ccxt';
const e = new ccxt.binance({httpsProxy: 'http://image.h4yx.com:3000'});
e.fetchTime().then(t => console.log('✅ Success:', new Date(t)));
"
```

## 日志说明

```
[2025-10-24T12:00:00.000Z] [CONNECT] api.binance.com:443
[2025-10-24T12:00:00.100Z]   ✓ 隧道已建立: api.binance.com:443
[2025-10-24T12:00:05.000Z]   ↓ 连接关闭: api.binance.com:443 (↑1024 ↓2048 bytes)
```

说明：
- `[CONNECT]`: 收到 CONNECT 请求
- `✓ 隧道已建立`: TCP 隧道建立成功
- `↓ 连接关闭`: 连接关闭，显示上传/下载字节数

## 性能优化

### 增加超时时间

```javascript
// server.js 中添加
server.timeout = 300000;  // 5分钟
server.keepAliveTimeout = 65000;  // 65秒
```

### 使用集群模式

```javascript
// server-cluster.js
import cluster from 'cluster';
import os from 'os';

if (cluster.isMaster) {
  const cpus = os.cpus().length;
  console.log(`主进程 ${process.pid} 正在运行`);
  
  for (let i = 0; i < cpus; i++) {
    cluster.fork();
  }
  
  cluster.on('exit', (worker) => {
    console.log(`工作进程 ${worker.process.pid} 已退出`);
    cluster.fork();  // 自动重启
  });
} else {
  // 启动服务器
  import('./server.js');
}
```

## 故障排除

### 问题1: CONNECT 请求超时

**原因**: 目标服务器无法访问或防火墙阻止

**解决**:
```bash
# 测试目标服务器连接
nc -zv api.binance.com 443

# 检查防火墙
sudo iptables -L OUTPUT
```

### 问题2: 客户端报错 "Proxy Error"

**原因**: 代理服务器无法建立到目标的连接

**解决**:
1. 检查代理服务器网络
2. 查看代理服务器日志
3. 确认目标地址可访问

### 问题3: 大量连接但无数据传输

**原因**: 可能是 SSL 握手失败

**解决**:
- CONNECT 代理不参与 SSL 握手
- 检查客户端 SSL 配置
- 确认目标服务器 SSL 证书有效

## 监控

### PM2 监控

```bash
# 查看状态
pm2 status

# 实时日志
pm2 logs binance-proxy-connect --lines 100

# 资源使用
pm2 monit
```

### 自定义监控

```javascript
// 在 server.js 中添加
let connectCount = 0;
let activeConnections = 0;

server.on('connect', (req, clientSocket, head) => {
  connectCount++;
  activeConnections++;
  
  clientSocket.on('end', () => {
    activeConnections--;
  });
});

// 每分钟输出统计
setInterval(() => {
  console.log(`统计: 总连接=${connectCount}, 活跃=${activeConnections}`);
}, 60000);
```

## 安全建议

### 1. 添加认证

```javascript
server.on('connect', (req, clientSocket, head) => {
  const auth = req.headers['proxy-authorization'];
  if (auth !== 'Basic ' + Buffer.from('user:pass').toString('base64')) {
    clientSocket.end('HTTP/1.1 407 Proxy Authentication Required\r\n\r\n');
    return;
  }
  // ... 正常处理
});
```

### 2. IP 白名单

```javascript
const ALLOWED_IPS = ['1.2.3.4', '5.6.7.8'];

server.on('connect', (req, clientSocket, head) => {
  const clientIP = clientSocket.remoteAddress;
  if (!ALLOWED_IPS.includes(clientIP)) {
    clientSocket.end('HTTP/1.1 403 Forbidden\r\n\r\n');
    return;
  }
  // ... 正常处理
});
```

### 3. 限制目标地址

```javascript
const ALLOWED_HOSTS = ['api.binance.com', 'www.okx.com'];

server.on('connect', (req, clientSocket, head) => {
  const { hostname } = parseHostPort(req.url);
  if (!ALLOWED_HOSTS.includes(hostname)) {
    clientSocket.end('HTTP/1.1 403 Forbidden\r\n\r\n');
    return;
  }
  // ... 正常处理
});
```

## 与之前版本的区别

| 特性 | 旧版本 (URL转发) | 新版本 (CONNECT) |
|------|------------------|------------------|
| 支持 CCXT | ❌ 不支持 | ✅ 完全支持 |
| URL 转发 | ✅ 支持 | ✅ 支持 |
| 性能 | 中等 | 高 (直接隧道) |
| 日志详细度 | 高 | 中 |
| SSL 处理 | 代理处理 | 客户端直接处理 |

## 升级步骤

```bash
# 1. 备份旧版本
cp server.js server.js.backup

# 2. 替换新版本
# (已完成)

# 3. 重启服务
pm2 restart binance-proxy

# 4. 测试
curl http://image.h4yx.com:3000/health
```

---

**现在你的代理服务器同时支持 URL转发 和 HTTP CONNECT 模式了！** 🎉

