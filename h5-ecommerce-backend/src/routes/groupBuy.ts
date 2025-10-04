import { Router } from 'express';
import { GroupBuyController } from '../controllers/GroupBuyController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// 公开接口
router.get('/list', GroupBuyController.getActiveGroupBuys);
router.get('/:id', GroupBuyController.getGroupBuy);
router.get('/group/:groupId', GroupBuyController.getGroupDetail);

// 需要登录的接口
router.post('/:id/start', authenticate, GroupBuyController.startGroup);
router.post('/group/:groupId/join', authenticate, GroupBuyController.joinGroup);

// 管理员接口
router.post('/', requireAdmin, GroupBuyController.createGroupBuy);

export default router;