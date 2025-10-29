/**
 * 工具函数集合
 */

/**
 * 延迟函数
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 格式化数字为固定小数位
 */
export function formatNumber(num, decimals = 2) {
  return parseFloat(num.toFixed(decimals));
}

/**
 * 计算百分比变化
 */
export function calculatePercentChange(oldValue, newValue) {
  if (oldValue === 0) return 0;
  return ((newValue - oldValue) / oldValue) * 100;
}

/**
 * 格式化时间戳
 */
export function formatTimestamp(timestamp) {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * 检查对象是否为空
 */
export function isEmpty(obj) {
  return Object.keys(obj).length === 0;
}

/**
 * 重试机制
 */
export async function retry(fn, maxAttempts = 3, delay = 1000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }
      await sleep(delay * attempt);
    }
  }
}

/**
 * 计算两个价格的百分比差异
 */
export function calculatePriceDifference(price1, price2) {
  const avgPrice = (price1 + price2) / 2;
  return Math.abs(price1 - price2) / avgPrice * 100;
}

/**
 * 验证交易对格式
 */
export function isValidPair(pair) {
  return /^[A-Z0-9]+\/[A-Z0-9]+$/.test(pair);
}

/**
 * 获取交易对的基础货币和报价货币
 */
export function splitPair(pair) {
  const [base, quote] = pair.split('/');
  return { base, quote };
}

/**
 * 安全的JSON解析
 */
export function safeJsonParse(str, defaultValue = {}) {
  try {
    return JSON.parse(str);
  } catch (error) {
    return defaultValue;
  }
}

/**
 * 生成唯一ID
 */
export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

