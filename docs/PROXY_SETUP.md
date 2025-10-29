# 🌐 代理服务器部署指南

完整的币安 API 代理服务器部署教程，让国内用户通过海外服务器访问币安 API。

## 📋 架构说明

```
国内用户程序 → 海外代理服务器 → 币安 API
(套利系统)    (image.h4yx.com)   (api.binance.com)
```

**工作流程：**
1. 国内套利程序发送请求到 `http://image.h4yx.com:3000`
2. 海外服务器接收请求并转发到 `https://api.binance.com`
3. 币安 API 返回数据
4. 海外服务器将数据原封不动返回给国内程序

## 🚀 快速部署

### 步骤一：准备海外服务器

**推荐配置：**
- CPU: 1核心
- 内存: 1GB
- 带宽: 5Mbps
- 系统: Ubuntu 20.04 / CentOS 7+

**推荐服务商：**
- Vultr（5美元/月）
- DigitalOcean（6美元/月）
- AWS Lightsail（5美元/月）
- 搬瓦工（年付）

### 步骤二：连接服务器

```bash
# 使用 SSH 连接
ssh root@image.h4yx.com

# 或使用密钥
ssh -i your-key.pem root@image.h4yx.com
```

### 步骤三：安装 Node.js

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# CentOS/RHEL
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# 验证安装
node -v
npm -v
```

### 步骤四：上传代码

**方法 1：使用 Git（推荐）**

```bash
# 在服务器上克隆项目
cd /opt
git clone https://github.com/your-repo/crypto-arbitrage-bot.git
cd crypto-arbitrage-bot/proxy
```

**方法 2：使用 SCP**

```bash
# 在本地执行
scp -r proxy root@image.h4yx.com:/opt/
```

**方法 3：手动创建文件**

```bash
# 在服务器上创建目录
mkdir -p /opt/binance-proxy
cd /opt/binance-proxy

# 创建文件（参考 proxy 目录下的文件）
```

### 步骤五：安装依赖

```bash
cd /opt/binance-proxy
npm install
```

### 步骤六：配置服务

```bash
# 复制配置文件
cp config.example .env

# 编辑配置（可选）
vim .env
```

配置内容：
```env
PROXY_PORT=3000
TARGET_URL=https://api.binance.com
LOG_LEVEL=info
```

### 步骤七：配置防火墙

```bash
# Ubuntu/Debian - UFW
sudo ufw allow 3000
sudo ufw status

# CentOS/RHEL - Firewalld
sudo firewall-cmd --add-port=3000/tcp --permanent
sudo firewall-cmd --reload
sudo firewall-cmd --list-ports
```

### 步骤八：启动服务

**临时启动（测试用）：**

```bash
node server.js
```

**使用 PM2（生产环境）：**

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start server.js --name binance-proxy

# 设置开机自启
pm2 startup
pm2 save

# 查看状态
pm2 status

# 查看日志
pm2 logs binance-proxy
```

### 步骤九：测试服务

```bash
# 在服务器本地测试
curl http://localhost:3000/health
curl http://localhost:3000/api/v3/ping
curl http://localhost:3000/api/v3/time

# 从外部测试（在你的电脑上）
curl http://image.h4yx.com:3000/health
```

## 🔧 在套利系统中使用

### 方法一：修改 CCXT 配置

编辑 `src/config/config.js`：

```javascript
exchanges: {
  binance: {
    id: 'binance',
    enabled: true,
    apiKey: process.env.BINANCE_API_KEY,
    secret: process.env.BINANCE_SECRET,
    options: {
      // 使用代理服务器
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
# 使用代理服务器
BINANCE_API_URL=http://image.h4yx.com:3000
```

修改 `ExchangeManager.js`：

```javascript
this.exchanges[name] = new ExchangeClass({
  apiKey: config.apiKey,
  secret: config.secret,
  enableRateLimit: true,
  urls: {
    api: process.env.BINANCE_API_URL || 'https://api.binance.com'
  }
});
```

### 方法三：创建专用配置

