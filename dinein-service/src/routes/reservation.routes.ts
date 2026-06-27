import { Router } from 'express';
import {
  cancelReservation,
  confirmReservation,
  createReservation,
  listReservations,
} from '../controllers/reservation.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  cancelReservationSchema,
  confirmReservationSchema,
  createReservationSchema,
} from '../validators/reservation.validators.js';

const router = Router();

router.get('/', listReservations);
router.post('/', validate(createReservationSchema), createReservation);
router.patch('/:reservationId/confirm', validate(confirmReservationSchema), confirmReservation);
router.patch('/:reservationId/cancel', validate(cancelReservationSchema), cancelReservation);

export default router;
