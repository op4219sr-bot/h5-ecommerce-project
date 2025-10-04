import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { CustomError } from './errorHandler.js';
import { RedisService } from '../config/redis.js';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    phone: string;
    role: string;
  };
}

// JWT认证中间件
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      throw new CustomError('未提供认证令牌', 401, 'NO_TOKEN');
    }

    // 验证JWT
    const decoded = jwt.verify(token, config.jwt.secret) as any;
    
    // 检查Redis中的token是否有效
    const redisToken = await RedisService.get(`user_token:${decoded.id}`);
    if (!redisToken || redisToken !== token) {
      throw new CustomError('令牌已失效', 401, 'TOKEN_EXPIRED');
    }

    req.user = decoded;
    next();
  } catch (error) {
    next(new CustomError('认证失败', 401, 'AUTH_FAILED'));
  }
};

// 管理员权限中间件
export const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new CustomError('未认证', 401, 'UNAUTHENTICATED');
    }

    if (req.user.role !== 'admin') {
      throw new CustomError('权限不足', 403, 'INSUFFICIENT_PERMISSIONS');
    }

    next();
  } catch (error) {
    next(error);
  }
};

// 可选认证中间件（不强制要求登录）
export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, config.jwt.secret) as any;
      const redisToken = await RedisService.get(`user_token:${decoded.id}`);
      
      if (redisToken === token) {
        req.user = decoded;
      }
    }
    
    next();
  } catch (error) {
    // 可选认证失败时不抛出错误，继续执行
    next();
  }
};