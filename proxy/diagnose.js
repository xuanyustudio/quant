/**
 * 诊断代理服务器连接问题
 */

import net from 'net';
import https from 'https';

const TESTS = [
  {
    name: '测试 1: 代理服务器能否解析 api.binance.com DNS',
    test: async () => {
      const dns = await import('dns').then(m => m.promises);
      const addresses = await dns.resolve4('api.binance.com');
      console.log(`✅ DNS 解析成功: ${addresses.join(', ')}`);
    }
  },
  {
    name: '测试 2: 代理服务器能否建立到币安的 TCP 连接',
    test: () => {
      return new Promise((resolve, reject) => {
        const socket = net.connect(443, 'api.binance.com', () => {
          console.log('✅ TCP 连接成功: api.binance.com:443');
          socket.destroy();
          resolve();
        });
        
        socket.on('error', (err) => {
          reject(new Error(`TCP 连接失败: ${err.message}`));
        });
        
        socket.setTimeout(5000, () => {
          socket.destroy();
          reject(new Error('TCP 连接超时'));
        });
      });
    }
  },
  {
    name: '测试 3: 代理服务器能否完成 HTTPS 请求',
    test: () => {
      return new Promise((resolve, reject) => {
        const req = https.get('https://api.binance.com/api/v3/ping', (res) => {
          console.log(`✅ HTTPS 请求成功: HTTP ${res.statusCode}`);
          res.resume();
          resolve();
        });
        
        req.on('error', (err) => {
          reject(new Error(`HTTPS 请求失败: ${err.message}`));
        });
        
        req.setTimeout(5000, () => {
          req.destroy();
          reject(new Error('HTTPS 请求超时'));
        });
      });
    }
  }
];

async function diagnose() {
  console.log('🔍 代理服务器诊断工具');
  console.log('═'.repeat(60));
  console.log('');
  console.log('⚠️  请在代理服务器上运行此脚本！');
  console.log('   （即 image.h4yx.com 服务器）');
  console.log('');
  console.log('═'.repeat(60));
  console.log('');

  let allPassed = true;

  for (const { name, test } of TESTS) {
    console.log(name);
    try {
      await test();
    } catch (error) {
      console.log(`❌ ${error.message}`);
      allPassed = false;
    }
    console.log('');
  }

  console.log('═'.repeat(60));
  console.log('');
  
  if (allPassed) {
    console.log('✅ 所有测试通过！');
    console.log('');
    console.log('代理服务器可以正常访问币安 API。');
    console.log('如果 CCXT 仍然失败，问题可能在于:');
    console.log('1. 代理实现的细节问题');
    console.log('2. CCXT 的代理配置问题');
    console.log('3. 网络防火墙/运营商限制');
  } else {
    console.log('❌ 部分测试失败！');
    console.log('');
    console.log('问题分析:');
    console.log('• 如果 DNS 解析失败 → 检查 /etc/resolv.conf');
    console.log('• 如果 TCP 连接失败 → 可能被防火墙拦截');
    console.log('• 如果 HTTPS 请求失败 → 可能是 TLS/证书问题');
    console.log('');
    console.log('建议:');
    console.log('1. 更换代理服务器（选择能访问币安的服务器）');
    console.log('2. 或直接使用 OKX 交易所（国内可访问，无需代理）');
  }
  
  console.log('');
}

diagnose().catch(error => {
  console.error('诊断失败:', error);
  process.exit(1);
});

