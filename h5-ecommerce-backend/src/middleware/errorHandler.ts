import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
}

export class CustomError extends Error implements AppError {
  public statusCode: number;
  public code: string;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let { statusCode = 500, message, code = 'INTERNAL_ERROR' } = error;

  // 记录错误日志
  logger.error('API错误:', {
    error: message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.body,
    params: req.params,
    query: req.query
  });

  // 数据库错误处理
  if (error.message?.includes('ER_DUP_ENTRY')) {
    statusCode = 409;
    message = '数据已存在';
    code = 'DUPLICATE_ENTRY';
  }

  // JWT错误处理
  if (error.message?.includes('jwt')) {
    statusCode = 401;
    message = '认证失败';
    code = 'AUTH_FAILED';
  }

  // 验证错误处理
  if (error.message?.includes('ValidationError')) {
    statusCode = 422;
    code = 'VALIDATION_ERROR';
  }

  // 生产环境下隐藏敏感错误信息
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = '服务器内部错误';
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    },
    timestamp: new Date().toISOString()
  });
};

// 异步错误处理包装器
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};