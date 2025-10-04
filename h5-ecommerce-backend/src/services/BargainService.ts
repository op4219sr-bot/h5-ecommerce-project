import { query, transaction } from '../config/database.js';
import { RedisService } from '../config/redis.js';
import { CustomError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import type { BargainActivity } from '../types/index.js';

export class BargainService {
  // 创建砍价活动
  static async createBargain(data: {
    activity_id: number;
    product_id: number;
    original_price: number;
    min_price: number;
    max_bargain_count: number;
    time_limit: number;
  }): Promise<BargainActivity> {
    try {
      const sql = `
        INSERT INTO bargain_activities 
        (activity_id, product_id, original_price, min_price, max_bargain_count, time_limit, status)
        VALUES (?, ?, ?, ?, ?, ?, 'active')
      `;
      
      const result = await query(sql, [
        data.activity_id,
        data.product_id,
        data.original_price,
        data.min_price,
        data.max_bargain_count,
        data.time_limit
      ]);

      const bargainId = (result as any).insertId;
      return await this.getBargainById(bargainId);
    } catch (error) {
      logger.error('创建砍价活动失败:', error);
      throw new CustomError('创建砍价活动失败', 500);
    }
  }

  // 获取砍价活动详情
  static async getBargainById(id: number): Promise<BargainActivity> {
    try {
      const sql = `
        SELECT b.*, p.name as product_name, p.images as product_images
        FROM bargain_activities b
        LEFT JOIN products p ON b.product_id = p.id
        WHERE b.id = ?
      `;
      
      const results = await query(sql, [id]);
      
      if (results.length === 0) {
        throw new CustomError('砍价活动不存在', 404);
      }
      
      return results[0] as BargainActivity;
    } catch (error) {
      logger.error('获取砍价活动失败:', error);
      throw error;
    }
  }

  // 获取活跃的砍价活动列表
  static async getActiveBargains(page: number = 1, limit: number = 10) {
    try {
      const offset = (page - 1) * limit;
      
      const sql = `
        SELECT b.*, p.name as product_name, p.images as product_images,
               COUNT(br.id) as active_records
        FROM bargain_activities b
        LEFT JOIN products p ON b.product_id = p.id
        LEFT JOIN bargain_records br ON b.id = br.bargain_id AND br.status = 'active'
        WHERE b.status = 'active'
        GROUP BY b.id
        ORDER BY b.created_at DESC
        LIMIT ? OFFSET ?
      `;
      
      const countSql = `
        SELECT COUNT(*) as total
        FROM bargain_activities
        WHERE status = 'active'
      `;
      
      const [items, countResult] = await Promise.all([
        query(sql, [limit, offset]),
        query(countSql)
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
      logger.error('获取砍价活动列表失败:', error);
      throw new CustomError('获取砍价活动列表失败', 500);
    }
  }

  // 发起砍价
  static async startBargain(userId: number, bargainId: number) {
    try {
      return await transaction(async (connection) => {
        // 获取砍价活动信息
        const bargain = await this.getBargainById(bargainId);
        
        if (bargain.status !== 'active') {
          throw new CustomError('砍价活动已结束', 400);
        }
        
        // 检查用户是否已经发起过砍价
        const existingRecordSql = `
          SELECT id FROM bargain_records
          WHERE bargain_id = ? AND user_id = ? AND status IN ('active', 'success')
        `;
        
        const existingRecords = await query(existingRecordSql, [bargainId, userId]);
        
        if (existingRecords.length > 0) {
          throw new CustomError('您已经参与了该商品的砍价', 400);
        }
        
        // 创建砍价记录
        const recordSql = `
          INSERT INTO bargain_records 
          (bargain_id, user_id, original_price, current_price, target_price, 
           bargain_count, max_bargain_count, expire_time, status)
          VALUES (?, ?, ?, ?, ?, 0, ?, DATE_ADD(NOW(), INTERVAL ? HOUR), 'active')
        `;
        
        const targetPrice = Math.max(
          bargain.min_price,
          bargain.original_price * 0.1 // 最低砍到原价的10%
        );
        
        const recordResult = await connection.execute(recordSql, [
          bargainId,
          userId,
          bargain.original_price,
          bargain.original_price,
          targetPrice,
          bargain.max_bargain_count,
          bargain.time_limit
        ]);
        
        const recordId = (recordResult[0] as any).insertId;
        
        return {
          recordId,
          originalPrice: bargain.original_price,
          currentPrice: bargain.original_price,
          targetPrice,
          maxBargainCount: bargain.max_bargain_count,
          expireTime: new Date(Date.now() + bargain.time_limit * 60 * 60 * 1000)
        };
      });
    } catch (error) {
      logger.error('发起砍价失败:', error);
      throw error;
    }
  }

  // 帮助砍价
  static async helpBargain(helperId: number, recordId: number) {
    try {
      return await transaction(async (connection) => {
        // 获取砍价记录
        const recordSql = `
          SELECT br.*, ba.min_price
          FROM bargain_records br
          JOIN bargain_activities ba ON br.bargain_id = ba.id
          WHERE br.id = ?
        `;
        
        const recordResults = await query(recordSql, [recordId]);
        
        if (recordResults.length === 0) {
          throw new CustomError('砍价记录不存在', 404);
        }
        
        const record = recordResults[0] as any;
        
        if (record.status !== 'active') {
          throw new CustomError('砍价已结束', 400);
        }
        
        if (new Date(record.expire_time) < new Date()) {
          throw new CustomError('砍价已过期', 400);
        }
        
        if (record.bargain_count >= record.max_bargain_count) {
          throw new CustomError('砍价次数已用完', 400);
        }
        
        // 检查是否已经帮助过砍价
        const helpCheckSql = `
          SELECT id FROM bargain_helps
          WHERE record_id = ? AND helper_id = ?
        `;
        
        const existingHelps = await query(helpCheckSql, [recordId, helperId]);
        
        if (existingHelps.length > 0) {
          throw new CustomError('您已经帮助过砍价了', 400);
        }
        
        // 计算砍价金额（随机砍价，但有一定策略）
        const remainingAmount = record.current_price - record.target_price;
        const remainingCount = record.max_bargain_count - record.bargain_count;
        
        let bargainAmount: number;
        if (remainingCount === 1) {
          // 最后一次砍价，砍到目标价格
          bargainAmount = remainingAmount;
        } else {
          // 随机砍价，但确保能砍到目标价格
          const maxBargain = Math.min(
            remainingAmount * 0.8, // 最多砍掉剩余金额的80%
            remainingAmount / remainingCount * 2 // 平均值的2倍
          );
          
          const minBargain = Math.max(
            0.01, // 最少砍1分钱
            remainingAmount / remainingCount * 0.5 // 平均值的50%
          );
          
          bargainAmount = Math.random() * (maxBargain - minBargain) + minBargain;
          bargainAmount = Math.round(bargainAmount * 100) / 100; // 保留两位小数
        }
        
        const newPrice = Math.max(record.target_price, record.current_price - bargainAmount);
        
        // 记录砍价帮助
        const helpSql = `
          INSERT INTO bargain_helps (record_id, helper_id, bargain_amount, help_time)
          VALUES (?, ?, ?, NOW())
        `;
        
        await connection.execute(helpSql, [recordId, helperId, bargainAmount]);
        
        // 更新砍价记录
        const updateRecordSql = `
          UPDATE bargain_records 
          SET current_price = ?, bargain_count = bargain_count + 1,
              status = CASE WHEN ? <= target_price THEN 'success' ELSE 'active' END
          WHERE id = ?
        `;
        
        await connection.execute(updateRecordSql, [newPrice, newPrice, recordId]);
        
        const isSuccess = newPrice <= record.target_price;
        
        return {
          bargainAmount,
          newPrice,
          isSuccess,
          remainingCount: remainingCount - 1
        };
      });
    } catch (error) {
      logger.error('帮助砍价失败:', error);
      throw error;
    }
  }

  // 获取砍价记录详情
  static async getBargainRecord(recordId: number) {
    try {
      const sql = `
        SELECT br.*, ba.product_id, ba.original_price as activity_original_price,
               p.name as product_name, p.images as product_images,
               u.nickname as user_name, u.avatar as user_avatar
        FROM bargain_records br
        JOIN bargain_activities ba ON br.bargain_id = ba.id
        JOIN products p ON ba.product_id = p.id
        JOIN users u ON br.user_id = u.id
        WHERE br.id = ?
      `;
      
      const recordResults = await query(sql, [recordId]);
      
      if (recordResults.length === 0) {
        throw new CustomError('砍价记录不存在', 404);
      }
      
      const record = recordResults[0];
      
      // 获取砍价帮助列表
      const helpsSql = `
        SELECT bh.*, u.nickname as helper_name, u.avatar as helper_avatar
        FROM bargain_helps bh
        JOIN users u ON bh.helper_id = u.id
        WHERE bh.record_id = ?
        ORDER BY bh.help_time DESC
      `;
      
      const helps = await query(helpsSql, [recordId]);
      
      return {
        ...record,
        helps
      };
    } catch (error) {
      logger.error('获取砍价记录失败:', error);
      throw error;
    }
  }

  // 检查过期砍价
  static async checkExpiredBargains() {
    try {
      const expiredRecords = await query(`
        SELECT id FROM bargain_records
        WHERE status = 'active' AND expire_time < NOW()
      `);
      
      for (const record of expiredRecords) {
        await query(
          'UPDATE bargain_records SET status = "expired" WHERE id = ?',
          [record.id]
        );
      }
      
      if (expiredRecords.length > 0) {
        logger.info(`处理了 ${expiredRecords.length} 个过期砍价记录`);
      }
    } catch (error) {
      logger.error('检查过期砍价失败:', error);
    }
  }

  // 获取用户的砍价记录
  static async getUserBargainRecords(userId: number, page: number = 1, limit: number = 10) {
    try {
      const offset = (page - 1) * limit;
      
      const sql = `
        SELECT br.*, ba.product_id,
               p.name as product_name, p.images as product_images
        FROM bargain_records br
        JOIN bargain_activities ba ON br.bargain_id = ba.id
        JOIN products p ON ba.product_id = p.id
        WHERE br.user_id = ?
        ORDER BY br.created_at DESC
        LIMIT ? OFFSET ?
      `;
      
      const countSql = `
        SELECT COUNT(*) as total
        FROM bargain_records
        WHERE user_id = ?
      `;
      
      const [items, countResult] = await Promise.all([
        query(sql, [userId, limit, offset]),
        query(countSql, [userId])
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
      logger.error('获取用户砍价记录失败:', error);
      throw new CustomError('获取用户砍价记录失败', 500);
    }
  }

  // 砍价成功后创建订单
  static async createBargainOrder(recordId: number) {
    try {
      return await transaction(async (connection) => {
        // 获取砍价记录
        const record = await this.getBargainRecord(recordId);
        
        if (record.status !== 'success') {
          throw new CustomError('砍价未成功，无法下单', 400);
        }
        
        // 检查是否已经下单
        const existingOrderSql = `
          SELECT id FROM bargain_orders
          WHERE bargain_record_id = ?
        `;
        
        const existingOrders = await query(existingOrderSql, [recordId]);
        
        if (existingOrders.length > 0) {
          throw new CustomError('已经下过单了', 400);
        }
        
        // 创建订单
        const orderSql = `
          INSERT INTO bargain_orders 
          (user_id, bargain_record_id, bargain_id, product_id, quantity, price, total_amount, status)
          VALUES (?, ?, ?, ?, 1, ?, ?, 'pending')
        `;
        
        const orderResult = await connection.execute(orderSql, [
          record.user_id,
          recordId,
          record.bargain_id,
          record.product_id,
          record.current_price,
          record.current_price
        ]);
        
        const orderId = (orderResult[0] as any).insertId;
        
        // 设置订单过期时间（30分钟）
        await RedisService.setEx(`bargain_order:${orderId}`, 1800, 'pending');
        
        return {
          orderId,
          totalAmount: record.current_price,
          expireTime: new Date(Date.now() + 30 * 60 * 1000)
        };
      });
    } catch (error) {
      logger.error('创建砍价订单失败:', error);
      throw error;
    }
  }
}