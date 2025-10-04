import { Router } from 'express';
import { BargainController } from '../controllers/BargainController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// 公开接口
router.get('/list', BargainController.getActiveBargains);
router.get('/:id', BargainController.getBargain);
router.get('/record/:recordId', BargainController.getBargainRecord);

// 需要登录的接口
router.post('/:id/start', authenticate, BargainController.startBargain);
router.post('/record/:recordId/help', authenticate, BargainController.helpBargain);
router.post('/record/:recordId/order', authenticate, BargainController.createBargainOrder);
router.get('/user/records', authenticate, BargainController.getUserBargainRecords);

// 管理员接口
router.post('/', requireAdmin, BargainController.createBargain);

export default router;