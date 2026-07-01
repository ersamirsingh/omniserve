import connectRedis from '../config/redis.config.js';
import { ApiResponseHandler } from '../utils/response.handler.js';
export const rateLimiter = (options) => {
    return async (req, res, next) => {
        if (process.env.NODE_ENV === 'test') {
            return next();
        }
        try {
            const redisClient = await connectRedis();
            // Fallback in case Redis is not connected/running
            if (!redisClient || !redisClient.isOpen) {
                console.warn('Redis is not connected. Bypassing rate limiter.');
                return next();
            }
            // Identify client by IP (with fallback)
            const ip = req.ip || req.socket.remoteAddress || 'unknown-ip';
            // Rate limit per client IP + path to allow route-specific limits
            const path = req.baseUrl + req.path;
            const key = `rate_limit:${ip}:${path}`;
            const now = Date.now();
            const windowStart = now - options.windowMs;
            // Executing a sliding window counter using Redis multi transaction
            // 1. Remove elements older than windowStart
            // 2. Add current timestamp (randomized string to ensure uniqueness)
            // 3. Count total elements in the window
            // 4. Set expiration on the key to windowMs (converted to seconds) for cleanup
            const uniqueValue = `${now}-${Math.random()}`;
            const multi = redisClient.multi();
            multi.zRemRangeByScore(key, 0, windowStart);
            multi.zAdd(key, { score: now, value: uniqueValue });
            multi.zCard(key);
            multi.expire(key, Math.ceil(options.windowMs / 1000));
            const results = await multi.exec();
            if (!results) {
                // Fallback if transaction fails
                return next();
            }
            // The count of items is the third command (index 2) in the transaction
            const requestCount = results[2];
            // Set standard rate limit headers
            res.setHeader('X-RateLimit-Limit', options.max);
            res.setHeader('X-RateLimit-Remaining', Math.max(0, options.max - requestCount));
            res.setHeader('X-RateLimit-Reset', new Date(now + options.windowMs).toISOString());
            if (requestCount > options.max) {
                return ApiResponseHandler.error(res, 429, options.message || 'Too many requests, please try again later.');
            }
            next();
        }
        catch (error) {
            console.error('Rate limiting middleware error:', error);
            // Fail open to avoid blocking users on internal error
            next();
        }
    };
};
