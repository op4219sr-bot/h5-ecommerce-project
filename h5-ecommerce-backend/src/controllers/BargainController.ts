import { Request, Response, NextFunction } from 'express';
import { BargainService } from '../services/BargainService.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { AuthRequest } from '../middleware/auth.js';
import Joi from 'joi';

export class BargainController {
  // 创建砍价活动
  static createBargain = asyncHandler(async (req: Request, res: Response) => {
    const schema = Joi.object({
      activity_id: Joi.number().integer().positive().required(),
      product_id: Joi.number().integer().positive().required(),
      original_price: Joi.number().positive().required(),
      min_price: Joi.number().positive().less(Joi.ref('original_price')).required(),
      max_bargain_count: Joi.number().integer().min(1).max(100).required(),
      time_limit: Joi.number().integer().positive().max(72).required()
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(422).json({
        success: false,
        message: '参数验证失败',
        error: error.details[0].message
      });
    }

    const bargain = await BargainService.createBargain(value);

    res.status(201).json({
      success: true,
      message: '创建砍价活动成功',
      data: bargain
    });
  });

  // 获取砍价活动详情
  static getBargain = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(422).json({
        success: false,
        message: '无效的砍价活动ID'
      });
    }

    const bargain = await BargainService.getBargainById(id);

    res.json({
      success: true,
      message: '获取成功',
      data: bargain
    });
  });

  // 获取活跃的砍价活动列表
  static getActiveBargains = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    if (limit > 50) {
      return res.status(422).json({
        success: false,
        message: '每页最多50条记录'
      });
    }

    const result = await BargainService.getActiveBargains(page, limit);

    res.json({
      success: true,
      message: '获取成功',
      data: result
    });
  });

  // 发起砍价
  static startBargain = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '请先登录'
      });
    }

    const bargainId = parseInt(req.params.id);
    if (isNaN(bargainId)) {
      return res.status(422).json({
        success: false,
        message: '无效的砍价活动ID'
      });
    }

    const result = await BargainService.startBargain(req.user.id, bargainId);

    res.json({
      success: true,
      message: '发起砍价成功',
      data: result
    });
  });

  // 帮助砍价
  static helpBargain = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '请先登录'
      });
    }

    const recordId = parseInt(req.params.recordId);
    if (isNaN(recordId)) {
      return res.status(422).json({
        success: false,
        message: '无效的砍价记录ID'
      });
    }

    const result = await BargainService.helpBargain(req.user.id, recordId);

    res.json({
      success: true,
      message: '砍价成功',
      data: result
    });
  });

  // 获取砍价记录详情
  static getBargainRecord = asyncHandler(async (req: Request, res: Response) => {
    const recordId = parseInt(req.params.recordId);
    if (isNaN(recordId)) {
      return res.status(422).json({
        success: false,
        message: '无效的砍价记录ID'
      });
    }

    const result = await BargainService.getBargainRecord(recordId);

    res.json({
      success: true,
      message: '获取成功',
      data: result
    });
  });

  // 获取用户砍价记录
  static getUserBargainRecords = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '请先登录'
      });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    if (limit > 50) {
      return res.status(422).json({
        success: false,
        message: '每页最多50条记录'
      });
    }

    const result = await BargainService.getUserBargainRecords(req.user.id, page, limit);

    res.json({
      success: true,
      message: '获取成功',
      data: result
    });
  });

  // 砍价成功后创建订单
  static createBargainOrder = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '请先登录'
      });
    }

    const recordId = parseInt(req.params.recordId);
    if (isNaN(recordId)) {
      return res.status(422).json({
        success: false,
        message: '无效的砍价记录ID'
      });
    }

    const result = await BargainService.createBargainOrder(recordId);

    res.json({
      success: true,
      message: '创建订单成功',
      data: result
    });
  });
}