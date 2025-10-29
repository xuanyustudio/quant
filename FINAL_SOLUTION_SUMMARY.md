# 🎯 最终解决方案汇总

## 问题分析

你的代理服务器 `http://image.h4yx.com:3000` 是**URL转发型**，但 CCXT 库需要**HTTP CONNECT 代理**协议，两者不兼容。

## 解决方案对比

| 方案 | 难度 | 可行性 | 推荐度 |
|------|------|--------|--------|
| 1. 设置环境变量 HTTPS_PROXY | ⭐ | ❓ 需要真实HTTP代理 | ⭐⭐ |
| 2. 修改代理服务器支持CONNECT | ⭐⭐⭐ | ✅ 可行但复杂 | ⭐⭐⭐ |
| 3. 使用 OKX（如果可访问）| ⭐ | ✅ 简单 | ⭐⭐⭐⭐⭐ |
| 4. 直接使用代理环境运行 | ⭐⭐ | ✅ 最直接 | ⭐⭐⭐⭐ |

## ✅ 推荐方案：在代理环境中运行

**最简单的方法**：在你的**海外服务器**（已有代理的那台）上直接运行统计套利程序。

### 步骤

#### 1. 将项目上传到海外服务器

```bash
# 在本地打包（排除 node_modules）
tar -czf web3.tar.gz --exclude=node_modules --exclude=logs --exclude=data .

# 上传到服务器
scp web3.tar.gz root@image.h4yx.com:/opt/

# SSH 到服务器
ssh root@image.h4yx.com

# 解压
cd /opt
tar -xzf web3.tar.gz
mv web3.tar.gz web3
cd web3
```

#### 2. 在服务器上安装依赖

```bash
# 安装 Node.js（如果没有）
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装项目依赖
npm install
```

#### 3. 配置 API 密钥

```bash
# 创建 .env 文件
cat > .env << EOF
BINANCE_API_KEY=你的币安API密钥
BINANCE_SECRET=你的币安Secret密钥
LOG_LEVEL=info
EOF
```

#### 4. 修改配置使用币安

编辑 `src/statistical-arbitrage/config.js`：

```javascript
export default {
  exchange: {
    id: 'binance',  // 海外服务器直接访问币安
    apiKey: process.env.BINANCE_API_KEY || '',
    secret: process.env.BINANCE_SECRET || '',
    enableRateLimit: true,
    options: {
      adjustForTimeDifference: true,
      defaultType: 'spot'
    }
  },
  // ... 其他配置
};
```

#### 5. 测试运行

```bash
# 测试连接
node test-proxy-connection-v3.js

# 寻找配对
npm run stat-arb:find-pairs

# 运行回测
npm run stat-arb:backtest
```

#### 6. 使用 PM2 后台运行

```bash
# 安装 PM2
npm install -g pm2

# 后台运行
pm2 start "npm run stat-arb" --name stat-arbitrage

# 查看日志
pm2 logs stat-arbitrage

# 开机自启
pm2 startup
pm2 save
```

### 优势

- ✅ **直接访问币安** - 无代理问题
- ✅ **延迟最低** - 服务器在海外
- ✅ **稳定运行** - 24/7 不间断
- ✅ **无需本地运行** - 节省本地资源

---

## 方案 2：修改代理服务器支持 CONNECT

如果必须在本地运行，需要修改代理服务器。

### 创建支持 CONNECT 的代理

在服务器上创建新文件 `proxy/server-connect.js`：

```javascript
import http from 'http';
import net from 'net';
import { URL } from 'url';

const server = http.createServer((req, res) => {
  // 处理普通HTTP请求
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Proxy server is running. Use CONNECT method for HTTPS.');
});

// 处理 CONNECT 方法（HTTPS隧道）
server.on('connect', (req, clientSocket, head) => {
  const { port, hostname } = new URL(`http://${req.url}`);
  console.log(`[CONNECT] ${hostname}:${port}`);

  // 连接到目标服务器
  const serverSocket = net.connect(port || 443, hostname, () => {
    clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
    serverSocket.write(head);
    serverSocket.pipe(clientSocket);
    clientSocket.pipe(serverSocket);
  });

  serverSocket.on('error', (err) => {
    console.error(`[CONNECT ERROR] ${err.message}`);
    clientSocket.end();
  });
});

server.listen(3001, () => {
  console.log('HTTP CONNECT 代理服务器运行在 port 3001');
});
```

### 启动新代理

```bash
# 在服务器上
cd /opt/proxy
node server-connect.js

# 或使用 PM2
pm2 start server-connect.js --name http-connect-proxy
```

### 在本地配置

修改 `src/statistical-arbitrage/config.js`:

```javascript
exchange: {
  id: 'binance',
  apiKey: process.env.BINANCE_API_KEY,
  secret: process.env.BINANCE_SECRET,
  httpsProxy: 'http://image.h4yx.com:3001',  // 使用新的端口
  enableRateLimit: true,
  options: {
    adjustForTimeDifference: true,
    defaultType: 'spot'
  }
}
```

---

## 方案 3：使用 SOCKS5 代理（如果有）

如果你的服务器上有 SOCKS5 代理：

```javascript
// config.js
exchange: {
  id: 'binance',
  socksProxy: 'socks5://image.h4yx.com:1080',
  // ...
}
```

---

## 快速决策树

```
你想在哪里运行程序？
├─ 本地 (Windows)
│  ├─ 有 SOCKS5 代理? 
│  │  └─ 是 → 用方案3
│  └─ 否 → 修改代理服务器（方案2）
│
└─ 海外服务器 (推荐)
   └─ 直接运行（方案1）⭐⭐⭐⭐⭐
```

---

## 我的建议

**强烈推荐：在海外服务器上运行** （方案1）

理由：
1. ✅ 配置最简单
2. ✅ 延迟最低（直接访问币安）
3. ✅ 稳定性最好（24/7运行）
4. ✅ 无需解决代理兼容性问题
5. ✅ 本地电脑不需要一直开着

### 快速部署命令

```bash
# 在本地打包
tar --exclude=node_modules --exclude=logs -czf web3.tar.gz .

# 上传
scp web3.tar.gz root@image.h4yx.com:/opt/

# SSH 到服务器
ssh root@image.h4yx.com

# 部署
cd /opt && tar -xzf web3.tar.gz && mv web3.tar.gz web3 && cd web3
npm install
npm run stat-arb:find-pairs
```

### 服务器配置

```bash
# 在服务器上创建 .env
cat > .env << 'EOF'
BINANCE_API_KEY=your_api_key_here
BINANCE_SECRET=your_secret_here
LOG_LEVEL=info
NODE_ENV=production
EOF

# 修改 config.js 使用 binance
# 然后运行
pm2 start "npm run stat-arb" --name stat-arbitrage
pm2 logs
```

---

## 需要帮助？

1. **查看日志**: `pm2 logs` 或 `cat logs/combined.log`
2. **测试连接**: `node test-okx.js` 或 `node test-proxy-connection-v3.js`
3. **查看文档**: `PROXY_ISSUE_SOLUTION.md`

---

**建议：花10分钟在海外服务器上部署，省去所有代理配置的麻烦！** 🚀

