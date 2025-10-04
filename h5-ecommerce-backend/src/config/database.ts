import mysql from 'mysql2/promise';
import { config } from './index.js';
import { logger } from '../utils/logger.js';

let pool: mysql.Pool;

export async function connectDatabase(): Promise<mysql.Pool> {
  try {
    pool = mysql.createPool({
      host: config.database.host,
      port: config.database.port,
      user: config.database.user,
      password: config.database.password,
      database: config.database.database,
      charset: config.database.charset,
      timezone: config.database.timezone,
      acquireTimeout: config.database.acquireTimeout,
      timeout: config.database.timeout,
      reconnect: config.database.reconnect,
      connectionLimit: 10,
      queueLimit: 0,
      multipleStatements: false
    });

    // 测试连接
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();

    logger.info('MySQL数据库连接成功');
    return pool;
  } catch (error) {
    logger.error('MySQL数据库连接失败:', error);
    throw error;
  }
}

export function getDatabase(): mysql.Pool {
  if (!pool) {
    throw new Error('数据库未初始化，请先调用 connectDatabase()');
  }
  return pool;
}

// 执行查询的辅助函数
export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
  try {
    const db = getDatabase();
    const [rows] = await db.execute(sql, params);
    return rows as T[];
  } catch (error) {
    logger.error('数据库查询错误:', { sql, params, error });
    throw error;
  }
}

// 执行事务的辅助函数
export async function transaction<T>(
  callback: (connection: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const db = getDatabase();
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}