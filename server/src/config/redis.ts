import { createClient, RedisClientType } from 'redis';

let redisClient: RedisClientType | null = null;
let redisReady = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;


export function isRedisReady(): boolean {
  return redisReady && redisClient !== null && (redisClient as RedisClientType).isOpen;
}

export function getRedisClient(): RedisClientType | null {
  if (!isRedisReady()) return null;
  return redisClient as RedisClientType;
}

const connectRedis = async (): Promise<RedisClientType | null> => {
  if (redisClient && (redisClient as RedisClientType).isOpen) {
    return redisClient as RedisClientType;
  }
  if (!process.env.REDIS_PASSWORD || !process.env.REDIS_HOST || !process.env.REDIS_PORT) {
    console.warn('[Redis] Environment variables missing (REDIS_HOST / REDIS_PORT / REDIS_PASSWORD). Running without cache.');
    return null;
  }

  try {
    if (!redisClient) {
      redisClient = createClient({
        username: process.env.REDIS_USERNAME,
        password: process.env.REDIS_PASSWORD,
        socket: {
          host: process.env.REDIS_HOST,
          port: Number(process.env.REDIS_PORT),

          reconnectStrategy: (retries: number) => {
            reconnectAttempts = retries;
            if (retries >= MAX_RECONNECT_ATTEMPTS) {
              console.error(`[Redis] Giving up after ${MAX_RECONNECT_ATTEMPTS} reconnect attempts. Cache disabled.`);
              redisReady = false;
              return false; // stop reconnecting
            }
            const delay = Math.min(retries * 200, 5000); // cap at 5 s
            console.warn(`[Redis] Reconnecting in ${delay}ms (attempt ${retries + 1}/${MAX_RECONNECT_ATTEMPTS})...`);
            return delay;
          },
        },
      } as any);

      // ── Event Listeners ──────────────────────────────────────────────────────
      redisClient.on('error', (err: Error) => {
        console.error('[Redis] Client error:', err.message);
        redisReady = false;
      });

      redisClient.on('connect', () => {
        console.log('[Redis] TCP connection established.');
      });

      redisClient.on('ready', () => {
        reconnectAttempts = 0;
        redisReady = true;
        console.log('[Redis] Client ready — cache is active.');
      });

      redisClient.on('reconnecting', () => {
        redisReady = false;
        console.warn('[Redis] Attempting to reconnect...');
      });

      redisClient.on('end', () => {
        redisReady = false;
        console.warn('[Redis] Connection ended.');
      });
    }

    if (!(redisClient as RedisClientType).isOpen) {
      await (redisClient as RedisClientType).connect();
    }

    return redisClient as RedisClientType;
  } catch (err: any) {
    redisReady = false;
    console.error('[Redis] Initial connection failed:', err.message);
    console.warn('[Redis] Server will continue without cache (degraded mode).');
    return null;
  }
};

export default connectRedis;
