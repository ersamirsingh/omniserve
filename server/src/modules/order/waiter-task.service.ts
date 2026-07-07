import mongoose, { Types } from "mongoose";
import WaiterTask, { IWaiterTask, WaiterTaskType, WaiterTaskStatus } from "../../models/waitertask.model.js";
import Outlet from "../../models/outlet.model.js";
import { EventBusService } from "../../events/eventBus.js";

export class WaiterTaskService {
  /**
   * Helper to retrieve SLA limit for a specific task type at an outlet, with safe system fallbacks
   */
  static async getSlaLimitForTask(outletId: string | Types.ObjectId, taskType: WaiterTaskType): Promise<number> {
    try {
      const outlet = await Outlet.findById(outletId);
      const slas = outlet?.get("waiterTaskSlas");
      if (slas instanceof Map && slas.has(taskType)) {
        return Number(slas.get(taskType));
      }
      if (slas && typeof slas === "object" && taskType in slas) {
        return Number((slas as any)[taskType]);
      }
    } catch (err) {
      console.warn(`[WaiterTaskService] Failed to fetch custom SLA settings for outlet ${outletId}:`, err);
    }

    // Centralized fallback defaults (in milliseconds)
    const defaults: Record<WaiterTaskType, number> = {
      SERVE_FOOD: 180000,   // 3 minutes
      WATER: 300000,        // 5 minutes
      TISSUE: 300000,       // 5 minutes
      SPOON: 300000,        // 5 minutes
      BILL: 180000,         // 3 minutes
      CLEANING: 600000,     // 10 minutes
      CUSTOM: 300000        // 5 minutes
    };
    return defaults[taskType] || 300000;
  }

  /**
   * Create a new generalized waiter task in CREATED status
   */
  static async createTask(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId,
    tableId: string | Types.ObjectId,
    sessionId: string | Types.ObjectId,
    taskType: WaiterTaskType,
    source: string,
    options: {
      priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      seatNumber?: string;
      associatedOrderId?: string;
      metadata?: any;
    } = {}
  ): Promise<IWaiterTask> {
    const slaLimitMs = await this.getSlaLimitForTask(outletId, taskType);
    
    // Fetch session to inherit waiter assignment if exists
    const QRSessionModel = mongoose.model('QRSession');
    const session = await QRSessionModel.findById(sessionId);
    let assignedTo = null;
    if (session && session.waiterId) {
        assignedTo = session.waiterId;
    }

    const task = new WaiterTask({
      tenantId: new Types.ObjectId(tenantId),
      outletId: new Types.ObjectId(outletId),
      tableId: new Types.ObjectId(tableId),
      sessionId: new Types.ObjectId(sessionId),
      taskType,
      assignedTo,
      source,
      status: "CREATED",
      priority: options.priority || "MEDIUM",
      seatNumber: options.seatNumber || null,
      associatedOrderId: options.associatedOrderId ? new Types.ObjectId(options.associatedOrderId) : null,
      slaLimitMs,
      metadata: options.metadata || {}
    });

    await task.save();

    // Publish WAITER_TASK_CREATED event
    await EventBusService.publishWaiterTaskCreated(
      tenantId,
      outletId,
      task._id,
      {
        taskId: task._id.toString(),
        taskType: task.taskType,
        priority: task.priority,
        source: task.source,
        tableId: task.tableId.toString(),
        sessionId: task.sessionId.toString(),
        createdAt: task.createdAt,
        metadata: task.metadata
      },
      { correlationId: sessionId.toString() }
    );

    return task;
  }

  /**
   * Assign a task to a specific waiter
   */
  static async assignTask(
    taskId: string | Types.ObjectId,
    waiterId: string | Types.ObjectId
  ): Promise<IWaiterTask> {
    const task = await WaiterTask.findOneAndUpdate(
      { _id: new Types.ObjectId(taskId), status: "CREATED", isDeleted: false },
      {
        $set: {
          status: "ASSIGNED",
          assignedWaiterId: new Types.ObjectId(waiterId),
          assignedAt: new Date()
        }
      },
      { new: true }
    );

    if (!task) {
      throw new Error(`Task not found or ineligible for assignment: ${taskId}`);
    }

    // Publish event
    await EventBusService.publishWaiterTaskAssigned(
      task.tenantId,
      task.outletId,
      task._id,
      {
        taskId: task._id.toString(),
        waiterId: waiterId.toString(),
        assignedAt: task.assignedAt
      },
      { correlationId: task.sessionId.toString(), createdBy: waiterId }
    );

    return task;
  }

