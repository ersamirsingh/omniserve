import 'dotenv/config';
import dns from 'node:dns';
import http from 'node:http';
import app from './src/app.js';
import connectToMongoDB from './src/config/db.config.js';
import connectRedis from './src/config/redis.config.js';
import { validateEnv, getEnv } from './src/config/env.config.js';
import { logger } from './src/utils/logger.js';
import { initializeSocketServer } from './src/socket/socket.server.js';
import { registerCronJobs } from './src/cron/register-cron.js';

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (error) {
  logger.warn('Unable to override DNS servers', { error });
}

validateEnv();
const env = getEnv();

const bootstrap = async (): Promise<void> => {
  await Promise.all([connectToMongoDB(), connectRedis()]);

  const server = http.createServer(app);
  initializeSocketServer(server);
  registerCronJobs();

  server.listen(env.PORT, () => {
    logger.info(`Dine-in service listening on port ${env.PORT}`);
  });
};

bootstrap().catch((error: unknown) => {
  logger.error('Dine-in bootstrap failed', { error });
  process.exit(1);
});
