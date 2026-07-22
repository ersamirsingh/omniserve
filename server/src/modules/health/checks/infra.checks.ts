import mongoose from 'mongoose';
import connectRedis from '../../../config/redis.js';
import fs from 'fs/promises';

export const checkMongoDB = async (deep = false): Promise<{ status: string; responseTimeMs: number; details: string }> => {
  const start = Date.now();
  try {
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database connection is not ready');
    }
    if (deep) {

      await mongoose.connection.db?.admin().ping();
    }
    const duration = Date.now() - start;
    return {
      status: 'ok',
      responseTimeMs: duration,
      details: 'Connected',
    };
  } catch (error: any) {
    return {
      status: 'down',
      responseTimeMs: Date.now() - start,
      details: error.message || 'Connection failed',
    };
  }
};

export const checkRedis = async (deep = false): Promise<{ status: string; responseTimeMs: number; details: string }> => {
  const start = Date.now();
  try {
    const hasRedisEnv = process.env.REDIS_HOST && process.env.REDIS_PORT;
    if (!hasRedisEnv) {
      return {
        status: 'ok',
        responseTimeMs: 0,
        details: 'Not configured / not used',
      };
    }

    const redisClient = await connectRedis();
    if (!redisClient || !redisClient.isOpen) {
      throw new Error('Redis client is not open');
    }

    await redisClient.ping();

    if (deep) {
      const tempKey = 'health_check_temp';
      await redisClient.set(tempKey, '1', { EX: 5 });
      const val = await redisClient.get(tempKey);
      await redisClient.del(tempKey);
      if (val !== '1') {
        throw new Error('Redis read/write verification failed');
      }
    }

    const duration = Date.now() - start;
    return {
      status: 'ok',
      responseTimeMs: duration,
      details: 'Connected',
    };
  } catch (error: any) {
    return {
      status: 'down',
      responseTimeMs: Date.now() - start,
      details: error.message || 'Connection failed',
    };
  }
};

export const checkPaymentGateway = async (): Promise<{ status: string; responseTimeMs: number; details: string }> => {
  const start = Date.now();
  try {

    const stripePromise = fetch('https://api.stripe.com', { method: 'HEAD' }).catch(() => null);
    const razorpayPromise = fetch('https://api.razorpay.com', { method: 'HEAD' }).catch(() => null);

    const [stripeRes, razorpayRes] = await Promise.all([stripePromise, razorpayPromise]);

    if (!stripeRes && !razorpayRes) {
      return {
        status: 'down',
        responseTimeMs: Date.now() - start,
        details: 'Both Stripe and Razorpay APIs are unreachable',
      };
    }

    const duration = Date.now() - start;
    const stripeStatus = stripeRes ? 'Stripe reachable' : 'Stripe unreachable';
    const razorpayStatus = razorpayRes ? 'Razorpay reachable' : 'Razorpay unreachable';

    return {
      status: stripeRes && razorpayRes ? 'ok' : 'degraded',
      responseTimeMs: duration,
      details: `${stripeStatus}, ${razorpayStatus}`,
    };
  } catch (error: any) {
    return {
      status: 'down',
      responseTimeMs: Date.now() - start,
      details: error.message || 'Reachability check failed',
    };
  }
};

export const checkDiskSpace = async (): Promise<{ status: string; details: string }> => {
  try {
    const stats = await fs.statfs('.');
    const totalSpace = stats.blocks * stats.bsize;
    const availableSpace = stats.bavail * stats.bsize;
    const usedSpace = totalSpace - availableSpace;
    const percentageUsed = totalSpace > 0 ? (usedSpace / totalSpace) * 100 : 0;

    const details = `Used: ${percentageUsed.toFixed(1)}% (Free: ${(availableSpace / (1024 * 1024 * 1024)).toFixed(2)} GB / Total: ${(totalSpace / (1024 * 1024 * 1024)).toFixed(2)} GB)`;

    return {
      status: percentageUsed > 90 ? 'degraded' : 'ok',
      details,
    };
  } catch (error: any) {
    return {
      status: 'degraded',
      details: `Failed to read disk space: ${error.message}`,
    };
  }
};