  /**
   * Acknowledge/claim a task by a waiter (supports transitions from CREATED or ASSIGNED)
   */
  static async acknowledgeTask(
    taskId: string | Types.ObjectId,
    waiterId: string | Types.ObjectId
  ): Promise<IWaiterTask> {
    const task = await WaiterTask.findOneAndUpdate(
      { _id: new Types.ObjectId(taskId), status: { $in: ["CREATED", "ASSIGNED", "ESCALATED"] }, isDeleted: false },
      {
        $set: {
          status: "ACKNOWLEDGED",
          assignedWaiterId: new Types.ObjectId(waiterId),
          acknowledgedAt: new Date()
        }
      },
      { new: true }
    );

    if (!task) {
      throw new Error(`Task not found or ineligible for acknowledgment: ${taskId}`);
    }

    // Publish event
    await EventBusService.publishWaiterTaskAcknowledged(
      task.tenantId,
      task.outletId,
      task._id,
      {
        taskId: task._id.toString(),
        waiterId: waiterId.toString(),
        acknowledgedAt: task.acknowledgedAt
      },
      { correlationId: task.sessionId.toString(), createdBy: waiterId }
    );

    return task;
  }

  /**
   * Transition waiter task to IN_PROGRESS status
   */
  static async startTaskProgress(taskId: string | Types.ObjectId): Promise<IWaiterTask> {
    const task = await WaiterTask.findOneAndUpdate(
      { _id: new Types.ObjectId(taskId), status: "ACKNOWLEDGED", isDeleted: false },
      {
        $set: {
          status: "IN_PROGRESS",
          inProgressAt: new Date()
        }
      },
      { new: true }
    );

    if (!task) {
      throw new Error(`Task not found or not acknowledged: ${taskId}`);
    }

    // Publish event
    await EventBusService.publishWaiterTaskInProgress(
      task.tenantId,
      task.outletId,
      task._id,
      {
        taskId: task._id.toString(),
        inProgressAt: task.inProgressAt
      },
      { correlationId: task.sessionId.toString() }
    );

    return task;
  }

  /**
   * Complete a waiter task
   */
  static async completeTask(taskId: string | Types.ObjectId): Promise<IWaiterTask> {
    const task = await WaiterTask.findOneAndUpdate(
      { _id: new Types.ObjectId(taskId), status: { $in: ["CREATED", "ASSIGNED", "ACKNOWLEDGED", "IN_PROGRESS", "ESCALATED"] }, isDeleted: false },
      {
        $set: {
          status: "COMPLETED",
          completedAt: new Date()
        }
      },
      { new: true }
    );

    if (!task) {
      throw new Error(`Task not found or already completed/cancelled: ${taskId}`);
    }

    const start = task.inProgressAt || task.acknowledgedAt || task.assignedAt || task.createdAt;
    const durationMs = task.completedAt ? (task.completedAt.getTime() - start.getTime()) : 0;

    // Publish event
    await EventBusService.publishWaiterTaskCompleted(
      task.tenantId,
      task.outletId,
      task._id,
      {
        taskId: task._id.toString(),
        completedAt: task.completedAt,
        durationMs
      },
      { correlationId: task.sessionId.toString() }
    );

    return task;
  }

  /**
   * Cancel a waiter task
   */
  static async cancelTask(taskId: string | Types.ObjectId, reason?: string): Promise<IWaiterTask> {
    const task = await WaiterTask.findOne({ _id: new Types.ObjectId(taskId), isDeleted: false });
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const updatedMetadata = {
      ...(task.metadata || {}),
      cancellationReason: reason || "Cancelled by staff"
    };

    const updatedTask = await WaiterTask.findOneAndUpdate(
      { _id: new Types.ObjectId(taskId), status: { $in: ["CREATED", "ASSIGNED", "ACKNOWLEDGED", "IN_PROGRESS", "ESCALATED"] }, isDeleted: false },
      {
        $set: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          metadata: updatedMetadata
        }
      },
      { new: true }
    );

    if (!updatedTask) {
      throw new Error(`Task already completed or cancelled: ${taskId}`);
    }

    // Publish event
    await EventBusService.publishWaiterTaskCancelled(
      updatedTask.tenantId,
      updatedTask.outletId,
      updatedTask._id,
      {
        taskId: updatedTask._id.toString(),
        cancelledAt: updatedTask.cancelledAt,
        reason: reason || "Cancelled by staff"
      },
      { correlationId: updatedTask.sessionId.toString() }
    );

    return updatedTask;
  }

  /**
   * Retrieve active tasks for the floor queues
   */
  static async getPendingTasksByOutlet(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId
  ): Promise<IWaiterTask[]> {
    return await WaiterTask.find({
      tenantId: new Types.ObjectId(tenantId),
      outletId: new Types.ObjectId(outletId),
      status: { $in: ["CREATED", "ASSIGNED", "ACKNOWLEDGED", "IN_PROGRESS", "ESCALATED"] },
      isDeleted: false
    }).sort({ priority: 1, createdAt: 1 });
  }
}
