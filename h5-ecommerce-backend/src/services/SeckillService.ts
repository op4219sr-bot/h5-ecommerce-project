import { query, transaction } from '../config/database.js';
import { RedisService } from '../config/redis.js';
import { CustomError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import type { SeckillActivity } from '../types/index.js';

export class SeckillService {
  // 创建秒杀活动
  static async createSeckill(data: {
    activity_id: number;
    product_id: number;
    seckill_price: number;
    stock: number;
    limit_per_user: number;
    start_time: string;
    end_time: string;
  }): Promise<SeckillActivity> {
    try {
      const sql = `
        INSERT INTO seckill_activities 
        (activity_id, product_id, seckill_price, stock, limit_per_user, start_time, end_time, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
      `;
      
      const result = await query(sql, [
        data.activity_id,
        data.product_id,
        data.seckill_price,
        data.stock,
        data.limit_per_user,
        data.start_time,
        data.end_time
      ]);

      const seckillId = (result as any).insertId;
      
      // 预热Redis库存
      await RedisService.set(`seckill_stock:${seckillId}`, data.stock.toString());
      
      return await this.getSeckillById(seckillId);
    } catch (error) {
      logger.error('创建秒杀活动失败:', error);
      throw new CustomError('创建秒杀活动失败', 500);
    }
  }

  // 获取秒杀活动详情
  static async getSeckillById(id: number): Promise<SeckillActivity> {
    try {
      const sql = `
        SELECT s.*, p.name as product_name, p.images as product_images
        FROM seckill_activities s
        LEFT JOIN products p ON s.product_id = p.id
        WHERE s.id = ?
      `;
      
      const results = await query(sql, [id]);
      
      if (results.length === 0) {
        throw new CustomError('秒杀活动不存在', 404);
      }
      
      return results[0] as SeckillActivity;
    } catch (error) {
      logger.error('获取秒杀活动失败:', error);
      throw error;
    }
  }

  // 获取进行中的秒杀活动列表
  static async getActiveSeckills(page: number = 1, limit: number = 10) {
    try {
      const offset = (page - 1) * limit;
      const now = new Date().toISOString();
      
      const sql = `
        SELECT s.*, p.name as product_name, p.images as product_images
        FROM seckill_activities s
        LEFT JOIN products p ON s.product_id = p.id
        WHERE s.status = 'active' 
        AND s.start_time <= ? 
        AND s.end_time > ?
        ORDER BY s.start_time ASC
        LIMIT ? OFFSET ?
      `;
      
      const countSql = `
        SELECT COUNT(*) as total
        FROM seckill_activities s
        WHERE s.status = 'active' 
        AND s.start_time <= ? 
        AND s.end_time > ?
      `;
      
      const [items, countResult] = await Promise.all([
        query(sql, [now, now, limit, offset]),
        query(countSql, [now, now])
      ]);
      
      const total = (countResult[0] as any).total;
      
      return {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      logger.error('获取秒杀活动列表失败:', error);
      throw new CustomError('获取秒杀活动列表失败', 500);
    }
  }

  // 参与秒杀
  static async participateSeckill(userId: number, seckillId: number, quantity: number = 1) {
    try {
      return await transaction(async (connection) => {
        // 获取秒杀活动信息
        const seckill = await this.getSeckillById(seckillId);
        const now = new Date();
        
        // 检查活动状态
        if (seckill.status !== 'active') {
          throw new CustomError('秒杀活动未开始或已结束', 400);
        }
        
        if (new Date(seckill.start_time) > now || new Date(seckill.end_time) < now) {
          throw new CustomError('不在秒杀时间范围内', 400);
        }
        
        // 检查用户购买限制
        const userPurchaseSql = `
          SELECT COALESCE(SUM(quantity), 0) as purchased
          FROM seckill_orders
          WHERE user_id = ? AND seckill_id = ? AND status != 'cancelled'
        `;
        
        const userPurchaseResult = await query(userPurchaseSql, [userId, seckillId]);
        const purchased = (userPurchaseResult[0] as any).purchased;
        
        if (purchased + quantity > seckill.limit_per_user) {
          throw new CustomError(`超出购买限制，每人最多购买${seckill.limit_per_user}件`, 400);
        }
        
        // 使用Redis原子操作减库存
        const stockKey = `seckill_stock:${seckillId}`;
        const currentStock = await RedisService.get(stockKey);
        
        if (!currentStock || parseInt(currentStock) < quantity) {
          throw new CustomError('库存不足', 400);
        }
        
        // 原子减库存
        const newStock = await RedisService.decrBy(stockKey, quantity);
        if (newStock < 0) {
          // 回滚库存
          await RedisService.incrBy(stockKey, quantity);
          throw new CustomError('库存不足', 400);
        }
        
        // 创建秒杀订单
        const orderSql = `
          INSERT INTO seckill_orders 
          (user_id, seckill_id, product_id, quantity, price, total_amount, status)
          VALUES (?, ?, ?, ?, ?, ?, 'pending')
        `;
        
        const totalAmount = seckill.seckill_price * quantity;
        
        const orderResult = await connection.execute(orderSql, [
          userId,
          seckillId,
          seckill.product_id,
          quantity,
          seckill.seckill_price,
          totalAmount
        ]);
        
        const orderId = (orderResult[0] as any).insertId;
        
        // 设置订单过期时间（15分钟）
        await RedisService.setEx(`seckill_order:${orderId}`, 900, 'pending');
        
        return {
          orderId,
          totalAmount,
          expireTime: new Date(Date.now() + 15 * 60 * 1000)
        };
      });
    } catch (error) {
      logger.error('参与秒杀失败:', error);
      throw error;
    }
  }

  // 更新活动状态
  static async updateActivityStatus() {
    try {
      const now = new Date().toISOString();
      
      // 开始活动
      await query(`
        UPDATE seckill_activities 
        SET status = 'active' 
        WHERE status = 'pending' AND start_time <= ?
      `, [now]);
      
      // 结束活动
      await query(`
        UPDATE seckill_activities 
        SET status = 'ended' 
        WHERE status = 'active' AND end_time <= ?
      `, [now]);
      
    } catch (error) {
      logger.error('更新秒杀活动状态失败:', error);
    }
  }

  // 取消过期订单
  static async cancelExpiredOrders() {
    try {
      const expiredOrders = await query(`
        SELECT id, seckill_id, quantity
        FROM seckill_orders
        WHERE status = 'pending' AND created_at < DATE_SUB(NOW(), INTERVAL 15 MINUTE)
      `);
      
      for (const order of expiredOrders) {
        await transaction(async (connection) => {
          // 取消订单
          await connection.execute(
            'UPDATE seckill_orders SET status = "cancelled" WHERE id = ?',
            [order.id]
          );
          
          // 回滚库存
          const stockKey = `seckill_stock:${order.seckill_id}`;
          await RedisService.incrBy(stockKey, order.quantity);
        });
      }
      
    } catch (error) {
      logger.error('取消过期秒杀订单失败:', error);
    }
  }
}