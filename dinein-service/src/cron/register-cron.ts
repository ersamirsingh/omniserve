import cron from 'node-cron';
import { expireReservationsJob } from '../jobs/reservation-expiry.job.js';
import { autoCloseSessionsJob } from '../jobs/session-auto-close.job.js';
import { logger } from '../utils/logger.js';

export const registerCronJobs = (): void => {
  cron.schedule('*/5 * * * *', () => {
    void expireReservationsJob().catch((error: unknown) => {
      logger.error('Reservation expiry job failed', { error });
    });
  });

  cron.schedule('*/15 * * * *', () => {
    void autoCloseSessionsJob().catch((error: unknown) => {
      logger.error('Session auto-close job failed', { error });
    });
  });
};
