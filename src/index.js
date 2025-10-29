import dotenv from 'dotenv';
import { ArbitrageEngine } from './core/ArbitrageEngine.js';
import { logger } from './utils/logger.js';
import config from './config/config.js';

dotenv.config();

async function main() {
  try {
    logger.info('🚀 启动加密货币套利系统...');
    
    // 创建套利引擎实例
    const engine = new ArbitrageEngine(config);
    
    // 启动引擎
    await engine.start();
    
    // 优雅退出处理
    process.on('SIGINT', async () => {
      logger.info('⏹️  收到退出信号，正在关闭...');
      await engine.stop();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      logger.info('⏹️  收到终止信号，正在关闭...');
      await engine.stop();
      process.exit(0);
    });
    
  } catch (error) {
    logger.error('启动失败:', error);
    process.exit(1);
  }
}

main();

