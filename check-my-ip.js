/**
 * 查询当前公网IP地址
 */

import https from 'https';
import http from 'http';

console.log('🔍 正在查询您的公网IP地址...\n');

// 方法1: 使用 ipify API
function getIPFromIPify() {
  return new Promise((resolve, reject) => {
    https.get('https://api.ipify.org?format=json', (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.ip);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// 方法2: 使用 ip-api.com
function getIPFromIPAPI() {
  return new Promise((resolve, reject) => {
    http.get('http://ip-api.com/json/', (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({
            ip: json.query,
            country: json.country,
            city: json.city,
            isp: json.isp
          });
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// 方法3: 使用 ifconfig.me
function getIPFromIfconfig() {
  return new Promise((resolve, reject) => {
    https.get('https://ifconfig.me/ip', (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data.trim()));
    }).on('error', reject);
  });
}

async function checkIP() {
  try {
    console.log('方法1: 查询 ipify.org...');
    const ip1 = await getIPFromIPify();
    console.log(`✅ IP地址: ${ip1}\n`);
    
    console.log('方法2: 查询 ip-api.com（含位置信息）...');
    const info = await getIPFromIPAPI();
    console.log(`✅ IP地址: ${info.ip}`);
    console.log(`   国家: ${info.country}`);
    console.log(`   城市: ${info.city}`);
    console.log(`   ISP: ${info.isp}\n`);
    
    console.log('方法3: 查询 ifconfig.me...');
    const ip3 = await getIPFromIfconfig();
    console.log(`✅ IP地址: ${ip3}\n`);
    
    console.log('═'.repeat(70));
    console.log('📋 您的公网IP地址');
    console.log('═'.repeat(70));
    console.log(`\n   ${ip1}\n`);
    console.log('═'.repeat(70));
    console.log('\n💡 下一步操作：\n');
    console.log('1. 登录币安账户');
    console.log('2. 进入 API管理 → 编辑API');
    console.log('3. 在"API限制"中添加此IP地址');
    console.log(`4. IP地址填写: ${ip1}`);
    console.log('5. 保存后重新测试连接\n');
    
    console.log('⚠️  注意事项：');
    console.log('- 如果您使用代理，IP可能会变化');
    console.log('- 如果IP经常变化，建议不设置IP限制（安全性降低）');
    console.log('- 或者使用固定的服务器IP（如阿里云/腾讯云）\n');
    
  } catch (error) {
    console.error('❌ 查询IP失败:', error.message);
    console.error('\n备用方法：');
    console.error('1. 访问 https://www.ip.cn/');
    console.error('2. 访问 https://ipinfo.io/');
    console.error('3. 访问 https://whatismyipaddress.com/\n');
  }
}

checkIP();

