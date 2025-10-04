import { createClient, RedisClientType } from 'redis';
import { config } from './index.js';
import { logger } from '../utils/logger.js';

let redisClient: RedisClientType;

export async function connectRedis(): Promise<RedisClientType> {
  try {
    redisClient = createClient({
      socket: {
        host: config.redis.host,
        port: config.redis.port
      },
      password: config.redis.password || undefined,
      database: config.redis.db
    });

    redisClient.on('error', (error) => {
      logger.error('Redis连接错误:', error);
    });

    redisClient.on('connect', () => {
      logger.info('Redis连接成功');
    });

    redisClient.on('reconnecting', () => {
      logger.info('Redis重新连接中...');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.error('Redis连接失败:', error);
    throw error;
  }
}

export function getRedis(): RedisClientType {
  if (!redisClient) {
    throw new Error('Redis未初始化，请先调用 connectRedis()');
  }
  return redisClient;
}

// Redis操作的辅助函数
export class RedisService {
  private static client: RedisClientType;

  static init(client: RedisClientType) {
    this.client = client;
  }

  // 字符串操作
  static async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.setEx(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  static async setEx(key: string, seconds: number, value: string): Promise<void> {
    await this.client.setEx(key, seconds, value);
  }

  static async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  static async del(key: string): Promise<number> {
    return await this.client.del(key);
  }

  static async incr(key: string): Promise<number> {
    return await this.client.incr(key);
  }

  static async decr(key: string): Promise<number> {
    return await this.client.decr(key);
  }

  static async incrBy(key: string, increment: number): Promise<number> {
    return await this.client.incrBy(key, increment);
  }

  static async decrBy(key: string, decrement: number): Promise<number> {
    return await this.client.decrBy(key, decrement);
  }

  // 哈希操作
  static async hSet(key: string, field: string, value: string): Promise<number> {
    return await this.client.hSet(key, field, value);
  }

  static async hGet(key: string, field: string): Promise<string | undefined> {
    return await this.client.hGet(key, field);
  }

  static async hGetAll(key: string): Promise<Record<string, string>> {
    return await this.client.hGetAll(key);
  }

  static async hDel(key: string, field: string): Promise<number> {
    return await this.client.hDel(key, field);
  }

  // 列表操作
  static async lPush(key: string, value: string): Promise<number> {
    return await this.client.lPush(key, value);
  }

  static async rPush(key: string, value: string): Promise<number> {
    return await this.client.rPush(key, value);
  }

  static async lPop(key: string): Promise<string | null> {
    return await this.client.lPop(key);
  }

  static async lRange(key: string, start: number, stop: number): Promise<string[]> {
    return await this.client.lRange(key, start, stop);
  }

  // 集合操作
  static async sAdd(key: string, member: string): Promise<number> {
    return await this.client.sAdd(key, member);
  }

  static async sRem(key: string, member: string): Promise<number> {
    return await this.client.sRem(key, member);
  }

  static async sMembers(key: string): Promise<string[]> {
    return await this.client.sMembers(key);
  }

  // 有序集合操作
  static async zAdd(key: string, score: number, member: string): Promise<number> {
    return await this.client.zAdd(key, { score, value: member });
  }

  static async zRem(key: string, member: string): Promise<number> {
    return await this.client.zRem(key, member);
  }

  static async zRange(key: string, start: number, stop: number): Promise<string[]> {
    return await this.client.zRange(key, start, stop);
  }

  // 过期时间
  static async expire(key: string, seconds: number): Promise<boolean> {
    return await this.client.expire(key, seconds);
  }

  static async ttl(key: string): Promise<number> {
    return await this.client.ttl(key);
  }

  // 检查键是否存在
  static async exists(key: string): Promise<number> {
    return await this.client.exists(key);
  }

  // 模式匹配键
  static async keys(pattern: string): Promise<string[]> {
    return await this.client.keys(pattern);
  }
}