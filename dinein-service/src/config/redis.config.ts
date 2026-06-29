import { createClient } from 'redis';
import { logger } from '../utils/logger.js';

let redisClient: ReturnType<typeof createClient>;

const connectRedis = async (): Promise<ReturnType<typeof createClient>> => {
  if (redisClient?.isOpen) {
    return redisClient;
  }

  if (!redisClient) {
    if (!process.env.REDIS_HOST || !process.env.REDIS_PORT) {
      throw new Error('[DineIn] Redis environment variables are missing');
    }

    redisClient = createClient({
      username: process.env.REDIS_USERNAME,
      password: process.env.REDIS_PASSWORD,
      socket: {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('[DineIn Redis] Max reconnection attempts reached');
            return new Error('Max reconnection attempts');
          }
          return Math.min(retries * 100, 3000);
        },
      },
    } as Parameters<typeof createClient>[0]);

    redisClient.on('error', (err) => logger.error('[DineIn Redis] Error:', err));
    redisClient.on('connect', () => logger.info('[DineIn Redis] Connecting...'));
    redisClient.on('ready', () => logger.info('[DineIn Redis] Ready'));
    redisClient.on('reconnecting', () => logger.warn('[DineIn Redis] Reconnecting...'));
  }

  if (!redisClient.isOpen) {
    await redisClient.connect();
  }

  return redisClient;
};

export const getRedisClient = (): ReturnType<typeof createClient> => {
  if (!redisClient || !redisClient.isOpen) {
    throw new Error('[DineIn Redis] Client not initialized. Call connectRedis() first.');
  }
  return redisClient;
};

export default connectRedis;
