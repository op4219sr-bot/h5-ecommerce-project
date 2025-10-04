import app from './app.js';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { initDatabase } from './config/database.js';
import { initRedis } from './config/redis.js';
import { startCronJobs } from './utils/cronJobs.js';

async function startServer() {
  try {
    // 初始化数据库连接
    await initDatabase();
    logger.info('Database connected successfully');

    // 初始化Redis连接
    await initRedis();
    logger.info('Redis connected successfully');

    // 启动定时任务
    startCronJobs();
    logger.info('Cron jobs started');

    // 启动服务器
    const port = config.port || 3000;
    app.listen(port, () => {
      logger.info(`Server is running on port ${port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info(`API Documentation: http://localhost:${port}/api-docs`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

startServer();