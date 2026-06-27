import { Request, Response } from "express";
import { Types } from "mongoose";
import { ReservationService } from "../services/dining/reservation.service.js";
import { ReservationStatus } from "../models/reservation.model.js";
import { ApiResponseHandler } from "../utils/response.handler.js";
import { resolveDiningContext } from "../utils/dining-helpers.js";

export class ReservationController {
  /**
   * POST /api/v1/reservations
   * Create a new reservation.
   * Body: { outletId, guestName, partySize, scheduledAt, guestPhone?, guestEmail?,
   *         tableId?, diningAreaId?, customerId?, specialRequests?, notes? }
   */
  static async createReservation(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = await resolveDiningContext(req);
      const userId = req.user?.userId ? new Types.ObjectId(String(req.user.userId)) : undefined;
      const {
        outletId, guestName, partySize, scheduledAt,
        guestPhone, guestEmail, tableId, diningAreaId,
        customerId, specialRequests, notes
      } = req.body;

      if (!outletId || !guestName || !partySize || !scheduledAt) {
        ApiResponseHandler.badRequest(res, "outletId, guestName, partySize, and scheduledAt are required");
        return;
      }

      const result = await ReservationService.createReservation(tenantId, {
        outletId: new Types.ObjectId(outletId),
        guestName,
        partySize: Number(partySize),
        scheduledAt: new Date(scheduledAt),
        ...(guestPhone && { guestPhone }),
        ...(guestEmail && { guestEmail }),
        ...(tableId && { tableId }),
        ...(diningAreaId && { diningAreaId }),
        ...(customerId && { customerId }),
        ...(specialRequests && { specialRequests }),
        ...(notes && { notes }),
        ...(userId && { createdBy: userId })
      });

      ApiResponseHandler.success(res, 201, "Reservation created successfully", result);
    } catch (error: any) {
      console.error("[ReservationController] createReservation error:", error);
      ApiResponseHandler.badRequest(res, error.message || "Failed to create reservation");
    }
  }

  /**
   * GET /api/v1/reservations
   * List reservations. Query: outletId, date?, status?, tableId?
   */
  static async getReservations(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, outletId } = await resolveDiningContext(req);
      const status = req.query.status as ReservationStatus | undefined;
      const tableId = req.query.tableId as string | undefined;
      const date = req.query.date ? new Date(String(req.query.date)) : undefined;

      const reservations = await ReservationService.getReservations(tenantId, outletId, {
        ...(date && { date }),
        ...(status && { status }),
        ...(tableId && { tableId })
      });

      ApiResponseHandler.success(res, 200, "Reservations retrieved", { count: reservations.length, reservations });
    } catch (error: any) {
      console.error("[ReservationController] getReservations error:", error);
      ApiResponseHandler.badRequest(res, error.message || "Failed to retrieve reservations");
    }
  }

  /**
   * POST /api/v1/reservations/:reservationId/confirm
   */
  static async confirmReservation(req: Request, res: Response): Promise<void> {
    try {
      const reservationId = String(req.params.reservationId || "");
      const { tenantId } = await resolveDiningContext(req);
      const userId = req.user?.userId ? new Types.ObjectId(String(req.user.userId)) : undefined;

      if (!reservationId || !Types.ObjectId.isValid(reservationId)) {
        ApiResponseHandler.badRequest(res, "A valid reservationId is required");
        return;
      }

      const result = await ReservationService.confirmReservation(tenantId, reservationId, userId);
      ApiResponseHandler.success(res, 200, "Reservation confirmed", result);
    } catch (error: any) {
      console.error("[ReservationController] confirmReservation error:", error);
      ApiResponseHandler.badRequest(res, error.message || "Failed to confirm reservation");
    }
  }

  /**
   * POST /api/v1/reservations/:reservationId/seat
   * Body: { tableId?, sessionId? }
   */
  static async seatReservation(req: Request, res: Response): Promise<void> {
    try {
      const reservationId = String(req.params.reservationId || "");
      const { tenantId } = await resolveDiningContext(req);
      const userId = req.user?.userId ? new Types.ObjectId(String(req.user.userId)) : undefined;
      const { tableId, sessionId } = req.body as { tableId?: string; sessionId?: string };

      if (!reservationId || !Types.ObjectId.isValid(reservationId)) {
        ApiResponseHandler.badRequest(res, "A valid reservationId is required");
        return;
      }

      const result = await ReservationService.seatReservation(tenantId, reservationId, {
        ...(tableId && { tableId }),
        ...(sessionId && { sessionId }),
        ...(userId && { updatedBy: userId })
      });
      ApiResponseHandler.success(res, 200, "Reservation seated", result);
    } catch (error: any) {
      console.error("[ReservationController] seatReservation error:", error);
      ApiResponseHandler.badRequest(res, error.message || "Failed to seat reservation");
    }
  }

  /**
   * POST /api/v1/reservations/:reservationId/no-show
   */
  static async markNoShow(req: Request, res: Response): Promise<void> {
    try {
      const reservationId = String(req.params.reservationId || "");
      const { tenantId } = await resolveDiningContext(req);
      const userId = req.user?.userId ? new Types.ObjectId(String(req.user.userId)) : undefined;

      if (!reservationId || !Types.ObjectId.isValid(reservationId)) {
        ApiResponseHandler.badRequest(res, "A valid reservationId is required");
        return;
      }

      const result = await ReservationService.markNoShow(tenantId, reservationId, userId);
      ApiResponseHandler.success(res, 200, "Reservation marked as no-show", result);
    } catch (error: any) {
      console.error("[ReservationController] markNoShow error:", error);
      ApiResponseHandler.badRequest(res, error.message || "Failed to mark no-show");
    }
  }

  /**
   * POST /api/v1/reservations/:reservationId/cancel
   * Body: { reason? }
   */
  static async cancelReservation(req: Request, res: Response): Promise<void> {
    try {
      const reservationId = String(req.params.reservationId || "");
      const { tenantId } = await resolveDiningContext(req);
      const userId = req.user?.userId ? new Types.ObjectId(String(req.user.userId)) : undefined;
      const { reason } = req.body as { reason?: string };

      if (!reservationId || !Types.ObjectId.isValid(reservationId)) {
        ApiResponseHandler.badRequest(res, "A valid reservationId is required");
        return;
      }

      const result = await ReservationService.cancelReservation(tenantId, reservationId, {
        ...(reason && { reason }),
        ...(userId && { updatedBy: userId })
      });
      ApiResponseHandler.success(res, 200, "Reservation cancelled", result);
    } catch (error: any) {
      console.error("[ReservationController] cancelReservation error:", error);
      ApiResponseHandler.badRequest(res, error.message || "Failed to cancel reservation");
    }
  }
}
