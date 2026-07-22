import { workerRegistry } from "../modules/integration/sync-engine.service.js";
import { statusSyncWorker } from "./status-sync.worker.js";
import { inventorySyncWorker } from "./inventory-sync.worker.js";
import { menuSyncWorker } from "./menu-sync.worker.js";
import { realtimeSyncWorker } from "./realtime-sync.worker.js";
import { operationsWorkflowWorker } from "./operations-workflow.worker.js";
import { reservationWorkflowWorker } from "./reservation-workflow.worker.js";

async function compositeOrderCreatedWorker(event: any): Promise<void> {
  await statusSyncWorker(event);
  await realtimeSyncWorker(event);
}

async function compositeOrderStatusChangedWorker(event: any): Promise<void> {
  await statusSyncWorker(event);
  await realtimeSyncWorker(event);
  await operationsWorkflowWorker(event);
}

async function compositeQRAssistanceRequestedWorker(event: any): Promise<void> {
  await operationsWorkflowWorker(event);
  await realtimeSyncWorker(event);
}

async function compositeReservationWorker(event: any): Promise<void> {
  await reservationWorkflowWorker(event);
  await realtimeSyncWorker(event);
}

async function compositeTableStatusChangedWorker(event: any): Promise<void> {
  await operationsWorkflowWorker(event);
  await realtimeSyncWorker(event);
}

async function compositeTableCleaningStartedWorker(event: any): Promise<void> {
  await operationsWorkflowWorker(event);
  await realtimeSyncWorker(event);
}

async function compositeOutletStatusChangedWorker(event: any): Promise<void> {
  await statusSyncWorker(event);
  await realtimeSyncWorker(event);
}

export function initWorkerRegistry(): void {

  workerRegistry.register("ORDER_CREATED", compositeOrderCreatedWorker);
  workerRegistry.register("ORDER_STATUS_CHANGED", compositeOrderStatusChangedWorker);

  workerRegistry.register("OUTLET_STATUS_CHANGED", compositeOutletStatusChangedWorker);
  workerRegistry.register("INVENTORY_CHANGED", inventorySyncWorker);
  workerRegistry.register("MENU_CHANGED", menuSyncWorker);
  workerRegistry.register("DINING_AREA_CREATED", realtimeSyncWorker);
  workerRegistry.register("DINING_AREA_UPDATED", realtimeSyncWorker);
  workerRegistry.register("DINING_AREA_ARCHIVED", realtimeSyncWorker);

  workerRegistry.register("QR_ASSISTANCE_REQUESTED", compositeQRAssistanceRequestedWorker);
  workerRegistry.register("TABLE_STATUS_CHANGED", compositeTableStatusChangedWorker);
  workerRegistry.register("TABLE_CLEANING_STARTED", compositeTableCleaningStartedWorker);

  workerRegistry.register("RESERVATION_CONFIRMED", compositeReservationWorker);
  workerRegistry.register("RESERVATION_SEATED", compositeReservationWorker);
  workerRegistry.register("RESERVATION_CANCELLED", compositeReservationWorker);

  workerRegistry.register("TABLE_OCCUPIED", realtimeSyncWorker);
  workerRegistry.register("TABLE_AVAILABLE", realtimeSyncWorker);
  workerRegistry.register("TABLE_RESERVED", realtimeSyncWorker);
  workerRegistry.register("TABLE_TRANSFERRED", realtimeSyncWorker);
  workerRegistry.register("TABLE_MERGED", realtimeSyncWorker);
  workerRegistry.register("TABLE_UNMERGED", realtimeSyncWorker);
  workerRegistry.register("TABLE_CLEANING_COMPLETED", realtimeSyncWorker);
  workerRegistry.register("ITEM_FIRE_REQUESTED", realtimeSyncWorker);

  workerRegistry.register("SEAT_MOVED", realtimeSyncWorker);
  workerRegistry.register("SEAT_SWAPPED", realtimeSyncWorker);
  workerRegistry.register("SEAT_ADDED", realtimeSyncWorker);
  workerRegistry.register("SEAT_REMOVED", realtimeSyncWorker);
  workerRegistry.register("WAITER_CHANGED", realtimeSyncWorker);
  workerRegistry.register("SESSION_CLOSED", realtimeSyncWorker);
  workerRegistry.register("GUEST_COUNT_CHANGED", realtimeSyncWorker);

  workerRegistry.register("WAITER_TASK_CREATED", realtimeSyncWorker);
  workerRegistry.register("WAITER_TASK_ASSIGNED", realtimeSyncWorker);
  workerRegistry.register("WAITER_TASK_ACKNOWLEDGED", realtimeSyncWorker);
  workerRegistry.register("WAITER_TASK_IN_PROGRESS", realtimeSyncWorker);
  workerRegistry.register("WAITER_TASK_COMPLETED", realtimeSyncWorker);
  workerRegistry.register("WAITER_TASK_CANCELLED", realtimeSyncWorker);
  workerRegistry.register("WAITER_TASK_ESCALATED", realtimeSyncWorker);

  workerRegistry.register("ITEM_FIRED", realtimeSyncWorker);
  workerRegistry.register("ITEM_HELD", realtimeSyncWorker);
  workerRegistry.register("COURSE_FIRED", realtimeSyncWorker);

  workerRegistry.register("BILL_REQUESTED", realtimeSyncWorker);
  workerRegistry.register("BILL_SPLIT_CREATED", realtimeSyncWorker);
  workerRegistry.register("BILL_SETTLED", realtimeSyncWorker);

}
