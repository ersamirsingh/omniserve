import 'dotenv/config';
import dns from 'node:dns';
import { validateEnv, getEnv } from './src/config/env.config.js';
import { logger } from './src/utils/logger.js';

// try {
//   dns.setServers(['8.8.8.8', '1.1.1.1']);
// } catch (error) {
//   logger.warn('Unable to override DNS servers', { error });
// }

validateEnv();
const env = getEnv();

const bootstrap = async (): Promise<void> => {
  const [httpModule, { default: app }, { default: connectToMongoDB }, { default: connectRedis }, { initializeSocketServer }, { registerCronJobs }] =
    await Promise.all([
      import('node:http'),
      import('./src/app.js'),
      import('./src/config/db.config.js'),
      import('./src/config/redis.config.js'),
      import('./src/socket/socket.server.js'),
      import('./src/cron/register-cron.js'),
    ]);

  await connectToMongoDB();

  try {
    await connectRedis();
  } catch (error) {
    logger.warn('Dine-in Redis unavailable at startup. Continuing without Redis.', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const server = httpModule.createServer(app);
  initializeSocketServer(server);
  registerCronJobs();

  server.listen(env.PORT, () => {
    logger.info(`Dine-in service listening on port ${env.PORT}`);
  });
};

bootstrap().catch((error: unknown) => {
  logger.error('Dine-in bootstrap failed', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  process.exit(1);
});
