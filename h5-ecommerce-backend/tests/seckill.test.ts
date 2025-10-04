import request from 'supertest';
import app from '../src/app.js';
import { SeckillService } from '../src/services/SeckillService.js';

describe('秒杀功能测试', () => {
  let authToken: string;
  let seckillId: number;

  beforeAll(async () => {
    // 登录获取token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        phone: '13800138000',
        password: '123456'
      });
    
    authToken = loginResponse.body.data.token;
  });

  beforeEach(async () => {
    // 创建测试秒杀活动
    const seckillData = {
      product_id: 1,
      seckill_price: 99.00,
      stock: 100,
      limit_per_user: 1,
      start_time: new Date(Date.now() + 1000),
      end_time: new Date(Date.now() + 3600000)
    };
    
    const seckill = await SeckillService.createSeckill(seckillData);
    seckillId = seckill.id;
  });

  describe('GET /api/seckill/list', () => {
    it('应该返回秒杀活动列表', async () => {
      const response = await request(app)
        .get('/api/seckill/list')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.list)).toBe(true);
    });
  });

  describe('GET /api/seckill/:id', () => {
    it('应该返回秒杀活动详情', async () => {
      const response = await request(app)
        .get(`/api/seckill/${seckillId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(seckillId);
    });

    it('不存在的秒杀活动应该返回404', async () => {
      await request(app)
        .get('/api/seckill/99999')
        .expect(404);
    });
  });

  describe('POST /api/seckill/:id/participate', () => {
    it('应该成功参与秒杀', async () => {
      // 等待秒杀开始
      await new Promise(resolve => setTimeout(resolve, 1100));

      const response = await request(app)
        .post(`/api/seckill/${seckillId}/participate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ quantity: 1 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.order_id).toBeDefined();
    });

    it('未登录用户不能参与秒杀', async () => {
      await request(app)
        .post(`/api/seckill/${seckillId}/participate`)
        .send({ quantity: 1 })
        .expect(401);
    });

    it('超出限购数量应该失败', async () => {
      await new Promise(resolve => setTimeout(resolve, 1100));

      await request(app)
        .post(`/api/seckill/${seckillId}/participate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ quantity: 2 })
        .expect(400);
    });
  });

  describe('秒杀库存控制', () => {
    it('应该正确扣减库存', async () => {
      await new Promise(resolve => setTimeout(resolve, 1100));

      const initialStock = await SeckillService.getSeckillStock(seckillId);
      
      await request(app)
        .post(`/api/seckill/${seckillId}/participate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ quantity: 1 });

      const finalStock = await SeckillService.getSeckillStock(seckillId);
      expect(finalStock).toBe(initialStock - 1);
    });

    it('库存不足时应该失败', async () => {
      // 将库存设置为0
      await SeckillService.updateSeckillStock(seckillId, 0);
      await new Promise(resolve => setTimeout(resolve, 1100));

      await request(app)
        .post(`/api/seckill/${seckillId}/participate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ quantity: 1 })
        .expect(400);
    });
  });
});