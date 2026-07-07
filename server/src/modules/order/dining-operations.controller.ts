import { Request, Response } from "express";
import mongoose, { Types } from "mongoose";
import { RestaurantOperationsService } from "./restaurant-operations.service.js";
import Table from "../../models/table.model.js";
import QRSession from "../../models/qrsession.model.js";
import OrderTimeline from "../../models/ordertimeline.model.js";
import WaiterTask from "../../models/waitertask.model.js";
import { ApiResponseHandler } from "../../utils/apiResponse.js";
import { resolveDiningContext } from "./order.utils.js";
import { DiningAreaService } from "../outlet/dining-area.service.js";
import { TableService } from "../outlet/table.service.js";

export class DiningOperationsController {
  /**
   * POST /api/v1/dining/operations
   * Executes a restaurant operational command (e.g. TRANSFER_TABLE, MERGE_TABLE, etc.)
   */
  static async executeOperation(req: Request, res: Response): Promise<void> {
    try {
      const { operationType, payload } = req.body;
      const triggeredById = req.user?.userId || req.body.triggeredById;

      if (!operationType || !payload) {
        ApiResponseHandler.badRequest(res, "Missing operationType or payload parameters");
        return;
      }

      const { tenantId, outletId } = await resolveDiningContext(req);

      const result = await RestaurantOperationsService.executeOperation({
        tenantId,
        outletId,
        operationType,
        payload,
        triggeredById
      });

      ApiResponseHandler.success(res, 200, "Operation executed successfully", result);
    } catch (error: any) {
      console.error("[DiningOperationsController] executeOperation error:", error);
      ApiResponseHandler.badRequest(res, error.message || "Failed to execute operation");
    }
  }

  /**
   * PUT /api/v1/dining/tables/layout
   * Batch updates table layout coordinates for the floor designer
   */
  static async updateTablesLayout(req: Request, res: Response): Promise<void> {
    try {
      const { tables } = req.body;

      if (!tables || !Array.isArray(tables)) {
        ApiResponseHandler.badRequest(res, "Missing or invalid tables array parameter");
        return;
      }

      const { tenantId } = await resolveDiningContext(req);
      const updatedTableIds: string[] = [];

      for (const tableData of tables) {
        const { tableId, layout } = tableData;
        if (!tableId || !layout) continue;

        const table = await Table.findOneAndUpdate(
          { _id: new Types.ObjectId(tableId), tenantId, isDeleted: false },
          { $set: { layout, sourceSystem: 'QR' } },
          { new: true }
        );

        if (table) {
          updatedTableIds.push(table._id.toString());
        }
      }

      ApiResponseHandler.success(res, 200, "Table layouts updated successfully", {
        updatedTableIds
      });
    } catch (error: any) {
      console.error("[DiningOperationsController] updateTablesLayout error:", error);
      ApiResponseHandler.badRequest(res, error.message || "Failed to update layouts");
    }
  }

  /**
   * POST /api/v1/dining/tables/:tableId/rotate-qr
   * Rotates the QR code token for a table and isolates any active session.
   */
  static async rotateTableQrToken(req: Request, res: Response): Promise<void> {
    try {
      const tableId = req.params.tableId as string;
      const { tenantId, outletId } = await resolveDiningContext(req);
      const triggeredById = req.user?.userId;

      const table = await TableService.rotateQrToken(tenantId, outletId, tableId, triggeredById);

      ApiResponseHandler.success(res, 200, "Table QR token rotated successfully", {
        tableId: table._id,
        qrToken: table.qrToken,
      });
    } catch (error: any) {
      console.error("[DiningOperationsController] rotateTableQrToken error:", error);
      ApiResponseHandler.badRequest(res, error.message || "Failed to rotate QR token");
    }
  }

