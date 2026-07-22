import { Request, Response } from "express";
import { Types } from "mongoose";
import { DiningAnalyticsService } from "./dining-analytics.service.js";
import { ApiResponseHandler } from "../../utils/apiResponse.js";
import { resolveDiningContext } from "../order/order.utils.js";

export class DiningAnalyticsController {

  static async getSummary(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, outletId } = await resolveDiningContext(req);

      const rawFrom = req.query.from ? new Date(String(req.query.from)) : (() => {
        const d = new Date(); d.setUTCHours(0, 0, 0, 0); return d;
      })();
      const rawTo = req.query.to ? new Date(String(req.query.to)) : (() => {
        const d = new Date(); d.setUTCHours(23, 59, 59, 999); return d;
      })();

      if (isNaN(rawFrom.getTime()) || isNaN(rawTo.getTime())) {
        ApiResponseHandler.badRequest(res, "Invalid date range. Use ISO 8601 format (e.g. 2026-06-27)");
        return;
      }

      const summary = await DiningAnalyticsService.getSummary(tenantId, outletId, rawFrom, rawTo);
      ApiResponseHandler.success(res, 200, "Dining analytics summary retrieved", summary);
    } catch (error: any) {
      console.error("[DiningAnalyticsController] getSummary error:", error);
      ApiResponseHandler.badRequest(res, error.message || "Failed to retrieve dining analytics");
    }
  }
}
