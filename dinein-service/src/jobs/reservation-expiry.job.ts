import DineInReservation from '../models/dinein-reservation.model.js';
import { ReservationStatus } from '../constants/table-states.constants.js';
import { logger } from '../utils/logger.js';

export const expireReservationsJob = async (): Promise<void> => {
  const now = new Date();
  const result = await DineInReservation.updateMany(
    {
      status: { $in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED] },
      expiresAt: { $lte: now },
    },
    {
      $set: {
        status: ReservationStatus.EXPIRED,
      },
    }
  );

  if (result.modifiedCount > 0) {
    logger.info('Expired reservations', { modifiedCount: result.modifiedCount });
  }
};
