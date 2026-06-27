import DineInSession from '../models/dinein-session.model.js';
import { SessionStatus } from '../constants/table-states.constants.js';
import { logger } from '../utils/logger.js';

export const autoCloseSessionsJob = async (): Promise<void> => {
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

  const result = await DineInSession.updateMany(
    {
      status: { $in: [SessionStatus.ACTIVE, SessionStatus.ORDERING, SessionStatus.BILLED] },
      openedAt: { $lte: sixHoursAgo },
      closedAt: null,
    },
    {
      $set: {
        status: SessionStatus.ABANDONED,
        abandonedAt: new Date(),
      },
    }
  );

  if (result.modifiedCount > 0) {
    logger.info('Auto-closed abandoned sessions', { modifiedCount: result.modifiedCount });
  }
};
