import { Router } from "express";
import { ReservationController } from "./reservation.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";

const router = Router();

/** GET  /api/v1/reservations — list reservations (query: outletId, date?, status?, tableId?) */
router.get("/", verifyToken, ReservationController.getReservations);

/** POST /api/v1/reservations — create a new reservation */
router.post("/", verifyToken, ReservationController.createReservation);

/** POST /api/v1/reservations/:reservationId/confirm */
router.post("/:reservationId/confirm", verifyToken, ReservationController.confirmReservation);

/** POST /api/v1/reservations/:reservationId/seat */
router.post("/:reservationId/seat", verifyToken, ReservationController.seatReservation);

/** POST /api/v1/reservations/:reservationId/no-show */
router.post("/:reservationId/no-show", verifyToken, ReservationController.markNoShow);

/** POST /api/v1/reservations/:reservationId/cancel */
router.post("/:reservationId/cancel", verifyToken, ReservationController.cancelReservation);

export default router;
