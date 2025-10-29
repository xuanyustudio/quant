/**
 * 测试 import.meta.url 问题
 */

console.log('process.argv[0]:', process.argv[0]);
console.log('process.argv[1]:', process.argv[1]);
console.log('import.meta.url:', import.meta.url);
console.log('');

const fileUrl = `file://${process.argv[1]}`;
console.log('file://${process.argv[1]}:', fileUrl);
console.log('');

console.log('匹配结果:', import.meta.url === fileUrl);
console.log('');

// 转换为 Windows 路径
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const currentFile = fileURLToPath(import.meta.url);
const argFile = resolve(process.argv[1]);

console.log('currentFile:', currentFile);
console.log('argFile:', argFile);
console.log('匹配结果:', currentFile === argFile);

