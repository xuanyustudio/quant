# 🔧 代理配置问题解决方案

## 问题说明

你的代理服务器 (`http://image.h4yx.com:3000`) 使用的是 **URL转发模式**：
```
客户端 → http://image.h4yx.com:3000/api/v3/ping 
      → https://api.binance.com/api/v3/ping
```

但CCXT库期望的是 **HTTP CONNECT代理模式**：
```
客户端 → CONNECT代理服务器 
      → 代理建立到 api.binance.com 的隧道
      → 客户端通过隧道访问API
```

## 解决方案

### 方案一：使用环境变量（推荐）

1. 在命令行设置代理环境变量：

**Windows PowerShell:**
```powershell
$env:HTTPS_PROXY="http://image.h4yx.com:3000"
npm run stat-arb:find-pairs
```

**Windows CMD:**
```cmd
set HTTPS_PROXY=http://image.h4yx.com:3000
npm run stat-arb:find-pairs
```

**Linux/Mac:**
```bash
export HTTPS_PROXY=http://image.h4yx.com:3000
npm run stat-arb:find-pairs
```

2. 或者在 `.env` 文件中添加：
```env
HTTPS_PROXY=http://image.h4yx.com:3000
HTTP_PROXY=http://image.h4yx.com:3000
```

### 方案二：使用国内可访问的交易所（最简单）

直接使用OKX、Gate.io等国内可访问的交易所：

修改 `src/statistical-arbitrage/config.js`:

```javascript
export default {
  // 使用 OKX 替代币安
  exchange: {
    id: 'okx',  // 改为 okx
    apiKey: process.env.OKX_API_KEY || '',
    secret: process.env.OKX_SECRET || '',
    password: process.env.OKX_PASSWORD || '',  // OKX需要password
    enableRateLimit: true,
    options: {
      defaultType: 'spot'
    }
  },
  // ... 其他配置
};
```

**优势：**
- ✅ 无需代理，直接访问
- ✅ 配置简单
- ✅ 稳定可靠
- ✅ OKX 在国内完全可用

### 方案三：修改代理服务器支持CONNECT方法

如果必须使用币安，需要修改代理服务器：

`proxy/server-with-connect.js`:

```javascript
import http from 'http';
import https from 'https';
import { createProxyMiddleware } from 'http-proxy-middleware';

// 创建支持 CONNECT 方法的代理服务器
const server = http.createServer((req, res) => {
  // 处理普通HTTP请求
  const proxy = createProxyMiddleware({
    target: 'https://api.binance.com',
    changeOrigin: true,
    onProxyReq: (proxyReq, req) => {
      console.log(`[HTTP] ${req.method} ${req.url}`);
    }
  });
  proxy(req, res);
});

// 处理 HTTPS CONNECT 请求
server.on('connect', (req, clientSocket, head) => {
  console.log(`[CONNECT] ${req.url}`);
  
  const serverUrl = new URL(`https://${req.url}`);
  const serverSocket = https.request({
    host: serverUrl.hostname,
    port: serverUrl.port || 443,
    method: 'CONNECT'
  });

  serverSocket.on('connect', (res, socket) => {
    clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
    socket.pipe(clientSocket);
    clientSocket.pipe(socket);
  });

  serverSocket.on('error', (err) => {
    console.error('CONNECT error:', err);
    clientSocket.end();
  });

  serverSocket.end();
});

server.listen(3000, () => {
  console.log('代理服务器 (支持CONNECT) 运行在 port 3000');
});
```

### 方案四：使用SOCKS5代理（高级）

如果你有SOCKS5代理，可以配置：

```javascript
// config.js
exchange: {
  id: 'binance',
  socksProxy: 'socks5://your-socks5-server:1080',
  // ...
}
```

## 推荐方案

**对于国内用户，强烈推荐 方案二（使用OKX）**

理由：
1. ✅ 无需翻墙和代理
2. ✅ OKX交易量大，流动性充足
3. ✅ API稳定，限流宽松
4. ✅ 手续费相当（0.1%）
5. ✅ 同样支持统计套利策略

配对交易不依赖特定交易所，OKX的BTC/ETH等主流币种同样适用。

## 快速切换到OKX

1. 注册OKX账号: https://www.okx.com
2. 创建API密钥（只开启交易权限）
3. 配置 `.env`:

```env
OKX_API_KEY=你的API_KEY
OKX_SECRET=你的SECRET_KEY  
OKX_PASSWORD=你的API密码
```

4. 修改 `src/statistical-arbitrage/config.js`:

```javascript
exchange: {
  id: 'okx',
  apiKey: process.env.OKX_API_KEY || '',
  secret: process.env.OKX_SECRET || '',
  password: process.env.OKX_PASSWORD || '',
  enableRateLimit: true,
  options: {
    defaultType: 'spot'
  }
}
```

5. 运行：
```bash
npm run stat-arb:find-pairs
```

## 测试连接

创建 `test-okx-connection.js`:

```javascript
import ccxt from 'ccxt';
import dotenv from 'dotenv';

dotenv.config();

async function test() {
  const exchange = new ccxt.okx({
    apiKey: process.env.OKX_API_KEY,
    secret: process.env.OKX_SECRET,
    password: process.env.OKX_PASSWORD,
    enableRateLimit: true
  });

  try {
    console.log('测试OKX连接...');
    
    await exchange.loadMarkets();
    console.log('✅ 市场数据加载成功');
    
    const ticker = await exchange.fetchTicker('BTC/USDT');
    console.log('✅ BTC/USDT价格:', ticker.last);
    
    console.log('🎉 OKX连接正常！');
  } catch (error) {
    console.error('❌ 连接失败:', error.message);
  }
}

test();
```

运行：
```bash
node test-okx-connection.js
```

---

**建议：优先使用OKX，简单可靠，无需折腾代理！** 🚀

