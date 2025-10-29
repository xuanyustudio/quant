import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 自定义日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    const logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    return stack ? `${logMessage}\n${stack}` : logMessage;
  })
);

// 创建logger实例
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // 控制台输出（生产环境不使用颜色）
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production' 
        ? logFormat  // 生产环境：无颜色
        : winston.format.combine(winston.format.colorize(), logFormat)  // 开发环境：有颜色
    }),
    // 文件输出 - 所有日志
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // 文件输出 - 错误日志
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // 文件输出 - 交易日志
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'trades.log'),
      level: 'info',
      maxsize: 10485760, // 10MB
      maxFiles: 10,
    })
  ]
});

// 如果不是生产环境，输出到控制台的日志会更详细
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

