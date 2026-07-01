import { RealtimeService } from "../services/realtime.service.js";
import { RealtimeEvent } from "../types/socket-events.js";
export async function realtimeSyncWorker(event) {
    const { eventType, tenantId, outletId, payload, correlationId } = event;
    console.log(`[RealtimeSyncWorker] Processing event: ${eventType} for tenant=${tenantId}`);
    // Base socket message payload envelope
    const messagePayload = {
        event: eventType,
        meta: {
            tenantId: tenantId.toString(),
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
            if (outletId) {
                RealtimeService.sendToOutlet(tenantId, outletId, eventType, messagePayload);
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
                RealtimeService.sendToOutlet(tenantId, outletId, eventType, messagePayload);
            }
            // Also send to session room if sessionId is present in payload
            const sessId = payload?.sessionId;
            if (sessId) {
                RealtimeService.sendToSession(sessId, eventType, messagePayload);
            }
            break;
        case RealtimeEvent.ITEM_FIRE_REQUESTED:
            if (outletId) {
                RealtimeService.sendToKitchen(outletId, eventType, messagePayload);
            }
            const orderSessionId = payload?.sessionId || payload?.diningContext?.sessionId;
            if (orderSessionId) {
                RealtimeService.sendToSession(orderSessionId, eventType, messagePayload);
            }
            break;
        case RealtimeEvent.ORDER_CREATED:
            if (outletId) {
                // Send to KDS
                RealtimeService.sendToKitchen(outletId, eventType, messagePayload);
            }
            // If order is linked to a QRSession, broadcast to session room
            const qrSessId = payload?.sessionId || payload?.diningContext?.sessionId;
            if (qrSessId) {
                RealtimeService.sendToSession(qrSessId, eventType, messagePayload);
            }
            break;
        case RealtimeEvent.ORDER_STATUS_CHANGED:
            if (outletId) {
                RealtimeService.sendToKitchen(outletId, eventType, messagePayload);
                RealtimeService.sendToOutlet(tenantId, outletId, eventType, messagePayload);
            }
            const statusSessionId = payload?.sessionId || payload?.diningContext?.sessionId;
            if (statusSessionId) {
                RealtimeService.sendToSession(statusSessionId, eventType, messagePayload);
            }
            break;
        default:
            console.log(`[RealtimeSyncWorker] No socket room routing defined for event type: ${eventType}`);
    }
}
