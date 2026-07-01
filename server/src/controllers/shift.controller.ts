import { Request, Response } from "express";
import { Types } from "mongoose";
import { ShiftService } from "../services/dining/shift.service.js";
import { ShiftName } from "../models/shift.model.js";
import { ApiResponseHandler } from "../utils/response.handler.js";
import { resolveDiningContext } from "../utils/dining-helpers.js";

export class ShiftController {
  /**
   * POST /api/v1/shifts/open
   * Body: { outletId, shiftName: "MORNING"|"AFTERNOON"|"EVENING"|"NIGHT" }
   */
  static async openShift(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, outletId } = await resolveDiningContext(req);
      const userId = new Types.ObjectId(String(req.user?.userId || ""));
      const { shiftName } = req.body as { shiftName: ShiftName };

      if (!shiftName) {
        ApiResponseHandler.badRequest(res, "shiftName is required (MORNING | AFTERNOON | EVENING | NIGHT)");
        return;
      }

      const result = await ShiftService.openShift(tenantId, outletId, shiftName, userId);
      ApiResponseHandler.success(res, 201, "Shift opened successfully", result);
    } catch (error: any) {
      console.error("[ShiftController] openShift error:", error);
      ApiResponseHandler.badRequest(res, error.message || "Failed to open shift");
    }
  }

  /**
   * POST /api/v1/shifts/:shiftId/close
   * Body: { outletId?, handoverNotes? }
   */
  static async closeShift(req: Request, res: Response): Promise<void> {
    try {
      const shiftId = String(req.params.shiftId || "");
      const { tenantId, outletId } = await resolveDiningContext(req);
      const userId = new Types.ObjectId(String(req.user?.userId || ""));
      const { handoverNotes } = req.body as { handoverNotes?: string };

      if (!shiftId || !Types.ObjectId.isValid(shiftId)) {
        ApiResponseHandler.badRequest(res, "A valid shiftId parameter is required");
        return;
      }

      const result = await ShiftService.closeShift(tenantId, outletId, shiftId, userId, handoverNotes);
      ApiResponseHandler.success(res, 200, "Shift closed successfully", result);
    } catch (error: any) {
      console.error("[ShiftController] closeShift error:", error);
      ApiResponseHandler.badRequest(res, error.message || "Failed to close shift");
    }
  }

  /**
   * GET /api/v1/shifts/current
   * Returns the currently open shift for the outlet.
   */
  static async getCurrentShift(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, outletId } = await resolveDiningContext(req);

      const shift = await ShiftService.getCurrentShift(tenantId, outletId);
      ApiResponseHandler.success(res, 200, "Current shift retrieved", shift ?? null);
    } catch (error: any) {
      console.error("[ShiftController] getCurrentShift error:", error);
      ApiResponseHandler.badRequest(res, error.message || "Failed to get current shift");
    }
  }

  /**
   * GET /api/v1/shifts/history
   * Returns recent shift history for the outlet.
   * Query: outletId?, limit?
   */
  static async getShiftHistory(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, outletId } = await resolveDiningContext(req);
      const limit = Math.min(parseInt(String(req.query.limit || "20"), 10), 100);

      const history = await ShiftService.getShiftHistory(tenantId, outletId, limit);
      ApiResponseHandler.success(res, 200, "Shift history retrieved", { count: history.length, shifts: history });
    } catch (error: any) {
      console.error("[ShiftController] getShiftHistory error:", error);
      ApiResponseHandler.badRequest(res, error.message || "Failed to get shift history");
    }
  }
}
