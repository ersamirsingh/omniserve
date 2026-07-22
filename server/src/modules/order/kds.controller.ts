import { Request, Response } from "express";
import { Types } from "mongoose";
import { CourseService, CourseType, KdsStation } from "./course.service.js";
import { ApiResponseHandler } from "../../utils/apiResponse.js";
import Outlet from "../../models/outlet.model.js";
import { AccessScope } from "../../utils/accessScope.utils.js";

export class KdsController {
  private static async resolveOutletId(tenantId: Types.ObjectId, req: Request): Promise<Types.ObjectId> {
    const rawId = req.user?.outletId || req.query.outletId || req.body?.outletId || req.headers["x-outlet-id"];
    if (rawId && Types.ObjectId.isValid(String(rawId))) {
      const oid = String(rawId);
      if (req.user && !(await AccessScope.canAccessOutlet(req.user, oid))) {
        throw new Error("Access denied: You cannot access KDS for this outlet");
      }
      return new Types.ObjectId(oid);
    }
    const allowed = req.user ? await AccessScope.outletIdsForUser(req.user) : null;
    const query: any = { tenantId, isDeleted: false };
    if (allowed && allowed.length > 0) {
      query._id = { $in: allowed.map(id => new Types.ObjectId(id)) };
    }
    const firstOutlet = await Outlet.findOne(query).select("_id");
    if (!firstOutlet) {
      throw new Error("No active outlets found for this tenant or role access level.");
    }
    return firstOutlet._id as Types.ObjectId;
  }

  static async getKdsQueue(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = new Types.ObjectId(String(req.user?.tenantId || req.headers["x-tenant-id"] || ""));
      const outletId = await KdsController.resolveOutletId(tenantId, req);

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

  static async holdItem(req: Request, res: Response): Promise<void> {
    try {
      const itemId = String(req.params.itemId || "");
      const tenantId = new Types.ObjectId(String(req.user?.tenantId || req.headers["x-tenant-id"] || ""));
      const outletId = await KdsController.resolveOutletId(tenantId, req);
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

  static async fireItem(req: Request, res: Response): Promise<void> {
    try {
      const itemId = String(req.params.itemId || "");
      const tenantId = new Types.ObjectId(String(req.user?.tenantId || req.headers["x-tenant-id"] || ""));
      const outletId = await KdsController.resolveOutletId(tenantId, req);
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

  static async fireCourse(req: Request, res: Response): Promise<void> {
    try {
      const orderId = String(req.params.orderId || "");
      const tenantId = new Types.ObjectId(String(req.user?.tenantId || req.headers["x-tenant-id"] || ""));
      const outletId = await KdsController.resolveOutletId(tenantId, req);
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
