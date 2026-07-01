import { Request, Response } from "express";
import { Types } from "mongoose";
import { CourseService, CourseType, KdsStation } from "../services/dining/course.service.js";
import { ApiResponseHandler } from "../utils/response.handler.js";

export class KdsController {
  /**
   * GET /api/v1/kds/queue
   * Returns all items in the KDS queue for an outlet.
   * Supports optional filtering by course, kdsStation, and holdStatus.
   */
  static async getKdsQueue(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = new Types.ObjectId(String(req.user?.tenantId || req.headers["x-tenant-id"] || ""));
      const outletId = new Types.ObjectId(String(req.user?.outletId || req.query.outletId || req.headers["x-outlet-id"] || ""));

      const course = req.query.course as CourseType | undefined;
      const kdsStation = req.query.kdsStation as KdsStation | undefined;
      const holdStatus = req.query.holdStatus as "HELD" | "FIRE_REQUESTED" | "FIRED" | undefined;

      const queue = await CourseService.getKdsQueue(tenantId, outletId, {
        ...(course && { course }),
        ...(kdsStation && { kdsStation }),
        ...(holdStatus && { holdStatus })
      });

      ApiResponseHandler.success(res, 200, "KDS queue retrieved successfully", {
        count: queue.length,
        items: queue
      });
    } catch (error: any) {
      console.error("[KdsController] getKdsQueue error:", error);
      ApiResponseHandler.badRequest(res, error.message || "Failed to retrieve KDS queue");
    }
  }

  /**
   * POST /api/v1/kds/items/:itemId/hold
   * Hold a specific order item — prevents it from being sent to KDS.
   */
  static async holdItem(req: Request, res: Response): Promise<void> {
    try {
      const itemId = String(req.params.itemId || "");
      const tenantId = new Types.ObjectId(String(req.user?.tenantId || req.headers["x-tenant-id"] || ""));
      const outletId = new Types.ObjectId(String(req.user?.outletId || req.body.outletId || req.headers["x-outlet-id"] || ""));
      const userId = req.user?.userId ? new Types.ObjectId(String(req.user.userId)) : undefined;

      if (!itemId || !Types.ObjectId.isValid(itemId)) {
        ApiResponseHandler.badRequest(res, "A valid itemId parameter is required");
        return;
      }

      const result = await CourseService.holdItem(tenantId, outletId, itemId, userId);

      ApiResponseHandler.success(res, 200, "Item held successfully", result);
    } catch (error: any) {
      console.error("[KdsController] holdItem error:", error);
      ApiResponseHandler.badRequest(res, error.message || "Failed to hold item");
    }
  }

  /**
   * POST /api/v1/kds/items/:itemId/fire
   * Fire a specific order item — marks it FIRED and sends it to the KDS.
   * Optionally assign a kdsStation.
   */
  static async fireItem(req: Request, res: Response): Promise<void> {
    try {
      const itemId = String(req.params.itemId || "");
      const tenantId = new Types.ObjectId(String(req.user?.tenantId || req.headers["x-tenant-id"] || ""));
      const outletId = new Types.ObjectId(String(req.user?.outletId || req.body.outletId || req.headers["x-outlet-id"] || ""));
      const userId = req.user?.userId ? new Types.ObjectId(String(req.user.userId)) : undefined;
      const kdsStation = req.body.kdsStation as KdsStation | undefined;

      if (!itemId || !Types.ObjectId.isValid(itemId)) {
        ApiResponseHandler.badRequest(res, "A valid itemId parameter is required");
        return;
      }

      const result = await CourseService.fireItem(tenantId, outletId, itemId, kdsStation, userId);

      ApiResponseHandler.success(res, 200, "Item fired to KDS successfully", result);
    } catch (error: any) {
      console.error("[KdsController] fireItem error:", error);
      ApiResponseHandler.badRequest(res, error.message || "Failed to fire item");
    }
  }

  /**
   * POST /api/v1/kds/orders/:orderId/fire-course
   * Fire all HELD items for a specific course on an order — batch operation.
   * Body: { course: "STARTERS" | "MAINS" | "DESSERTS" | "IMMEDIATE", kdsStation? }
   */
  static async fireCourse(req: Request, res: Response): Promise<void> {
    try {
      const orderId = String(req.params.orderId || "");
      const tenantId = new Types.ObjectId(String(req.user?.tenantId || req.headers["x-tenant-id"] || ""));
      const outletId = new Types.ObjectId(String(req.user?.outletId || req.body.outletId || req.headers["x-outlet-id"] || ""));
      const userId = req.user?.userId ? new Types.ObjectId(String(req.user.userId)) : undefined;
      const { course, kdsStation } = req.body as { course: CourseType; kdsStation?: KdsStation };

      if (!orderId || !Types.ObjectId.isValid(orderId)) {
        ApiResponseHandler.badRequest(res, "A valid orderId parameter is required");
        return;
      }

      if (!course) {
        ApiResponseHandler.badRequest(res, "course is required in request body");
        return;
      }

      const result = await CourseService.fireCourse(tenantId, outletId, orderId, course, kdsStation, userId);

      ApiResponseHandler.success(res, 200, `Course "${course}" fired to KDS successfully`, result);
    } catch (error: any) {
      console.error("[KdsController] fireCourse error:", error);
      ApiResponseHandler.badRequest(res, error.message || "Failed to fire course");
    }
  }

  /**
   * PATCH /api/v1/kds/items/:itemId/station
   * Update the KDS station assignment for a specific item.
   * Body: { kdsStation: "HOT" | "COLD" | "BAR" | "GRILL" | "SALAD" | "PASTRY" | "GENERAL" }
   */
  static async updateKdsStation(req: Request, res: Response): Promise<void> {
    try {
      const itemId = String(req.params.itemId || "");
      const tenantId = new Types.ObjectId(String(req.user?.tenantId || req.headers["x-tenant-id"] || ""));
      const { kdsStation } = req.body as { kdsStation: KdsStation };

      if (!itemId || !Types.ObjectId.isValid(itemId)) {
        ApiResponseHandler.badRequest(res, "A valid itemId parameter is required");
        return;
      }

      if (!kdsStation) {
        ApiResponseHandler.badRequest(res, "kdsStation is required in request body");
        return;
      }

      await CourseService.updateKdsStation(tenantId, itemId, kdsStation);

      ApiResponseHandler.success(res, 200, "KDS station updated successfully", { itemId, kdsStation });
    } catch (error: any) {
      console.error("[KdsController] updateKdsStation error:", error);
      ApiResponseHandler.badRequest(res, error.message || "Failed to update KDS station");
    }
  }
}
