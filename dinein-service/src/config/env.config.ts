import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5100').transform(Number),
  CLIENT_URL: z.string().url().optional(),
  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
  REDIS_HOST: z.string().min(1, 'REDIS_HOST is required'),
  REDIS_PORT: z.string().default('6379'),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_USERNAME: z.string().default('default'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  QR_SECRET: z.string().min(16, 'QR_SECRET must be at least 16 characters'),
  QR_SESSION_TTL_MINUTES: z.string().default('120').transform(Number),
  DINEIN_CONSOLE_URL: z.string().default('http://localhost:5173'),
  MAIN_CLIENT_URL: z.string().default('http://localhost:5174'),
  RATE_LIMIT_WINDOW_MS: z.string().default('900000').transform(Number),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100').transform(Number),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_DIR: z.string().default('./logs'),
  SOCKET_CORS_ORIGIN: z.string().default('http://localhost:5173'),
});

type EnvShape = {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  CLIENT_URL?: string;
  MONGO_URI: string;
  REDIS_HOST: string;
  REDIS_PORT: string;
  REDIS_PASSWORD?: string;
  REDIS_USERNAME: string;
  JWT_SECRET: string;
  JWT_ACCESS_EXPIRY: string;
  JWT_REFRESH_EXPIRY: string;
  QR_SECRET: string;
  QR_SESSION_TTL_MINUTES: number;
  DINEIN_CONSOLE_URL: string;
  MAIN_CLIENT_URL: string;
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  LOG_LEVEL: 'error' | 'warn' | 'info' | 'debug';
  LOG_DIR: string;
  SOCKET_CORS_ORIGIN: string;
};

let env: EnvShape;

export const validateEnv = (): void => {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    console.error('[DineIn] ❌ Invalid environment variables:');
    result.error.issues.forEach((issue: { path: Array<string | number>; message: string }) => {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    });
    process.exit(1);
  }
  env = result.data;
  console.log('[DineIn] ✅ Environment variables validated');
};

export const getEnv = (): EnvShape => {
  if (!env) {
    throw new Error('Environment not initialized. Call validateEnv() first.');
  }
  return env;
};

export type Env = EnvShape;
