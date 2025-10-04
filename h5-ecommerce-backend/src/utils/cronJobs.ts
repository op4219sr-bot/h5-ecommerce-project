import cron from 'node-cron';
import { logger } from './logger.js';
import { SeckillService } from '../services/SeckillService.js';
import { GroupBuyService } from '../services/GroupBuyService.js';
import { BargainService } from '../services/BargainService.js';

export function initCronJobs() {
  // 每分钟检查秒杀活动状态
  cron.schedule('* * * * *', async () => {
    try {
      await SeckillService.updateActivityStatus();
    } catch (error) {
      logger.error('更新秒杀活动状态失败:', error);
    }
  });

  // 每5分钟检查拼团活动状态
  cron.schedule('*/5 * * * *', async () => {
    try {
      await GroupBuyService.checkExpiredGroups();
    } catch (error) {
      logger.error('检查过期拼团失败:', error);
    }
  });

  // 每10分钟检查砍价活动状态
  cron.schedule('*/10 * * * *', async () => {
    try {
      await BargainService.checkExpiredBargains();
    } catch (error) {
      logger.error('检查过期砍价失败:', error);
    }
  });

  // 每天凌晨清理过期数据
  cron.schedule('0 0 * * *', async () => {
    try {
      logger.info('开始清理过期数据...');
      // 这里可以添加清理过期数据的逻辑
      logger.info('清理过期数据完成');
    } catch (error) {
      logger.error('清理过期数据失败:', error);
    }
  });

  logger.info('定时任务初始化完成');
}