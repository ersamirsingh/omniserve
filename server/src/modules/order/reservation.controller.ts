import { Request, Response } from "express";
import { Types } from "mongoose";
import { ReservationService } from "./reservation.service.js";
import { ReservationStatus } from "../../models/reservation.model.js";
import { ApiResponseHandler } from "../../utils/apiResponse.js";
import { resolveDiningContext } from "./order.utils.js";
import { AccessScope } from "../../utils/accessScope.utils.js";

export class ReservationController {

  static async createReservation(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = await resolveDiningContext(req);
      const userId = req.user?.userId ? new Types.ObjectId(String(req.user.userId)) : undefined;
      const {
        outletId, guestName, partySize, scheduledAt,
        guestPhone, guestEmail, tableId, diningAreaId,
        customerId, specialRequests, notes, seatNumber
      } = req.body;

      if (!outletId || !guestName || !partySize || !scheduledAt) {
        ApiResponseHandler.badRequest(res, "outletId, guestName, partySize, and scheduledAt are required");
        return;
      }

      if (req.user) {
        const canAccess = await AccessScope.canAccessOutlet(req.user, String(outletId));
        if (!canAccess) {
          ApiResponseHandler.forbidden(res, "Access denied: You cannot create reservations for this outlet");
          return;
        }
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
        ...(seatNumber && { seatNumber }),
        ...(userId && { createdBy: userId }),
        ipAddress: req.ip || "unknown"
      });

      ApiResponseHandler.success(res, 201, "Reservation created successfully", result);
    } catch (error: any) {
      console.error("[ReservationController] createReservation error:", error);
      ApiResponseHandler.badRequest(res, error.message || "Failed to create reservation");
    }
  }

  static async getReservations(req: Request, res: Response): Promise<void> {
    try {
      const context = await resolveDiningContext(req);
      const tenantId = context.tenantId;

      const reqOutletId = req.query.outletId as string | undefined || req.headers["x-outlet-id"] as string | undefined;

      let targetOutletId: Types.ObjectId | undefined;
      let targetOutletIds: Types.ObjectId[] | undefined;

      if (reqOutletId && Types.ObjectId.isValid(reqOutletId)) {
        if (req.user && !(await AccessScope.canAccessOutlet(req.user, reqOutletId))) {
          ApiResponseHandler.forbidden(res, "Access denied: You cannot view reservations for this outlet");
          return;
        }
        targetOutletId = new Types.ObjectId(reqOutletId);
      } else if (req.user) {
        const allowedIds = await AccessScope.outletIdsForUser(req.user);
        if (allowedIds !== null) {
          if (allowedIds.length === 1) {
            const firstId = allowedIds[0];
            if (firstId) targetOutletId = new Types.ObjectId(firstId);
          } else if (allowedIds.length > 1) {
            targetOutletIds = allowedIds.map(id => new Types.ObjectId(id));
          } else {

            ApiResponseHandler.success(res, 200, "Reservations retrieved", { count: 0, reservations: [] });
            return;
          }
        }
      } else if (context.outletId) {
        targetOutletId = context.outletId;
      }

      const status = req.query.status as ReservationStatus | undefined;
      const tableId = req.query.tableId as string | undefined;
      const date = req.query.date ? new Date(String(req.query.date)) : undefined;

      const reservations = await ReservationService.getReservations(tenantId, targetOutletId, {
        ...(date && { date }),
        ...(status && { status }),
        ...(tableId && { tableId }),
        ...(targetOutletIds && { outletIds: targetOutletIds })
      });

      ApiResponseHandler.success(res, 200, "Reservations retrieved", { count: reservations.length, reservations });
    } catch (error: any) {
      console.error("[ReservationController] getReservations error:", error);
      ApiResponseHandler.badRequest(res, error.message || "Failed to retrieve reservations");
    }
  }

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
