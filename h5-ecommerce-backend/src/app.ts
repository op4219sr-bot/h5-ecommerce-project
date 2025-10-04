import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { connectDatabase } from './config/database.js';
import { connectRedis } from './config/redis.js';
import { initCronJobs } from './utils/cronJobs';

// 路由导入
import seckillRoutes from './routes/seckill';
import groupBuyRoutes from './routes/groupBuy';
import bargainRoutes from './routes/bargain';

const app = express();

// 基础中间件
app.use(helmet()); // 安全头
app.use(compression()); // 压缩
app.use(cors({
  origin: config.isDevelopment ? '*' : config.allowedOrigins,
  credentials: true
}));

// 请求限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: config.isDevelopment ? 1000 : 100, // 限制每个IP每15分钟最多请求次数
  message: {
    error: '请求过于频繁，请稍后再试'
  }
});
app.use(limiter);

// 解析器
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件
app.use('/uploads', express.static('uploads'));

// 日志中间件
app.use(requestLogger);

// API路由
const apiPrefix = config.apiPrefix;
app.use(`${apiPrefix}/seckill`, seckillRoutes);
app.use(`${apiPrefix}/group-buy`, groupBuyRoutes);
app.use(`${apiPrefix}/bargain`, bargainRoutes);

// 健康检查
app.get('/health', (_req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// 根路径
app.get('/', (_req, res) => {
  res.json({
    message: 'H5电商系统后端API服务',
    version: '1.0.0',
    environment: config.nodeEnv
  });
});

// 404处理
app.use('*', (_req, res) => {
  res.status(404).json({
    error: '接口不存在',
    path: _req.originalUrl
  });
});

// 错误处理中间件
app.use(errorHandler);

// 启动服务器
async function startServer() {
  try {
    // 连接数据库
    await connectDatabase();
    logger.info('数据库连接成功');

    // 连接Redis
    await connectRedis();
    logger.info('Redis连接成功');

    // 初始化定时任务
    initCronJobs();
    logger.info('定时任务初始化完成');

    // 启动服务器
    const port = config.port;
    app.listen(port, () => {
      logger.info(`服务器已启动，端口: ${port}`);
      logger.info(`环境: ${config.nodeEnv}`);
      logger.info(`API前缀: ${config.apiPrefix}`);
    });
  } catch (error) {
    logger.error('服务器启动失败:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGINT', () => {
  logger.info('接收到SIGINT信号，正在关闭服务器...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('接收到SIGTERM信号，正在关闭服务器...');
  process.exit(0);
});

// 未捕获的异常处理
process.on('uncaughtException', (error) => {
  logger.error('未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('未处理的Promise拒绝:', reason);
  process.exit(1);
});

startServer();

export default app;