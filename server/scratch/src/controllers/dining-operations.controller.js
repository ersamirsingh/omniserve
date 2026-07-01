import { Types } from "mongoose";
import { RestaurantOperationsService } from "../services/dining/restaurant-operations.service.js";
import Table from "../models/table.model.js";
import OrderTimeline from "../models/ordertimeline.model.js";
import WaiterTask from "../models/waitertask.model.js";
import { ApiResponseHandler } from "../utils/response.handler.js";
export class DiningOperationsController {
    /**
     * POST /api/v1/dining/operations
     * Executes a restaurant operational command (e.g. TRANSFER_TABLE, MERGE_TABLE, etc.)
     */
    static async executeOperation(req, res) {
        try {
            const { operationType, payload } = req.body;
            const tenantIdStr = String(req.user?.tenantId || req.body.tenantId || req.headers["x-tenant-id"] || "");
            const outletIdStr = String(req.user?.outletId || req.body.outletId || req.headers["x-outlet-id"] || "");
            const triggeredById = req.user?.userId || req.body.triggeredById;
            if (!operationType || !payload) {
                ApiResponseHandler.badRequest(res, "Missing operationType or payload parameters");
                return;
            }
            if (!tenantIdStr || !outletIdStr) {
                ApiResponseHandler.badRequest(res, "Tenant ID and Outlet ID are required context parameters");
                return;
            }
            const tenantId = new Types.ObjectId(tenantIdStr);
            const outletId = new Types.ObjectId(outletIdStr);
            const result = await RestaurantOperationsService.executeOperation({
                tenantId,
                outletId,
                operationType,
                payload,
                triggeredById
            });
            ApiResponseHandler.success(res, 200, "Operation executed successfully", result);
        }
        catch (error) {
            console.error("[DiningOperationsController] executeOperation error:", error);
            ApiResponseHandler.badRequest(res, error.message || "Failed to execute operation");
        }
    }
    /**
     * PUT /api/v1/dining/tables/layout
     * Batch updates table layout coordinates for the floor designer
     */
    static async updateTablesLayout(req, res) {
        try {
            const { tables } = req.body;
            const tenantIdStr = String(req.user?.tenantId || req.body.tenantId || req.headers["x-tenant-id"] || "");
            if (!tables || !Array.isArray(tables)) {
                ApiResponseHandler.badRequest(res, "Missing or invalid tables array parameter");
                return;
            }
            if (!tenantIdStr) {
                ApiResponseHandler.badRequest(res, "Tenant ID is required context parameter");
                return;
            }
            const tenantId = new Types.ObjectId(tenantIdStr);
            const updatedTableIds = [];
            for (const tableData of tables) {
                const { tableId, layout } = tableData;
                if (!tableId || !layout)
                    continue;
                const table = await Table.findOneAndUpdate({ _id: new Types.ObjectId(tableId), tenantId, isDeleted: false }, { $set: { layout } }, { new: true });
                if (table) {
                    updatedTableIds.push(table._id.toString());
                }
            }
            ApiResponseHandler.success(res, 200, "Table layouts updated successfully", {
                updatedTableIds
            });
        }
        catch (error) {
            console.error("[DiningOperationsController] updateTablesLayout error:", error);
            ApiResponseHandler.badRequest(res, error.message || "Failed to update layouts");
        }
    }
    /**
     * GET /api/v1/dining/timeline/:sessionId
     * Retrieves unified chronological activity timeline merging Table, Order, and Waiter tasks
     */
    static async getUnifiedTimeline(req, res) {
        try {
            const sessionId = String(req.params.sessionId || "");
            const tenantIdStr = String(req.user?.tenantId || req.query.tenantId || req.headers["x-tenant-id"] || "");
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
            const activityFeed = [];
            // Map Order & Table events from OrderTimeline
            for (const ot of orderTimelines) {
                let eventType = "ORDER";
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
        }
        catch (error) {
            console.error("[DiningOperationsController] getUnifiedTimeline error:", error);
            ApiResponseHandler.badRequest(res, error.message || "Failed to retrieve unified timeline");
        }
    }
}
