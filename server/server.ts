import 'dotenv/config';

import dns from 'dns';
try {
   // Force public DNS resolvers to handle local ISP/DNS SRV query issues for MongoDB Atlas
   dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
   console.warn('Unable to set custom DNS servers, using system defaults:', e);
}

import http from 'http';
import app from './src/app.js';
import connectToMongoDB from './src/config/db.js';
import connectRedis from './src/config/redis.js';
import { OutboxPollerService } from './src/modules/integration/outbox-poller.service.js';
import { RealtimeService } from './src/sockets/realtime.service.js';
import { startWaiterTaskEscalationWorker, stopWaiterTaskEscalationWorker } from './src/jobs/waiter-task-escalation.worker.js';
import { startReservationHoldWorker } from './src/jobs/reservation-hold.worker.js';
import { startSubscriptionBillingWorkers } from './src/jobs/subscription.job.js';

const PORT = process.env.PORT || 5000;

const bootstrap = async () => {
   try {
      await Promise.all([connectToMongoDB(), connectRedis()]);

      // Start outbox poller
      OutboxPollerService.start();

      // Start SLA Escalation Checker background worker
      startWaiterTaskEscalationWorker();

      // Start Reservation Hold Window worker
      startReservationHoldWorker();

      // Start SaaS Subscription Billing checks worker
      startSubscriptionBillingWorkers();

      // Wrap Express app in standard Node HTTP Server for Socket.IO support
      const server = http.createServer(app);

      // Initialize Socket.IO server and middlewares
      RealtimeService.initialize(server);

      server.listen(PORT, () => {
         console.log(`app listening on port ${PORT} with WebSockets enabled`);
      });

      // Graceful shutdown sequence
      const gracefulShutdown = async (signal: string) => {
         console.log(`\n[Server] Received ${signal}. Starting graceful shutdown...`);
         
         // 1. Stop background workers
         console.log('[Server] Stopping background daemon workers...');
         OutboxPollerService.stop();
         try {
            stopWaiterTaskEscalationWorker();
         } catch (e: any) {
            console.error('[Server] Error stopping waiter task worker:', e.message);
         }

         // 2. Stop accepting new HTTP/Socket connections
         server.close(async () => {
            console.log('[Server] HTTP and Socket.IO server stopped accepting connections.');
            try {
               // 3. Close Mongoose/MongoDB connections
               const mongoose = (await import('mongoose')).default;
               await mongoose.connection.close();
               console.log('[Server] MongoDB connection closed.');

               // 4. Close Redis connections
               const redisClient = await connectRedis();
               if (redisClient && redisClient.isOpen) {
                  await redisClient.quit();
                  console.log('[Server] Redis connection closed.');
               }
            } catch (err: any) {
               console.error('[Server] Error during connection cleanup:', err.message);
            }
            console.log('[Server] Graceful shutdown completed.');
            process.exit(0);
         });

         // Force exit if shutdown hangs longer than 10 seconds
         setTimeout(() => {
            console.error('[Server] Forcefully shutting down because graceful shutdown timed out.');
            process.exit(1);
         }, 10000);
      };

      process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
      process.on('SIGINT', () => gracefulShutdown('SIGINT'));
   }
   catch (error: unknown) {
      if(error instanceof Error) console.error('Server bootstrap failed:', error.message);
      process.exit(1);
   }
};

await bootstrap();  