创建 `src/config/config.proxy.js`：

```javascript
import baseConfig from './config.js';

export default {
  ...baseConfig,
  exchanges: {
    ...baseConfig.exchanges,
    binance: {
      ...baseConfig.exchanges.binance,
      enabled: true,
      options: {
        ...baseConfig.exchanges.binance.options,
        urls: {
          api: 'http://image.h4yx.com:3000'
        }
      }
    }
  }
};
```

## 🛡️ 安全加固

### 1. 添加认证

编辑 `proxy/server.js`，在代理中间件之前添加：

```javascript
// 简单的 Token 认证
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'your-secret-token';

app.use((req, res, next) => {
  // 健康检查不需要认证
  if (req.path === '/health') {
    return next();
  }
  
  const token = req.headers['x-auth-token'];
  if (!token || token !== AUTH_TOKEN) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Missing or invalid auth token'
    });
  }
  next();
});
```

配置文件 `.env`：
```env
AUTH_TOKEN=your-very-secret-token-here-123456
```

客户端使用（在套利系统中）：

```javascript
const exchange = new ccxt.binance({
  apiKey: API_KEY,
  secret: SECRET,
  urls: {
    api: 'http://image.h4yx.com:3000'
  },
  headers: {
    'X-Auth-Token': 'your-very-secret-token-here-123456'
  }
});
```

### 2. IP 白名单

```javascript
const ALLOWED_IPS = [
  '1.2.3.4',        // 你的家庭IP
  '5.6.7.8',        // 你的办公室IP
  '127.0.0.1',      // 本地
  '::1'             // 本地IPv6
];

app.use((req, res, next) => {
  if (req.path === '/health') {
    return next();
  }
  
  const clientIP = req.ip || 
                   req.headers['x-forwarded-for'] || 
                   req.connection.remoteAddress;
  
  // 清理 IPv6 前缀
  const cleanIP = clientIP.replace(/^::ffff:/, '');
  
  if (!ALLOWED_IPS.includes(cleanIP)) {
    console.warn(`⚠️  拒绝访问: ${cleanIP}`);
    return res.status(403).json({ 
      error: 'Forbidden',
      message: 'Your IP is not whitelisted'
    });
  }
  
  next();
});
```

### 3. 使用 HTTPS（推荐）

**安装 Nginx：**

```bash
# Ubuntu/Debian
sudo apt install nginx certbot python3-certbot-nginx

# CentOS/RHEL
sudo yum install nginx certbot python3-certbot-nginx
```

**配置 Nginx：**

```bash
sudo vim /etc/nginx/sites-available/binance-proxy
```

内容：
```nginx
server {
    listen 80;
    server_name image.h4yx.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**启用站点：**

```bash
sudo ln -s /etc/nginx/sites-available/binance-proxy /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

**配置 SSL 证书：**

```bash
sudo certbot --nginx -d image.h4yx.com
```

现在可以使用 HTTPS：
```
https://image.h4yx.com/api/v3/ping
```

### 4. 限流保护

安装依赖：

```bash
npm install express-rate-limit
```

在 `server.js` 中添加：

```javascript
import rateLimit from 'express-rate-limit';

// 创建限流规则
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,  // 1分钟
  max: 100,                  // 最多100个请求
  message: {
    error: 'Too Many Requests',
    message: 'Rate limit exceeded, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 应用到所有路由
app.use(limiter);
```

## 📊 监控和维护

### 查看运行状态

```bash
# PM2 状态
pm2 status

# 详细信息
pm2 info binance-proxy

# 实时日志
pm2 logs binance-proxy --lines 100

# 重启服务
pm2 restart binance-proxy

# 停止服务
pm2 stop binance-proxy
```

### 查看资源使用

```bash
# CPU 和内存
pm2 monit

# 系统资源
htop

# 网络连接
netstat -tlnp | grep 3000
```

### 日志管理

```bash
# 查看最近的日志
pm2 logs --lines 50

# 清空日志
pm2 flush

# 日志轮转（自动管理日志文件大小）
pm2 install pm2-logrotate
```

