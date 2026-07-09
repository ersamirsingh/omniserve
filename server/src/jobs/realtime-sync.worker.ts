import { IIntegrationEventQueue } from "../models/integration-event-queue.model.js";
import { RealtimeService } from "../sockets/realtime.service.js";
import { RealtimeEvent } from "../types/socket-events.js";

export async function realtimeSyncWorker(event: IIntegrationEventQueue): Promise<void> {
  const { eventType, tenantId, outletId, payload, correlationId } = event;
  console.log(`[RealtimeSyncWorker] Processing event: ${eventType} for tenant=${tenantId}`);

  // Base socket message payload envelope
  const messagePayload = {
    event: eventType,
    meta: {
      tenantId: tenantId ? tenantId.toString() : "",
      outletId: outletId ? outletId.toString() : null,
      correlationId,
      timestamp: new Date()
    },
    data: payload
  };

  // Broadcast logic based on event types and room assignments using typed contracts
  switch (eventType) {
    case RealtimeEvent.TABLE_OCCUPIED:
    case RealtimeEvent.TABLE_AVAILABLE:
    case RealtimeEvent.TABLE_RESERVED:
    case RealtimeEvent.TABLE_STATUS_CHANGED:
    case RealtimeEvent.TABLE_CLEANING_STARTED:
    case RealtimeEvent.TABLE_CLEANING_COMPLETED:
    case RealtimeEvent.TABLE_UNMERGED:
    case RealtimeEvent.GUEST_COUNT_CHANGED:
    case RealtimeEvent.WAITER_TASK_CREATED:
    case RealtimeEvent.WAITER_TASK_ASSIGNED:
    case RealtimeEvent.WAITER_TASK_ACKNOWLEDGED:
    case RealtimeEvent.WAITER_TASK_IN_PROGRESS:
    case RealtimeEvent.WAITER_TASK_COMPLETED:
    case RealtimeEvent.WAITER_TASK_CANCELLED:
    case RealtimeEvent.WAITER_TASK_ESCALATED:
    case RealtimeEvent.QR_ASSISTANCE_REQUESTED:
    case RealtimeEvent.DINING_AREA_CREATED:
    case RealtimeEvent.DINING_AREA_UPDATED:
    case RealtimeEvent.DINING_AREA_ARCHIVED:
    case RealtimeEvent.OUTLET_STATUS_CHANGED:
      if (outletId) {
        RealtimeService.sendToOutlet(tenantId, outletId, eventType as RealtimeEvent, messagePayload);
      }
      break;

    case RealtimeEvent.TABLE_TRANSFERRED:
    case RealtimeEvent.TABLE_MERGED:
    case RealtimeEvent.SEAT_MOVED:
    case RealtimeEvent.SEAT_SWAPPED:
    case RealtimeEvent.WAITER_CHANGED:
    case RealtimeEvent.SESSION_CLOSED:
    case RealtimeEvent.SEAT_ADDED:
    case RealtimeEvent.SEAT_REMOVED:
      if (outletId) {
        RealtimeService.sendToOutlet(tenantId, outletId, eventType as RealtimeEvent, messagePayload);
      }
      // Also send to session room if sessionId is present in payload
      const sessId = (payload as any)?.sessionId;
      if (sessId) {
        RealtimeService.sendToSession(sessId, eventType as RealtimeEvent, messagePayload);
      }
      break;

    case RealtimeEvent.ITEM_FIRE_REQUESTED:
      if (outletId) {
        RealtimeService.sendToKitchen(outletId, eventType as RealtimeEvent, messagePayload);
      }
      const orderSessionId = (payload as any)?.sessionId || (payload as any)?.diningContext?.sessionId;
      if (orderSessionId) {
        RealtimeService.sendToSession(orderSessionId, eventType as RealtimeEvent, messagePayload);
      }
      break;

    case RealtimeEvent.ITEM_FIRED:
    case RealtimeEvent.ITEM_HELD:
    case RealtimeEvent.COURSE_FIRED:
      // KDS events: broadcast to kitchen display and optionally to customer session
      if (outletId) {
        RealtimeService.sendToKitchen(outletId, eventType as RealtimeEvent, messagePayload);
        RealtimeService.sendToOutlet(tenantId, outletId, eventType as RealtimeEvent, messagePayload);
      }
      const kdsSessionId = (payload as any)?.sessionId;
      if (kdsSessionId) {
        RealtimeService.sendToSession(kdsSessionId, eventType as RealtimeEvent, messagePayload);
      }
      break;

    case RealtimeEvent.BILL_REQUESTED:
    case RealtimeEvent.BILL_SPLIT_CREATED:
    case RealtimeEvent.BILL_SETTLED:
      // Billing events: broadcast to outlet managers and the specific dining session
      if (outletId) {
        RealtimeService.sendToOutlet(tenantId, outletId, eventType as RealtimeEvent, messagePayload);
      }
      const billSessionId = (payload as any)?.sessionId;
      if (billSessionId) {
        RealtimeService.sendToSession(billSessionId, eventType as RealtimeEvent, messagePayload);
      }
      break;

    case RealtimeEvent.ORDER_CREATED:
      if (outletId) {
        // Send to KDS
        RealtimeService.sendToKitchen(outletId, eventType as RealtimeEvent, messagePayload);
      }
      // If order is linked to a QRSession, broadcast to session room
      const qrSessId = (payload as any)?.sessionId || (payload as any)?.diningContext?.sessionId;
      if (qrSessId) {
        RealtimeService.sendToSession(qrSessId, eventType as RealtimeEvent, messagePayload);
      }
      break;

    case RealtimeEvent.ORDER_STATUS_CHANGED:
      if (outletId) {
        RealtimeService.sendToKitchen(outletId, eventType as RealtimeEvent, messagePayload);
        RealtimeService.sendToOutlet(tenantId, outletId, eventType as RealtimeEvent, messagePayload);
      }
      const statusSessionId = (payload as any)?.sessionId || (payload as any)?.diningContext?.sessionId;
      if (statusSessionId) {
        RealtimeService.sendToSession(statusSessionId, eventType as RealtimeEvent, messagePayload);
      }
      break;

    default:
      console.log(`[RealtimeSyncWorker] No socket room routing defined for event type: ${eventType}`);
  }
}
