import request from 'supertest';
import app from '../src/app.js';
import { GroupBuyService } from '../src/services/GroupBuyService.js';

describe('拼团功能测试', () => {
  let authToken: string;
  let groupBuyId: number;
  let groupId: number;

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
    // 创建测试拼团活动
    const groupBuyData = {
      product_id: 1,
      group_price: 199.00,
      original_price: 299.00,
      min_people: 3,
      max_people: 5,
      time_limit: 24
    };
    
    const groupBuy = await GroupBuyService.createGroupBuy(groupBuyData);
    groupBuyId = groupBuy.id;
  });

  describe('GET /api/group-buy/list', () => {
    it('应该返回拼团活动列表', async () => {
      const response = await request(app)
        .get('/api/group-buy/list')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.list)).toBe(true);
    });
  });

  describe('POST /api/group-buy/:id/start', () => {
    it('应该成功开团', async () => {
      const response = await request(app)
        .post(`/api/group-buy/${groupBuyId}/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ quantity: 1 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.group_id).toBeDefined();
      
      groupId = response.body.data.group_id;
    });

    it('未登录用户不能开团', async () => {
      await request(app)
        .post(`/api/group-buy/${groupBuyId}/start`)
        .send({ quantity: 1 })
        .expect(401);
    });
  });

  describe('POST /api/group-buy/group/:groupId/join', () => {
    beforeEach(async () => {
      // 先开团
      const response = await request(app)
        .post(`/api/group-buy/${groupBuyId}/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ quantity: 1 });
      
      groupId = response.body.data.group_id;
    });

    it('应该成功参团', async () => {
      // 使用另一个用户参团
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          phone: '13800138001',
          password: '123456'
        });
      
      const anotherToken = loginResponse.body.data.token;

      const response = await request(app)
        .post(`/api/group-buy/group/${groupId}/join`)
        .set('Authorization', `Bearer ${anotherToken}`)
        .send({ quantity: 1 })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('同一用户不能重复参团', async () => {
      await request(app)
        .post(`/api/group-buy/group/${groupId}/join`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ quantity: 1 })
        .expect(400);
    });
  });

  describe('拼团成团逻辑', () => {
    it('达到最少人数应该自动成团', async () => {
      // 开团
      const startResponse = await request(app)
        .post(`/api/group-buy/${groupBuyId}/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ quantity: 1 });
      
      groupId = startResponse.body.data.group_id;

      // 模拟多个用户参团
      for (let i = 1; i < 3; i++) {
        const loginResponse = await request(app)
          .post('/api/auth/login')
          .send({
            phone: `1380013800${i}`,
            password: '123456'
          });
        
        const userToken = loginResponse.body.data.token;

        await request(app)
          .post(`/api/group-buy/group/${groupId}/join`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({ quantity: 1 });
      }

      // 检查拼团状态
      const groupDetail = await GroupBuyService.getGroupDetail(groupId);
      expect(groupDetail.status).toBe('success');
    });
  });
});