### 自动重启

```bash
# 内存超过 500MB 自动重启
pm2 start server.js --name binance-proxy --max-memory-restart 500M

# 定时重启（每天凌晨3点）
pm2 start server.js --name binance-proxy --cron-restart="0 3 * * *"
```

## 🧪 测试

### 在服务器上测试

```bash
cd /opt/binance-proxy
node test.js
```

### 在国内测试

创建测试脚本 `test-proxy.js`：

```javascript
import fetch from 'node-fetch';

const PROXY = 'http://image.h4yx.com:3000';

async function test() {
  console.log('测试代理服务器...\n');
  
  // 测试1: 健康检查
  const health = await fetch(`${PROXY}/health`);
  console.log('健康检查:', await health.json());
  
  // 测试2: Ping
  const ping = await fetch(`${PROXY}/api/v3/ping`);
  console.log('Ping:', await ping.json());
  
  // 测试3: 获取价格
  const ticker = await fetch(`${PROXY}/api/v3/ticker/24hr?symbol=BTCUSDT`);
  const data = await ticker.json();
  console.log('BTC价格:', data.lastPrice);
}

test();
```

运行：
```bash
node test-proxy.js
```

## 💰 成本估算

### VPS 费用

| 服务商 | 配置 | 价格 | 备注 |
|--------|------|------|------|
| Vultr | 1C1G | $5/月 | 多机房选择 |
| DigitalOcean | 1C1G | $6/月 | 稳定可靠 |
| AWS Lightsail | 1C512M | $3.5/月 | 首月免费 |
| 搬瓦工 | 1C1G | $50/年 | CN2线路 |

### 流量费用

大多数套利请求很小（< 1KB），每天约 100MB 流量。
- 月流量：~3GB
- 基本所有 VPS 都包含足够的流量

### 总成本

**月成本：** $5-10
**年成本：** $60-120

## ⚠️ 常见问题

### Q: 服务器重启后服务没有自动启动？

```bash
# 配置开机自启
pm2 startup
pm2 save

# 验证
systemctl status pm2-root
```

### Q: 防火墙配置正确但还是无法访问？

检查云服务商的安全组：
- AWS: Security Groups
- 阿里云/腾讯云: 安全组规则
- Vultr/DO: Firewall

确保开放 TCP 3000 端口。

### Q: 延迟太高怎么办？

1. 选择离中国大陆近的机房（香港、日本、新加坡）
2. 使用 CN2 GIA 线路的 VPS
3. 考虑使用 CDN

### Q: 如何监控服务是否正常？

使用 UptimeRobot 或类似服务监控：
```
https://uptimerobot.com
```

监控地址：
```
http://image.h4yx.com:3000/health
```

### Q: 可以同时代理多个交易所吗？

可以！修改配置支持多目标：

```javascript
const routes = {
  '/binance': 'https://api.binance.com',
  '/okx': 'https://www.okx.com',
  '/huobi': 'https://api.huobi.pro'
};

for (const [path, target] of Object.entries(routes)) {
  app.use(path, createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: { [`^${path}`]: '' }
  }));
}
```

## 📈 性能优化

### 1. 启用 HTTP/2

```javascript
import http2 from 'http2';
import fs from 'fs';

const server = http2.createSecureServer({
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
}, app);

server.listen(443);
```

### 2. 启用压缩

```bash
npm install compression
```

```javascript
import compression from 'compression';
app.use(compression());
```

### 3. 使用集群模式

```bash
pm2 start server.js -i max --name binance-proxy
```

## 🎯 总结

**优势：**
- ✅ 完全解决国内访问问题
- ✅ 稳定可靠
- ✅ 延迟可控
- ✅ 成本低廉

**劣势：**
- ⚠️ 需要海外服务器
- ⚠️ 需要维护服务器
- ⚠️ 增加了一层延迟

**适用场景：**
- 长期运行的套利系统
- 需要稳定访问币安 API
- 不想依赖第三方代理

---

**祝部署顺利！** 🚀

