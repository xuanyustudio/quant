# 🌐 币安 API 代理服务器

将币安 API 请求通过你的海外服务器代理转发，解决国内访问限制。

## 📋 功能特点

- ✅ 转发所有 HTTP 方法（GET, POST, PUT, DELETE 等）
- ✅ 保留所有请求头和参数
- ✅ 支持 WebSocket 连接
- ✅ 支持 CORS 跨域
- ✅ 详细的请求日志
- ✅ 健康检查端点

## 🚀 快速开始

### 在海外服务器部署

#### 1. 安装依赖

```bash
cd proxy
npm install
```

#### 2. 配置（可选）

```bash
cp .env.example .env
# 编辑 .env 修改端口等配置
```

#### 3. 启动服务

```bash
# 直接启动
npm start

# 或使用 PM2（生产环境推荐）
npm install -g pm2
npm run pm2
```

#### 4. 测试

```bash
# 测试连接
curl http://localhost:3000/api/v3/ping

# 测试时间
curl http://localhost:3000/api/v3/time

# 健康检查
curl http://localhost:3000/health
```

## 🔧 配置说明

### 环境变量

在 `.env` 文件中配置：

```env
PROXY_PORT=3000                    # 监听端口
TARGET_URL=https://api.binance.com # 目标地址
LOG_LEVEL=info                     # 日志级别
```

### 防火墙设置

确保开放端口：

```bash
# Ubuntu/Debian
sudo ufw allow 3000

# CentOS/RHEL
sudo firewall-cmd --add-port=3000/tcp --permanent
sudo firewall-cmd --reload
```

## 📱 在主程序中使用

### 方法一：修改配置文件

编辑 `src/config/config.js`：

```javascript
exchanges: {
  binance: {
    id: 'binance',
    enabled: true,
    apiKey: process.env.BINANCE_API_KEY,
    secret: process.env.BINANCE_SECRET,
    options: {
      // 使用你的代理服务器
      urls: {
        api: 'http://image.h4yx.com:3000',
        // 如果需要 WebSocket
        ws: 'ws://image.h4yx.com:3000'
      }
    }
  }
}
```

### 方法二：使用环境变量

在 `.env` 文件中：

```env
BINANCE_PROXY_URL=http://image.h4yx.com:3000
```

然后在代码中：

```javascript
const exchange = new ccxt.binance({
  apiKey: API_KEY,
  secret: SECRET,
  urls: {
    api: process.env.BINANCE_PROXY_URL || 'https://api.binance.com'
  }
});
```

## 🛡️ 安全建议

### 1. 添加认证

在 `server.js` 中添加简单的 Token 认证：

```javascript
// 在代理中间件之前添加
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'your-secret-token';

app.use((req, res, next) => {
  const token = req.headers['x-auth-token'];
  if (token !== AUTH_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});
```

客户端使用：

```javascript
fetch('http://your-server:3000/api/v3/ping', {
  headers: {
    'X-Auth-Token': 'your-secret-token'
  }
});
```

### 2. 限制访问 IP

```javascript
const ALLOWED_IPS = ['1.2.3.4', '5.6.7.8']; // 你的IP列表

app.use((req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  if (!ALLOWED_IPS.includes(clientIP)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
});
```

### 3. 使用 HTTPS

使用 Nginx 作为反向代理并配置 SSL：

```nginx
server {
    listen 443 ssl;
    server_name image.h4yx.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4. 限流保护

安装 express-rate-limit：

```bash
npm install express-rate-limit
```

在 `server.js` 中：

```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1分钟
  max: 100 // 最多100个请求
});

app.use(limiter);
```

## 📊 监控和管理

### 使用 PM2 管理

```bash
# 启动
pm2 start server.js --name binance-proxy

# 查看状态
pm2 status

# 查看日志
pm2 logs binance-proxy

# 重启
pm2 restart binance-proxy

# 停止
pm2 stop binance-proxy

# 开机自启
pm2 startup
pm2 save
```

### 查看日志

```bash
# 实时日志
pm2 logs binance-proxy --lines 100

# 或使用 tail
tail -f logs/proxy.log
```

## 🧪 测试脚本

创建 `test.js`：

```javascript
import fetch from 'node-fetch';

const PROXY_URL = 'http://image.h4yx.com:3000';

async function test() {
  try {
    // 测试 1: Ping
    console.log('测试 1: Ping...');
    const ping = await fetch(`${PROXY_URL}/api/v3/ping`);
    console.log('✅ Ping:', await ping.json());
    
    // 测试 2: 获取服务器时间
    console.log('\n测试 2: 服务器时间...');
    const time = await fetch(`${PROXY_URL}/api/v3/time`);
    console.log('✅ 时间:', await time.json());
    
    // 测试 3: 获取交易对信息
    console.log('\n测试 3: 交易对信息...');
    const ticker = await fetch(`${PROXY_URL}/api/v3/ticker/24hr?symbol=BTCUSDT`);
    const tickerData = await ticker.json();
    console.log('✅ BTC/USDT 价格:', tickerData.lastPrice);
    
    console.log('\n🎉 所有测试通过！');
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

test();
```

运行测试：

```bash
npm install node-fetch
node test.js
```

## ⚠️ 注意事项

1. **性能考虑**
   - 代理服务器会增加延迟（通常 50-200ms）
   - 确保服务器带宽充足
   - 考虑使用 CDN 或负载均衡

2. **成本**
   - 海外 VPS 费用（5-20美元/月）
   - 流量费用（如果有限制）

3. **稳定性**
   - 使用 PM2 确保进程不会崩溃
   - 设置监控告警
   - 定期检查服务状态

4. **合规性**
   - 确保符合币安服务条款
   - 仅供个人使用
   - 不要分享给他人

## 🆘 故障排除

### 问题：连接被拒绝

```bash
# 检查服务是否运行
pm2 status

# 检查端口是否监听
netstat -tlnp | grep 3000

# 检查防火墙
sudo ufw status
```

### 问题：请求超时

```javascript
// 增加超时时间
const proxyOptions = {
  // ...
  proxyTimeout: 600000,  // 10分钟
  timeout: 600000
};
```

### 问题：CORS 错误

```javascript
// 放宽 CORS 设置
app.use(cors({
  origin: '*',
  credentials: true
}));
```

## 📈 性能优化

### 1. 启用缓存

```javascript
import apicache from 'apicache';
const cache = apicache.middleware;

// 缓存某些只读端点
app.use('/api/v3/exchangeInfo', cache('5 minutes'));
app.use('/api/v3/ticker', cache('10 seconds'));
```

### 2. 压缩响应

```javascript
import compression from 'compression';
app.use(compression());
```

### 3. 集群模式

```javascript
// server-cluster.js
import cluster from 'cluster';
import os from 'os';

if (cluster.isMaster) {
  const cpus = os.cpus().length;
  for (let i = 0; i < cpus; i++) {
    cluster.fork();
  }
} else {
  // 启动服务器
  import('./server.js');
}
```

## 📞 支持

如有问题，请检查：
1. 服务器日志 `pm2 logs`
2. 网络连接 `ping image.h4yx.com`
3. 端口开放 `telnet image.h4yx.com 3000`

---

**祝使用愉快！** 🚀

