import { beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { connectDatabase, closeDatabase } from '../src/config/database';
import { connectRedis, closeRedis } from '../src/config/redis';

// 测试数据库配置
process.env.NODE_ENV = 'test';
process.env.DB_NAME = 'h5_ecommerce_test';
process.env.REDIS_DB = '1';

beforeAll(async () => {
  // 初始化测试数据库连接
  await connectDatabase();
  await connectRedis();
});

afterAll(async () => {
  // 关闭数据库连接
  await closeDatabase();
  await closeRedis();
});

beforeEach(async () => {
  // 每个测试前清理数据
  // 这里可以添加数据清理逻辑
});

afterEach(async () => {
  // 每个测试后清理数据
  // 这里可以添加数据清理逻辑
});