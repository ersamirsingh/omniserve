import { workerRegistry } from "../modules/integration/sync-engine.service.js";
import { statusSyncWorker } from "./status-sync.worker.js";
import { inventorySyncWorker } from "./inventory-sync.worker.js";
import { menuSyncWorker } from "./menu-sync.worker.js";
import { realtimeSyncWorker } from "./realtime-sync.worker.js";
import { operationsWorkflowWorker } from "./operations-workflow.worker.js";
import { reservationWorkflowWorker } from "./reservation-workflow.worker.js";

// Composite Order Created Worker
async function compositeOrderCreatedWorker(event: any): Promise<void> {
  await statusSyncWorker(event);
  await realtimeSyncWorker(event);
}

// Composite Order Status Changed Worker (triggers external sync, live socket emit, and operations workflow handler)
async function compositeOrderStatusChangedWorker(event: any): Promise<void> {
  await statusSyncWorker(event);
  await realtimeSyncWorker(event);
  await operationsWorkflowWorker(event);
}

// Composite worker for QR Assistance Requests (processes task spawning then broadcasts socket payload)
async function compositeQRAssistanceRequestedWorker(event: any): Promise<void> {
  await operationsWorkflowWorker(event);
  await realtimeSyncWorker(event);
}

// Composite worker for Reservations (processes workflow then broadcasts)
async function compositeReservationWorker(event: any): Promise<void> {
  await reservationWorkflowWorker(event);
  await realtimeSyncWorker(event);
}

// Composite worker for Table Status Changes (e.g. check for BILL_REQUESTED, processes task spawning, then broadcasts)
async function compositeTableStatusChangedWorker(event: any): Promise<void> {
  await operationsWorkflowWorker(event);
  await realtimeSyncWorker(event);
}

// Composite worker for Table Cleaning Starts (spawns cleaning task, then broadcasts)
async function compositeTableCleaningStartedWorker(event: any): Promise<void> {
  await operationsWorkflowWorker(event);
  await realtimeSyncWorker(event);
}

export function initWorkerRegistry(): void {
  // Composite Order Events
  workerRegistry.register("ORDER_CREATED", compositeOrderCreatedWorker);
  workerRegistry.register("ORDER_STATUS_CHANGED", compositeOrderStatusChangedWorker);

  // Stock & Catalog Events
  workerRegistry.register("INVENTORY_CHANGED", inventorySyncWorker);
  workerRegistry.register("MENU_CHANGED", menuSyncWorker);

  // Dining Operations & Assistance Events
  workerRegistry.register("QR_ASSISTANCE_REQUESTED", compositeQRAssistanceRequestedWorker);
  workerRegistry.register("TABLE_STATUS_CHANGED", compositeTableStatusChangedWorker);
  workerRegistry.register("TABLE_CLEANING_STARTED", compositeTableCleaningStartedWorker);

  // Reservation Events
  workerRegistry.register("RESERVATION_CONFIRMED", compositeReservationWorker);
  workerRegistry.register("RESERVATION_SEATED", compositeReservationWorker);
  workerRegistry.register("RESERVATION_CANCELLED", compositeReservationWorker);

  // Simple Realtime Broadcast Events
  workerRegistry.register("TABLE_OCCUPIED", realtimeSyncWorker);
  workerRegistry.register("TABLE_AVAILABLE", realtimeSyncWorker);
  workerRegistry.register("TABLE_RESERVED", realtimeSyncWorker);
  workerRegistry.register("TABLE_TRANSFERRED", realtimeSyncWorker);
  workerRegistry.register("TABLE_MERGED", realtimeSyncWorker);
  workerRegistry.register("TABLE_UNMERGED", realtimeSyncWorker);
  workerRegistry.register("TABLE_CLEANING_COMPLETED", realtimeSyncWorker);
  workerRegistry.register("ITEM_FIRE_REQUESTED", realtimeSyncWorker);

  // Seat & Session Operations Events (M4)
  workerRegistry.register("SEAT_MOVED", realtimeSyncWorker);
  workerRegistry.register("SEAT_SWAPPED", realtimeSyncWorker);
  workerRegistry.register("SEAT_ADDED", realtimeSyncWorker);
  workerRegistry.register("SEAT_REMOVED", realtimeSyncWorker);
  workerRegistry.register("WAITER_CHANGED", realtimeSyncWorker);
  workerRegistry.register("SESSION_CLOSED", realtimeSyncWorker);
  workerRegistry.register("GUEST_COUNT_CHANGED", realtimeSyncWorker);

  // Waiter Task Status Broadcast Events
  workerRegistry.register("WAITER_TASK_CREATED", realtimeSyncWorker);
  workerRegistry.register("WAITER_TASK_ASSIGNED", realtimeSyncWorker);
  workerRegistry.register("WAITER_TASK_ACKNOWLEDGED", realtimeSyncWorker);
  workerRegistry.register("WAITER_TASK_IN_PROGRESS", realtimeSyncWorker);
  workerRegistry.register("WAITER_TASK_COMPLETED", realtimeSyncWorker);
  workerRegistry.register("WAITER_TASK_CANCELLED", realtimeSyncWorker);
  workerRegistry.register("WAITER_TASK_ESCALATED", realtimeSyncWorker);

  // KDS / Course Management Events (broadcast to kitchen display + session)
  workerRegistry.register("ITEM_FIRED", realtimeSyncWorker);
  workerRegistry.register("ITEM_HELD", realtimeSyncWorker);
  workerRegistry.register("COURSE_FIRED", realtimeSyncWorker);

  // Billing Events (broadcast to outlet + session room)
  workerRegistry.register("BILL_REQUESTED", realtimeSyncWorker);
  workerRegistry.register("BILL_SPLIT_CREATED", realtimeSyncWorker);
  workerRegistry.register("BILL_SETTLED", realtimeSyncWorker);

  console.log('[WorkerRegistry] Registered 38 background event sync workers.');
}
