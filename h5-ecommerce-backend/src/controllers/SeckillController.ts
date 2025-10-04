import { Request, Response, NextFunction } from 'express';
import { SeckillService } from '../services/SeckillService.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { AuthRequest } from '../middleware/auth.js';
import Joi from 'joi';

export class SeckillController {
  // 创建秒杀活动
  static createSeckill = asyncHandler(async (req: Request, res: Response) => {
    const schema = Joi.object({
      activity_id: Joi.number().integer().positive().required(),
      product_id: Joi.number().integer().positive().required(),
      seckill_price: Joi.number().positive().required(),
      stock: Joi.number().integer().positive().required(),
      limit_per_user: Joi.number().integer().positive().required(),
      start_time: Joi.date().iso().required(),
      end_time: Joi.date().iso().greater(Joi.ref('start_time')).required()
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(422).json({
        success: false,
        message: '参数验证失败',
        error: error.details[0].message
      });
    }

    const seckill = await SeckillService.createSeckill(value);

    res.status(201).json({
      success: true,
      message: '创建秒杀活动成功',
      data: seckill
    });
  });

  // 获取秒杀活动详情
  static getSeckill = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(422).json({
        success: false,
        message: '无效的秒杀活动ID'
      });
    }

    const seckill = await SeckillService.getSeckillById(id);

    res.json({
      success: true,
      message: '获取成功',
      data: seckill
    });
  });

  // 获取进行中的秒杀活动列表
  static getActiveSeckills = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    if (limit > 50) {
      return res.status(422).json({
        success: false,
        message: '每页最多50条记录'
      });
    }

    const result = await SeckillService.getActiveSeckills(page, limit);

    res.json({
      success: true,
      message: '获取成功',
      data: result
    });
  });

  // 参与秒杀
  static participateSeckill = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '请先登录'
      });
    }

    const seckillId = parseInt(req.params.id);
    const quantity = parseInt(req.body.quantity) || 1;

    if (isNaN(seckillId) || quantity < 1) {
      return res.status(422).json({
        success: false,
        message: '参数错误'
      });
    }

    const result = await SeckillService.participateSeckill(
      req.user.id,
      seckillId,
      quantity
    );

    res.json({
      success: true,
      message: '参与秒杀成功',
      data: result
    });
  });
}