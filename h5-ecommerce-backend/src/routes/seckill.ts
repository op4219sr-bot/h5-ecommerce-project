import { Router } from 'express';
import { SeckillController } from '../controllers/SeckillController.js';
import { authenticate, requireAdmin, optionalAuth } from '../middleware/auth.js';

const router = Router();

// 公开接口
router.get('/list', SeckillController.getActiveSeckills);
router.get('/:id', SeckillController.getSeckill);

// 需要登录的接口
router.post('/:id/participate', authenticate, SeckillController.participateSeckill);

// 管理员接口
router.post('/', requireAdmin, SeckillController.createSeckill);

export default router;