  /**
   * GET /api/v1/dining/timeline/:sessionId
   * Retrieves unified chronological activity timeline merging Table, Order, and Waiter tasks
   */
  static async getUnifiedTimeline(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = String(req.params.sessionId || "");
      const tenantIdStr = String(req.user?.tenantId || req.query.tenantId || req.headers["x-tenant-id"] || "") as string;

      if (!sessionId || !Types.ObjectId.isValid(sessionId)) {
        ApiResponseHandler.badRequest(res, "A valid sessionId parameter is required");
        return;
      }

      if (!tenantIdStr) {
        ApiResponseHandler.badRequest(res, "Tenant ID is required context parameter");
        return;
      }

      const tenantId = new Types.ObjectId(tenantIdStr);

      // 1. Fetch OrderTimeline events
      const orderTimelines = await OrderTimeline.find({
        tenantId,
        qrsessionId: new Types.ObjectId(sessionId),
        isDeleted: false
      });

      // 2. Fetch WaiterTasks for the session
      const waiterTasks = await WaiterTask.find({
        tenantId,
        sessionId: new Types.ObjectId(sessionId),
        isDeleted: false
      });

      interface IUnifiedActivity {
        timestamp: Date;
        type: "TABLE" | "ORDER" | "WAITER_TASK";
        status: string;
        notes: string;
        metadata: any;
      }

      const activityFeed: IUnifiedActivity[] = [];

      // Map Order & Table events from OrderTimeline
      for (const ot of orderTimelines) {
        let eventType: "TABLE" | "ORDER" = "ORDER";
        const isTableEvent = [
          "TABLE_TRANSFERRED",
          "TABLE_MERGED",
          "TABLE_UNMERGED",
          "SEAT_MOVED",
          "SEAT_SWAPPED",
          "SEAT_ADDED",
          "SEAT_REMOVED",
          "GUEST_COUNT_CHANGED",
          "WAITER_CHANGED",
          "SESSION_CLOSED"
        ].includes(ot.status);

        if (isTableEvent) {
          eventType = "TABLE";
        }

        activityFeed.push({
          timestamp: ot.timestamp || ot.createdAt,
          type: eventType,
          status: ot.status,
          notes: ot.notes || `${eventType === "TABLE" ? "Table" : "Order"} transitioned to status ${ot.status}`,
          metadata: ot.audit || {}
        });
      }

      // Map WaiterTask transitions
      for (const task of waiterTasks) {
        if (task.createdAt) {
          activityFeed.push({
            timestamp: task.createdAt,
            type: "WAITER_TASK",
            status: `${task.taskType}_CREATED`,
            notes: `Waiter task of type ${task.taskType} created. Priority: ${task.priority}`,
            metadata: { taskId: task._id, source: task.source }
          });
        }
        if (task.assignedAt) {
          activityFeed.push({
            timestamp: task.assignedAt,
            type: "WAITER_TASK",
            status: `${task.taskType}_ASSIGNED`,
            notes: `Waiter task assigned to waiter`,
            metadata: { taskId: task._id, waiterId: task.assignedWaiterId }
          });
        }
        if (task.acknowledgedAt) {
          activityFeed.push({
            timestamp: task.acknowledgedAt,
            type: "WAITER_TASK",
            status: `${task.taskType}_ACKNOWLEDGED`,
            notes: `Waiter task acknowledged by waiter`,
            metadata: { taskId: task._id, waiterId: task.assignedWaiterId }
          });
        }
        if (task.inProgressAt) {
          activityFeed.push({
            timestamp: task.inProgressAt,
            type: "WAITER_TASK",
            status: `${task.taskType}_IN_PROGRESS`,
            notes: `Waiter task in progress`,
            metadata: { taskId: task._id, waiterId: task.assignedWaiterId }
          });
        }
        if (task.completedAt) {
          activityFeed.push({
            timestamp: task.completedAt,
            type: "WAITER_TASK",
            status: `${task.taskType}_COMPLETED`,
            notes: `Waiter task completed`,
            metadata: { taskId: task._id, waiterId: task.assignedWaiterId }
          });
        }
        if (task.cancelledAt) {
          activityFeed.push({
            timestamp: task.cancelledAt,
            type: "WAITER_TASK",
            status: `${task.taskType}_CANCELLED`,
            notes: `Waiter task cancelled`,
            metadata: { taskId: task._id, reason: task.metadata?.cancellationReason }
          });
        }
        if (task.escalatedAt) {
          activityFeed.push({
            timestamp: task.escalatedAt,
            type: "WAITER_TASK",
            status: `${task.taskType}_ESCALATED`,
            notes: `Waiter task SLA breached and escalated`,
            metadata: { taskId: task._id }
          });
        }
      }

      // Sort timeline chronologically
      activityFeed.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      ApiResponseHandler.success(res, 200, "Unified timeline retrieved successfully", {
        sessionId,
        timeline: activityFeed
      });
    } catch (error: any) {
      console.error("[DiningOperationsController] getUnifiedTimeline error:", error);
      ApiResponseHandler.badRequest(res, error.message || "Failed to retrieve unified timeline");
    }
  }

  /**
   * GET /api/v1/dining/tables
   * Retrieves all tables for a given tenant + outlet
   */
  static async listTables(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, outletId } = await resolveDiningContext(req);

      const tables = await Table.find({
        tenantId,
        outletId,
        isDeleted: false
      }).lean();

      ApiResponseHandler.success(res, 200, "Tables retrieved successfully", {
        count: tables.length,
        tables
      });
    } catch (error: any) {
      console.error("[DiningOperationsController] listTables error:", error);
      ApiResponseHandler.badRequest(res, error.message || "Failed to retrieve tables");
    }
  }

  /**
   * POST /api/v1/dining/tables
   * Create a new table
   */
  static async createTable(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, outletId } = await resolveDiningContext(req);
      const triggeredById = req.user?.userId;
      const payload = req.body;

      const table = await TableService.createTable(tenantId, outletId, payload, triggeredById);
      ApiResponseHandler.success(res, 201, "Table created successfully", table);
    } catch (error: any) {
      console.error("[DiningOperationsController] createTable error:", error);
      ApiResponseHandler.badRequest(res, error.message || "Failed to create table");
    }
  }

  /**
   * PATCH /api/v1/dining/tables/:id
   * Update a table
   */
  static async updateTable(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, outletId } = await resolveDiningContext(req);
      const tableId = req.params.id as string;
      const triggeredById = req.user?.userId;
      const payload = req.body;

      if (!tableId || !Types.ObjectId.isValid(tableId)) {
        ApiResponseHandler.badRequest(res, "Valid table ID is required");
        return;
      }

      const table = await TableService.updateTable(tenantId, outletId, tableId, payload, triggeredById);
      ApiResponseHandler.success(res, 200, "Table updated successfully", table);
    } catch (error: any) {
      console.error("[DiningOperationsController] updateTable error:", error);
      ApiResponseHandler.badRequest(res, error.message || "Failed to update table");
    }
  }

  /**
   * DELETE /api/v1/dining/tables/:id
   * Archive a table
   */
  static async archiveTable(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, outletId } = await resolveDiningContext(req);
      const tableId = req.params.id as string;
      const triggeredById = req.user?.userId;

      if (!tableId || !Types.ObjectId.isValid(tableId)) {
        ApiResponseHandler.badRequest(res, "Valid table ID is required");
        return;
      }

      const table = await TableService.archiveTable(tenantId, outletId, tableId, triggeredById);
      ApiResponseHandler.success(res, 200, "Table archived successfully", table);
    } catch (error: any) {
      console.error("[DiningOperationsController] archiveTable error:", error);
      ApiResponseHandler.badRequest(res, error.message || "Failed to archive table");
    }
  }

  /**
   * GET /api/v1/dining/areas
   * Retrieves all dining areas for a given tenant + outlet
   */
  static async listDiningAreas(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, outletId } = await resolveDiningContext(req);

      const DiningAreaModel = mongoose.model("DiningArea");
      const areas = await DiningAreaModel.find({
        tenantId,
        outletId,
        isDeleted: false
      }).sort({ displayOrder: 1 }).lean();

      ApiResponseHandler.success(res, 200, "Dining areas retrieved successfully", {
        count: areas.length,
        areas
      });
    } catch (error: any) {
      console.error("[DiningOperationsController] listDiningAreas error:", error);
      ApiResponseHandler.badRequest(res, error.message || "Failed to retrieve dining areas");
    }
  }

  /**
   * POST /api/v1/dining/areas
   * Create a new dining area
   */
  static async createDiningArea(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, outletId } = await resolveDiningContext(req);
      const triggeredById = req.user?.userId;
      const payload = req.body;

      if (!payload.name) {
        ApiResponseHandler.badRequest(res, "Dining area name is required");
        return;
      }

      const area = await DiningAreaService.createDiningArea(tenantId, outletId, payload, triggeredById);

      ApiResponseHandler.success(res, 201, "Dining area created successfully", area);
    } catch (error: any) {
      console.error("[DiningOperationsController] createDiningArea error:", error);
      ApiResponseHandler.badRequest(res, error.message || "Failed to create dining area");
    }
  }

  /**
   * PATCH /api/v1/dining/areas/:id
   * Update a dining area
   */
  static async updateDiningArea(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, outletId } = await resolveDiningContext(req);
      const areaId = req.params.id as string;
      const triggeredById = req.user?.userId;
      const payload = req.body;

      if (!areaId || !Types.ObjectId.isValid(areaId)) {
        ApiResponseHandler.badRequest(res, "Valid dining area ID is required");
        return;
      }

      const area = await DiningAreaService.updateDiningArea(tenantId, outletId, areaId, payload, triggeredById);

      ApiResponseHandler.success(res, 200, "Dining area updated successfully", area);
    } catch (error: any) {
      console.error("[DiningOperationsController] updateDiningArea error:", error);
      ApiResponseHandler.badRequest(res, error.message || "Failed to update dining area");
    }
  }

  /**
   * DELETE /api/v1/dining/areas/:id
   * Archive a dining area
   */
  static async archiveDiningArea(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, outletId } = await resolveDiningContext(req);
      const areaId = req.params.id as string;
      const triggeredById = req.user?.userId;

      if (!areaId || !Types.ObjectId.isValid(areaId)) {
        ApiResponseHandler.badRequest(res, "Valid dining area ID is required");
        return;
      }

      const area = await DiningAreaService.archiveDiningArea(tenantId, outletId, areaId, triggeredById);

      ApiResponseHandler.success(res, 200, "Dining area archived successfully", area);
    } catch (error: any) {
      console.error("[DiningOperationsController] archiveDiningArea error:", error);
      ApiResponseHandler.badRequest(res, error.message || "Failed to archive dining area");
    }
  }

  /**
   * GET /api/v1/dining/waiter-tasks
   * Retrieves all waiter tasks for an outlet
   */
  static async listWaiterTasks(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, outletId } = await resolveDiningContext(req);

      const tasks = await WaiterTask.find({
        tenantId,
        outletId,
        isDeleted: false
      })
      .populate({
        path: "tableId",
        select: "tableNumber diningAreaId",
        populate: {
          path: "diningAreaId",
          select: "name"
        }
      })
      .populate("assignedWaiterId", "firstName lastName email")
      .sort({ createdAt: -1 })
      .lean();

      ApiResponseHandler.success(res, 200, "Waiter tasks retrieved successfully", {
        count: tasks.length,
        tasks
      });
    } catch (error: any) {
      console.error("[DiningOperationsController] listWaiterTasks error:", error);
      ApiResponseHandler.badRequest(res, error.message || "Failed to retrieve waiter tasks");
    }
  }
}

