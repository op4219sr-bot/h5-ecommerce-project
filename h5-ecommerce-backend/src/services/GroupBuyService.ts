import { query, transaction } from '../config/database.js';
import { RedisService } from '../config/redis.js';
import { CustomError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import type { GroupBuyActivity } from '../types/index.js';

export class GroupBuyService {
  // 创建拼团活动
  static async createGroupBuy(data: {
    activity_id: number;
    product_id: number;
    group_price: number;
    original_price: number;
    min_people: number;
    max_people: number;
    time_limit: number;
  }): Promise<GroupBuyActivity> {
    try {
      const sql = `
        INSERT INTO group_buy_activities 
        (activity_id, product_id, group_price, original_price, min_people, max_people, time_limit, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
      `;
      
      const result = await query(sql, [
        data.activity_id,
        data.product_id,
        data.group_price,
        data.original_price,
        data.min_people,
        data.max_people,
        data.time_limit
      ]);

      const groupBuyId = (result as any).insertId;
      return await this.getGroupBuyById(groupBuyId);
    } catch (error) {
      logger.error('创建拼团活动失败:', error);
      throw new CustomError('创建拼团活动失败', 500);
    }
  }

  // 获取拼团活动详情
  static async getGroupBuyById(id: number): Promise<GroupBuyActivity> {
    try {
      const sql = `
        SELECT g.*, p.name as product_name, p.images as product_images
        FROM group_buy_activities g
        LEFT JOIN products p ON g.product_id = p.id
        WHERE g.id = ?
      `;
      
      const results = await query(sql, [id]);
      
      if (results.length === 0) {
        throw new CustomError('拼团活动不存在', 404);
      }
      
      return results[0] as GroupBuyActivity;
    } catch (error) {
      logger.error('获取拼团活动失败:', error);
      throw error;
    }
  }

  // 获取活跃的拼团活动列表
  static async getActiveGroupBuys(page: number = 1, limit: number = 10) {
    try {
      const offset = (page - 1) * limit;
      
      const sql = `
        SELECT g.*, p.name as product_name, p.images as product_images,
               COUNT(gg.id) as active_groups
        FROM group_buy_activities g
        LEFT JOIN products p ON g.product_id = p.id
        LEFT JOIN group_buy_groups gg ON g.id = gg.group_buy_id AND gg.status = 'active'
        WHERE g.status = 'active'
        GROUP BY g.id
        ORDER BY g.created_at DESC
        LIMIT ? OFFSET ?
      `;
      
      const countSql = `
        SELECT COUNT(*) as total
        FROM group_buy_activities
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
      logger.error('获取拼团活动列表失败:', error);
      throw new CustomError('获取拼团活动列表失败', 500);
    }
  }

  // 发起拼团
  static async startGroup(userId: number, groupBuyId: number) {
    try {
      return await transaction(async (connection) => {
        // 获取拼团活动信息
        const groupBuy = await this.getGroupBuyById(groupBuyId);
        
        if (groupBuy.status !== 'active') {
          throw new CustomError('拼团活动已结束', 400);
        }
        
        // 检查用户是否已经在其他团中
        const existingGroupSql = `
          SELECT gg.id
          FROM group_buy_groups gg
          JOIN group_buy_members gm ON gg.id = gm.group_id
          WHERE gg.group_buy_id = ? AND gm.user_id = ? AND gg.status = 'active'
        `;
        
        const existingGroups = await query(existingGroupSql, [groupBuyId, userId]);
        
        if (existingGroups.length > 0) {
          throw new CustomError('您已经参与了该商品的拼团', 400);
        }
        
        // 创建拼团
        const groupSql = `
          INSERT INTO group_buy_groups 
          (group_buy_id, leader_id, current_people, target_people, expire_time, status)
          VALUES (?, ?, 1, ?, DATE_ADD(NOW(), INTERVAL ? HOUR), 'active')
        `;
        
        const groupResult = await connection.execute(groupSql, [
          groupBuyId,
          userId,
          groupBuy.min_people,
          groupBuy.time_limit
        ]);
        
        const groupId = (groupResult[0] as any).insertId;
        
        // 添加团长为成员
        const memberSql = `
          INSERT INTO group_buy_members (group_id, user_id, is_leader, join_time)
          VALUES (?, ?, 1, NOW())
        `;
        
        await connection.execute(memberSql, [groupId, userId]);
        
        // 创建订单
        const orderSql = `
          INSERT INTO group_buy_orders 
          (user_id, group_id, group_buy_id, product_id, quantity, price, total_amount, status)
          VALUES (?, ?, ?, ?, 1, ?, ?, 'pending')
        `;
        
        const orderResult = await connection.execute(orderSql, [
          userId,
          groupId,
          groupBuyId,
          groupBuy.product_id,
          groupBuy.group_price,
          groupBuy.group_price
        ]);
        
        const orderId = (orderResult[0] as any).insertId;
        
        return {
          groupId,
          orderId,
          expireTime: new Date(Date.now() + groupBuy.time_limit * 60 * 60 * 1000)
        };
      });
    } catch (error) {
      logger.error('发起拼团失败:', error);
      throw error;
    }
  }

  // 参与拼团
  static async joinGroup(userId: number, groupId: number) {
    try {
      return await transaction(async (connection) => {
        // 获取拼团信息
        const groupSql = `
          SELECT gg.*, gba.product_id, gba.group_price, gba.max_people
          FROM group_buy_groups gg
          JOIN group_buy_activities gba ON gg.group_buy_id = gba.id
          WHERE gg.id = ?
        `;
        
        const groupResults = await query(groupSql, [groupId]);
        
        if (groupResults.length === 0) {
          throw new CustomError('拼团不存在', 404);
        }
        
        const group = groupResults[0] as any;
        
        if (group.status !== 'active') {
          throw new CustomError('拼团已结束', 400);
        }
        
        if (new Date(group.expire_time) < new Date()) {
          throw new CustomError('拼团已过期', 400);
        }
        
        if (group.current_people >= group.max_people) {
          throw new CustomError('拼团人数已满', 400);
        }
        
        // 检查用户是否已经参与
        const memberCheckSql = `
          SELECT id FROM group_buy_members 
          WHERE group_id = ? AND user_id = ?
        `;
        
        const existingMembers = await query(memberCheckSql, [groupId, userId]);
        
        if (existingMembers.length > 0) {
          throw new CustomError('您已经参与了该拼团', 400);
        }
        
        // 添加成员
        const memberSql = `
          INSERT INTO group_buy_members (group_id, user_id, is_leader, join_time)
          VALUES (?, ?, 0, NOW())
        `;
        
        await connection.execute(memberSql, [groupId, userId]);
        
        // 更新拼团人数
        const updateGroupSql = `
          UPDATE group_buy_groups 
          SET current_people = current_people + 1
          WHERE id = ?
        `;
        
        await connection.execute(updateGroupSql, [groupId]);
        
        // 创建订单
        const orderSql = `
          INSERT INTO group_buy_orders 
          (user_id, group_id, group_buy_id, product_id, quantity, price, total_amount, status)
          VALUES (?, ?, ?, ?, 1, ?, ?, 'pending')
        `;
        
        const orderResult = await connection.execute(orderSql, [
          userId,
          groupId,
          group.group_buy_id,
          group.product_id,
          group.group_price,
          group.group_price
        ]);
        
        const orderId = (orderResult[0] as any).insertId;
        
        // 检查是否成团
        const newCurrentPeople = group.current_people + 1;
        if (newCurrentPeople >= group.target_people) {
          await this.completeGroup(groupId);
        }
        
        return {
          orderId,
          groupId,
          currentPeople: newCurrentPeople,
          targetPeople: group.target_people,
          isComplete: newCurrentPeople >= group.target_people
        };
      });
    } catch (error) {
      logger.error('参与拼团失败:', error);
      throw error;
    }
  }

  // 完成拼团
  static async completeGroup(groupId: number) {
    try {
      await transaction(async (connection) => {
        // 更新拼团状态
        await connection.execute(
          'UPDATE group_buy_groups SET status = "success" WHERE id = ?',
          [groupId]
        );
        
        // 更新所有订单状态为待支付
        await connection.execute(
          'UPDATE group_buy_orders SET status = "to_pay" WHERE group_id = ?',
          [groupId]
        );
      });
      
      logger.info(`拼团 ${groupId} 成功完成`);
    } catch (error) {
      logger.error('完成拼团失败:', error);
      throw error;
    }
  }

  // 检查过期拼团
  static async checkExpiredGroups() {
    try {
      const expiredGroups = await query(`
        SELECT id FROM group_buy_groups
        WHERE status = 'active' AND expire_time < NOW()
      `);
      
      for (const group of expiredGroups) {
        await transaction(async (connection) => {
          // 更新拼团状态为失败
          await connection.execute(
            'UPDATE group_buy_groups SET status = "failed" WHERE id = ?',
            [group.id]
          );
          
          // 取消相关订单
          await connection.execute(
            'UPDATE group_buy_orders SET status = "cancelled" WHERE group_id = ?',
            [group.id]
          );
        });
      }
      
      if (expiredGroups.length > 0) {
        logger.info(`处理了 ${expiredGroups.length} 个过期拼团`);
      }
    } catch (error) {
      logger.error('检查过期拼团失败:', error);
    }
  }

  // 获取拼团详情
  static async getGroupDetail(groupId: number) {
    try {
      const sql = `
        SELECT gg.*, gba.product_id, gba.group_price, gba.original_price,
               p.name as product_name, p.images as product_images,
               u.nickname as leader_name, u.avatar as leader_avatar
        FROM group_buy_groups gg
        JOIN group_buy_activities gba ON gg.group_buy_id = gba.id
        JOIN products p ON gba.product_id = p.id
        JOIN users u ON gg.leader_id = u.id
        WHERE gg.id = ?
      `;
      
      const groupResults = await query(sql, [groupId]);
      
      if (groupResults.length === 0) {
        throw new CustomError('拼团不存在', 404);
      }
      
      const group = groupResults[0];
      
      // 获取成员列表
      const membersSql = `
        SELECT gm.*, u.nickname, u.avatar
        FROM group_buy_members gm
        JOIN users u ON gm.user_id = u.id
        WHERE gm.group_id = ?
        ORDER BY gm.join_time ASC
      `;
      
      const members = await query(membersSql, [groupId]);
      
      return {
        ...group,
        members
      };
    } catch (error) {
      logger.error('获取拼团详情失败:', error);
      throw error;
    }
  }
}