import { Request, Response, NextFunction } from 'express';
import connectRedis from "../config/redis.js";
import { ApiResponseHandler } from "../utils/apiResponse.js";

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
}

export const rateLimiter = (options: RateLimitOptions) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    if (process.env.NODE_ENV === 'test') {
      return next();
    }
    try {
      const redisClient = await connectRedis();

      if (!redisClient || !redisClient.isOpen) {
        console.warn('Redis is not connected. Bypassing rate limiter.');
        return next();
      }

      const ip = req.ip || req.socket.remoteAddress || 'unknown-ip';

      const path = req.baseUrl + req.path;
      const key = `rate_limit:${ip}:${path}`;

      const now = Date.now();
      const windowStart = now - options.windowMs;

      const uniqueValue = `${now}-${Math.random()}`;

      const multi = redisClient.multi();
      multi.zRemRangeByScore(key, 0, windowStart);
      multi.zAdd(key, { score: now, value: uniqueValue });
      multi.zCard(key);
      multi.expire(key, Math.ceil(options.windowMs / 1000));

      const results = await multi.exec();
      if (!results) {

        return next();
      }

      const requestCount = results[2] as unknown as number;

      res.setHeader('X-RateLimit-Limit', options.max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, options.max - requestCount));
      res.setHeader('X-RateLimit-Reset', new Date(now + options.windowMs).toISOString());

      if (requestCount > options.max) {
        return ApiResponseHandler.error(
          res,
          429,
          options.message || 'Too many requests, please try again later.'
        );
      }

      next();
    } catch (error) {
      console.error('Rate limiting middleware error:', error);

      next();
    }
  };
};
