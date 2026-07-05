import { configDotenv } from 'dotenv';
configDotenv();

import dns from 'dns';
try {
   // Force public DNS resolvers to handle local ISP/DNS SRV query issues for MongoDB Atlas
   dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
   console.warn('Unable to set custom DNS servers, using system defaults:', e);
}

import http from 'http';
import app from './src/app.js';
import connectToMongoDB from './src/config/db.config.js';
import connectRedis from './src/config/redis.config.js';
import { OutboxPollerService } from './src/services/outbox-poller.service.js';
import { RealtimeService } from './src/services/realtime.service.js';
import { startWaiterTaskEscalationWorker } from './src/workers/waiter-task-escalation.worker.js';
import { startReservationHoldWorker } from './src/workers/reservation-hold.worker.js';

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

      // Wrap Express app in standard Node HTTP Server for Socket.IO support
      const server = http.createServer(app);

      // Initialize Socket.IO server and middlewares
      RealtimeService.initialize(server);

      server.listen(PORT, () => {
         console.log(`app listening on port ${PORT} with WebSockets enabled`);
      });
   }
   catch (error: unknown) {
      if(error instanceof Error) console.error('Server bootstrap failed:', error.message);
      process.exit(1);
   }
};

await bootstrap();  
