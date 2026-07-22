import { Types } from "mongoose";
import WaiterTask from "../models/waitertask.model.js";
import { EventBusService } from "../events/eventBus.js";

let checkerInterval: NodeJS.Timeout | null = null;

export async function checkSlaBreaches(): Promise<void> {
  try {
    const now = new Date();

    const tasks = await WaiterTask.find({
      status: { $in: ["CREATED", "ASSIGNED", "ACKNOWLEDGED", "IN_PROGRESS"] },
      isDeleted: false
    });

    for (const task of tasks) {
      const elapsed = now.getTime() - task.createdAt.getTime();
      if (elapsed > task.slaLimitMs) {

        task.status = "ESCALATED";
        task.escalatedAt = now;
        await task.save();

        await EventBusService.publishWaiterTaskEscalated(
          task.tenantId,
          task.outletId,
          task._id,
          {
            taskId: task._id.toString(),
            taskType: task.taskType,
            escalatedAt: task.escalatedAt,
            priority: task.priority,
            source: task.source,
            tableId: task.tableId.toString(),
            sessionId: task.sessionId.toString(),
            metadata: task.metadata
          },
          { correlationId: task.sessionId.toString() }
        );
      }
    }
  } catch (error: any) {
    console.error(`[WaiterTaskEscalationWorker] Error during SLA checks:`, error.message);
  }
}

export function startWaiterTaskEscalationWorker(intervalMs = 15000): void {
  if (checkerInterval) return;
  checkerInterval = setInterval(() => checkSlaBreaches(), intervalMs);
}

export function stopWaiterTaskEscalationWorker(): void {
  if (checkerInterval) {
    clearInterval(checkerInterval);
    checkerInterval = null;
  }
}
