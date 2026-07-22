import { Router } from "express";
import { ReservationController } from "./reservation.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";

const router = Router();

router.get("/", verifyToken, ReservationController.getReservations);

router.post("/", verifyToken, ReservationController.createReservation);

router.post("/:reservationId/confirm", verifyToken, ReservationController.confirmReservation);

router.post("/:reservationId/seat", verifyToken, ReservationController.seatReservation);

router.post("/:reservationId/no-show", verifyToken, ReservationController.markNoShow);

router.post("/:reservationId/cancel", verifyToken, ReservationController.cancelReservation);

export default router;
