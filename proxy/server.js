/**
 * 币安 API 代理服务器 (支持 HTTP CONNECT)
 * 
 * 支持两种模式:
 * 1. URL转发模式: http://your-server:3000/api/v3/ping → https://api.binance.com/api/v3/ping
 * 2. HTTP CONNECT模式: 用于 CCXT 等库通过 HTTP 代理访问 HTTPS 网站
 * 
 * 使用方法：
 * 1. 在海外服务器部署此脚本
 * 2. 运行: node server.js
 * 3. URL转发: curl http://your-server:3000/api/v3/ping
 * 4. HTTP代理: export HTTPS_PROXY=http://your-server:3000
 */

import http from 'http';
import https from 'https';
import net from 'net';
import { URL } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PROXY_PORT || 3000;
const TARGET_URL = process.env.TARGET_URL || 'https://api.binance.com';

// 日志函数
function log(message, data = '') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`, data);
}

// 创建 HTTP 服务器
const server = http.createServer((req, res) => {
  // 健康检查端点
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      mode: 'URL forwarding & HTTP CONNECT',
      timestamp: new Date().toISOString(),
      target: TARGET_URL,
      uptime: process.uptime()
    }));
    return;
  }

  // URL转发模式 - 处理普通 HTTP 请求
  log(`[HTTP] ${req.method} ${req.url}`);
  
  const proxy = createProxyMiddleware({
    target: TARGET_URL,
    changeOrigin: true,
    logLevel: 'silent',
    
    onProxyReq: (proxyReq, req) => {
      log(`  → 转发到: ${TARGET_URL}${req.url}`);
    },
    
    onProxyRes: (proxyRes, req) => {
      log(`  ← 响应状态: ${proxyRes.statusCode}`);
    },
    
    onError: (err, req, res) => {
      log('  ✗ 代理错误:', err.message);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'Proxy Error',
          message: err.message
        }));
      }
    }
  });
  
  proxy(req, res);
});

// 处理 CONNECT 方法 (HTTPS 隧道代理)
server.on('connect', (req, clientSocket, head) => {
  const { hostname, port } = parseHostPort(req.url);
  
  log(`[CONNECT] ${hostname}:${port}`);
  
  // 连接到目标服务器
  const serverSocket = net.connect(port, hostname, () => {
    // 告诉客户端连接已建立
    clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
    log(`  ✓ 隧道已建立: ${hostname}:${port}`);
    
    // 立即转发预读的数据（通常是 TLS ClientHello）
    if (head && head.length > 0) {
      serverSocket.write(head);
    }
    
    // 建立双向透明转发
    serverSocket.pipe(clientSocket);
    clientSocket.pipe(serverSocket);
  });

  // 错误处理：简单记录，不做额外操作
  serverSocket.on('error', (err) => {
    log(`  ✗ 目标服务器错误: ${hostname}:${port}`, err.message);
    clientSocket.destroy();
  });

  clientSocket.on('error', (err) => {
    // 忽略 ECONNRESET（客户端主动断开是正常的）
    if (err.code !== 'ECONNRESET') {
      log(`  ✗ 客户端错误: ${hostname}:${port}`, err.message);
    }
    serverSocket.destroy();
  });
  
  // 连接关闭时记录
  clientSocket.on('close', () => {
    log(`  ↓ 连接关闭: ${hostname}:${port}`);
    serverSocket.destroy();
  });
  
  serverSocket.on('close', () => {
    clientSocket.destroy();
  });
});

// 解析 host:port
function parseHostPort(hostString) {
  const [hostname, portStr] = hostString.split(':');
  const port = parseInt(portStr) || 443;
  return { hostname, port };
}

// 启动服务器
server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('═'.repeat(70));
  console.log('🚀 币安 API 代理服务器已启动 (支持 HTTP CONNECT)');
  console.log('═'.repeat(70));
  console.log(`📡 监听地址: http://0.0.0.0:${PORT}`);
  console.log(`🎯 目标地址: ${TARGET_URL}`);
  console.log(`⏰ 启动时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log('');
  console.log('✨ 支持两种模式:');
  console.log('   1. URL转发: http://server:3000/api/v3/ping');
  console.log('   2. HTTP CONNECT: export HTTPS_PROXY=http://server:3000');
  console.log('');
  console.log('═'.repeat(70));
  console.log('');
  console.log('📝 测试命令:');
  console.log('');
  console.log('【URL转发模式】');
  console.log(`   curl http://localhost:${PORT}/api/v3/ping`);
  console.log(`   curl http://localhost:${PORT}/api/v3/time`);
  console.log(`   curl http://localhost:${PORT}/health`);
  console.log('');
  console.log('【HTTP CONNECT 代理模式】');
  console.log('   # Linux/Mac:');
  console.log(`   export HTTPS_PROXY=http://localhost:${PORT}`);
  console.log('   curl https://api.binance.com/api/v3/ping');
  console.log('');
  console.log('   # Windows PowerShell:');
  console.log(`   $env:HTTPS_PROXY="http://localhost:${PORT}"`);
  console.log('   curl https://api.binance.com/api/v3/ping');
  console.log('');
  console.log('【用于 CCXT (Node.js)】');
  console.log('   const exchange = new ccxt.binance({');
  console.log(`     httpsProxy: 'http://your-server:${PORT}',`);
  console.log('     // ... 其他配置');
  console.log('   });');
  console.log('');
  console.log('═'.repeat(70));
  console.log('');
  console.log('⚠️  按 Ctrl+C 停止服务器');
  console.log('');
});

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n');
  console.log('⏹️  正在关闭服务器...');
  server.close(() => {
    console.log('✅ 服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n');
  console.log('⏹️  正在关闭服务器...');
  server.close(() => {
    console.log('✅ 服务器已关闭');
    process.exit(0);
  });
});

