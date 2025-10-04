import { Request, Response, NextFunction } from 'express';
import { GroupBuyService } from '../services/GroupBuyService.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { AuthRequest } from '../middleware/auth.js';
import Joi from 'joi';

export class GroupBuyController {
  // 创建拼团活动
  static createGroupBuy = asyncHandler(async (req: Request, res: Response) => {
    const schema = Joi.object({
      activity_id: Joi.number().integer().positive().required(),
      product_id: Joi.number().integer().positive().required(),
      group_price: Joi.number().positive().required(),
      original_price: Joi.number().positive().required(),
      min_people: Joi.number().integer().min(2).required(),
      max_people: Joi.number().integer().greater(Joi.ref('min_people')).required(),
      time_limit: Joi.number().integer().positive().max(72).required() // 最多72小时
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(422).json({
        success: false,
        message: '参数验证失败',
        error: error.details[0].message
      });
    }

    const groupBuy = await GroupBuyService.createGroupBuy(value);

    res.status(201).json({
      success: true,
      message: '创建拼团活动成功',
      data: groupBuy
    });
  });

  // 获取拼团活动详情
  static getGroupBuy = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(422).json({
        success: false,
        message: '无效的拼团活动ID'
      });
    }

    const groupBuy = await GroupBuyService.getGroupBuyById(id);

    res.json({
      success: true,
      message: '获取成功',
      data: groupBuy
    });
  });

  // 获取活跃的拼团活动列表
  static getActiveGroupBuys = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    if (limit > 50) {
      return res.status(422).json({
        success: false,
        message: '每页最多50条记录'
      });
    }

    const result = await GroupBuyService.getActiveGroupBuys(page, limit);

    res.json({
      success: true,
      message: '获取成功',
      data: result
    });
  });

  // 发起拼团
  static startGroup = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '请先登录'
      });
    }

    const groupBuyId = parseInt(req.params.id);
    if (isNaN(groupBuyId)) {
      return res.status(422).json({
        success: false,
        message: '无效的拼团活动ID'
      });
    }

    const result = await GroupBuyService.startGroup(req.user.id, groupBuyId);

    res.json({
      success: true,
      message: '发起拼团成功',
      data: result
    });
  });

  // 参与拼团
  static joinGroup = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '请先登录'
      });
    }

    const groupId = parseInt(req.params.groupId);
    if (isNaN(groupId)) {
      return res.status(422).json({
        success: false,
        message: '无效的拼团ID'
      });
    }

    const result = await GroupBuyService.joinGroup(req.user.id, groupId);

    res.json({
      success: true,
      message: '参与拼团成功',
      data: result
    });
  });

  // 获取拼团详情
  static getGroupDetail = asyncHandler(async (req: Request, res: Response) => {
    const groupId = parseInt(req.params.groupId);
    if (isNaN(groupId)) {
      return res.status(422).json({
        success: false,
        message: '无效的拼团ID'
      });
    }

    const result = await GroupBuyService.getGroupDetail(groupId);

    res.json({
      success: true,
      message: '获取成功',
      data: result
    });
  });
}