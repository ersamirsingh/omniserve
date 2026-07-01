import { Request, Response } from "express";
import { Types } from "mongoose";
import { BillingService, SplitType } from "../services/dining/billing.service.js";
import { ApiResponseHandler } from "../utils/response.handler.js";

export class BillingController {
  /**
   * POST /api/v1/billing/sessions/:sessionId/request
   * Request the bill for a QR session. Computes totals from all orders.
   * Body: { discount?, tip?, notes?, outletId? }
   */
  static async requestBill(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = String(req.params.sessionId || "");
      const tenantId = new Types.ObjectId(String(req.user?.tenantId || req.headers["x-tenant-id"] || ""));
      const outletId = new Types.ObjectId(String(req.user?.outletId || req.body.outletId || req.headers["x-outlet-id"] || ""));
      const userId = req.user?.userId ? new Types.ObjectId(String(req.user.userId)) : undefined;
      const { discount, tip, notes } = req.body as {
        discount?: number;
        tip?: number;
        notes?: string;
      };

      if (!sessionId || !Types.ObjectId.isValid(sessionId)) {
        ApiResponseHandler.badRequest(res, "A valid sessionId parameter is required");
        return;
      }

      const result = await BillingService.requestBill(tenantId, outletId, sessionId, {
        ...(discount !== undefined && { discount }),
        ...(tip !== undefined && { tip }),
        ...(notes !== undefined && { notes }),
        ...(userId !== undefined && { requestedBy: userId })
      });

      ApiResponseHandler.success(res, 200, "Bill requested successfully", result);
    } catch (error: any) {
      console.error("[BillingController] requestBill error:", error);
      ApiResponseHandler.badRequest(res, error.message || "Failed to request bill");
    }
  }

  /**
   * POST /api/v1/billing/:billSessionId/split
   * Split the bill using a given strategy.
   * Body: { splitType: "EQUAL" | "BY_SEAT" | "CUSTOM", customSplits?: [...] }
   */
  static async splitBill(req: Request, res: Response): Promise<void> {
    try {
      const billSessionId = String(req.params.billSessionId || "");
      const tenantId = new Types.ObjectId(String(req.user?.tenantId || req.headers["x-tenant-id"] || ""));
      const outletId = new Types.ObjectId(String(req.user?.outletId || req.body.outletId || req.headers["x-outlet-id"] || ""));
      const { splitType, customSplits } = req.body as {
        splitType: SplitType;
        customSplits?: Array<{ seatNumber?: string; customerId?: string; amount: number }>;
      };

      if (!billSessionId || !Types.ObjectId.isValid(billSessionId)) {
        ApiResponseHandler.badRequest(res, "A valid billSessionId parameter is required");
        return;
      }

      if (!splitType) {
        ApiResponseHandler.badRequest(res, "splitType is required");
        return;
      }

      const result = await BillingService.splitBill(tenantId, outletId, billSessionId, splitType, customSplits);

      ApiResponseHandler.success(res, 200, "Bill split created successfully", result);
    } catch (error: any) {
      console.error("[BillingController] splitBill error:", error);
      ApiResponseHandler.badRequest(res, error.message || "Failed to split bill");
    }
  }

  /**
   * POST /api/v1/billing/:billSessionId/settle
   * Settle the bill (or a specific seat's portion).
   * Body: { seatNumber?, paymentId? }
   */
  static async settleBill(req: Request, res: Response): Promise<void> {
    try {
      const billSessionId = String(req.params.billSessionId || "");
      const tenantId = new Types.ObjectId(String(req.user?.tenantId || req.headers["x-tenant-id"] || ""));
      const outletId = new Types.ObjectId(String(req.user?.outletId || req.body.outletId || req.headers["x-outlet-id"] || ""));
      const userId = req.user?.userId ? new Types.ObjectId(String(req.user.userId)) : undefined;
      const { seatNumber, paymentId } = req.body as {
        seatNumber?: string;
        paymentId?: string;
      };

      if (!billSessionId || !Types.ObjectId.isValid(billSessionId)) {
        ApiResponseHandler.badRequest(res, "A valid billSessionId parameter is required");
        return;
      }

      const result = await BillingService.settleBill(tenantId, outletId, billSessionId, {
        ...(seatNumber !== undefined && { seatNumber }),
        ...(paymentId !== undefined && { paymentId }),
        ...(userId !== undefined && { settledBy: userId })
      });

      ApiResponseHandler.success(res, 200, "Bill settled successfully", result);
    } catch (error: any) {
      console.error("[BillingController] settleBill error:", error);
      ApiResponseHandler.badRequest(res, error.message || "Failed to settle bill");
    }
  }

  /**
   * GET /api/v1/billing/sessions/:sessionId
   * Retrieve the full bill for a QR session (including splits and itemized breakdown).
   */
  static async getSessionBill(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = String(req.params.sessionId || "");
      const tenantId = new Types.ObjectId(String(req.user?.tenantId || req.headers["x-tenant-id"] || ""));

      if (!sessionId || !Types.ObjectId.isValid(sessionId)) {
        ApiResponseHandler.badRequest(res, "A valid sessionId parameter is required");
        return;
      }

      const result = await BillingService.getSessionBill(tenantId, sessionId);

      ApiResponseHandler.success(res, 200, "Session bill retrieved successfully", result);
    } catch (error: any) {
      console.error("[BillingController] getSessionBill error:", error);
      ApiResponseHandler.badRequest(res, error.message || "Failed to retrieve session bill");
    }
  }
}
