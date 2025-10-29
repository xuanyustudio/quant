/**
 * 直接测试统计套利程序
 */

console.log('开始测试...');
console.log('');

import('./src/statistical-arbitrage/index.js').then(() => {
  console.log('模块加载成功');
}).catch(error => {
  console.error('模块加载失败:', error);
});

