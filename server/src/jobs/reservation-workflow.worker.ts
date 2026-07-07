import { TableService } from "../modules/outlet/table.service.js";
import { RealtimeEvent } from "../types/socket-events.js";

export async function reservationWorkflowWorker(event: any): Promise<void> {
  const { tenantId, outletId, eventType, payload } = event;

  if (eventType === RealtimeEvent.RESERVATION_CONFIRMED) {
    if (payload.tableId) {
      await TableService.handleReservationConfirmed(tenantId, outletId, payload.tableId, payload.reservationId);
    }
  } else if (eventType === RealtimeEvent.RESERVATION_SEATED) {
    if (payload.tableId) {
      await TableService.handleReservationSeated(tenantId, outletId, payload.tableId, payload.sessionId);
    }
  } else if (eventType === RealtimeEvent.RESERVATION_CANCELLED) {
    if (payload.tableId) {
      await TableService.handleReservationCancelled(tenantId, outletId, payload.tableId);
    }
  }
}
