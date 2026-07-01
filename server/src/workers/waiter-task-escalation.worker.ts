import { Types } from "mongoose";
import WaiterTask from "../models/waitertask.model.js";
import { EventBusService } from "../services/event-bus.service.js";

let checkerInterval: NodeJS.Timeout | null = null;

/**
 * Periodically checks for waiter tasks that have breached their configured SLA limits.
 */
export async function checkSlaBreaches(): Promise<void> {
  try {
    const now = new Date();
    // Query active task lifecycle statuses that are not finished
    const tasks = await WaiterTask.find({
      status: { $in: ["CREATED", "ASSIGNED", "ACKNOWLEDGED", "IN_PROGRESS"] },
      isDeleted: false
    });

    for (const task of tasks) {
      const elapsed = now.getTime() - task.createdAt.getTime();
      if (elapsed > task.slaLimitMs) {
        // transition task status to ESCALATED
        task.status = "ESCALATED";
        task.escalatedAt = now;
        await task.save();

        console.log(`[WaiterTaskEscalationWorker] SLA breach detected on task ${task._id} (${task.taskType}). Elapsed: ${elapsed}ms, limit: ${task.slaLimitMs}ms. Escalating.`);

        // Publish event to the Transactional Outbox Event Bus
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

/**
 * Starts the background SLA checking worker.
 */
export function startWaiterTaskEscalationWorker(intervalMs = 15000): void {
  if (checkerInterval) return;
  console.log(`[WaiterTaskEscalationWorker] Starting background SLA escalation checker daemon (interval: ${intervalMs}ms)`);
  checkerInterval = setInterval(() => checkSlaBreaches(), intervalMs);
}

/**
 * Stops the background SLA checking worker.
 */
export function stopWaiterTaskEscalationWorker(): void {
  if (checkerInterval) {
    clearInterval(checkerInterval);
    checkerInterval = null;
    console.log(`[WaiterTaskEscalationWorker] Stopped background SLA escalation checker daemon`);
  }
}
