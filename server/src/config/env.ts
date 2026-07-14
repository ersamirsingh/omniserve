import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('5000'),
  MONGO_URI: z.string(),
  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string().default('1d'),
  REDIS_URL: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string(),

CLOUDINARY_API_KEY: z.string(),

CLOUDINARY_API_SECRET: z.string(),
});

export const env = envSchema.parse(process.env);
