import rateLimit from 'express-rate-limit';
import { getEnv } from '../config/env.config.js';

export const apiRateLimiter = rateLimit({
  windowMs: getEnv().RATE_LIMIT_WINDOW_MS,
  max: getEnv().RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
});
