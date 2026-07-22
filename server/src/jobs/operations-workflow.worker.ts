import { IIntegrationEventQueue } from "../models/integration-event-queue.model.js";
import { RestaurantOperationsService } from "../modules/order/restaurant-operations.service.js";
import { RealtimeEvent } from "../types/socket-events.js";
import QRSession from "../models/qrsession.model.js";

export async function operationsWorkflowWorker(event: IIntegrationEventQueue): Promise<void> {
  const { eventType, tenantId, outletId, payload } = event;
  if (!outletId) return;

  try {
    switch (eventType) {
      case RealtimeEvent.QR_ASSISTANCE_REQUESTED: {
        const { tableId, sessionId, assistanceType, seatNumber } = payload as any;
        if (tableId && sessionId && assistanceType) {
          await RestaurantOperationsService.handleQRAssistanceRequested(
            tenantId,
            outletId,
            tableId,
            sessionId,
            assistanceType,
            seatNumber
          );
        }
        break;
      }

      case RealtimeEvent.ORDER_STATUS_CHANGED: {
        const order = payload as any;

        const sessionId = order.sessionId || order.diningContext?.sessionId;
        const tableId = order.diningContext?.tableId;
        const seatNumber = order.diningContext?.seatNumber;

        if (order.orderStatus === "READY" && sessionId && tableId) {
          await RestaurantOperationsService.handleOrderReady(
            tenantId,
            outletId,
            order._id,
            sessionId,
            tableId,
            seatNumber
          );
        }
        break;
      }

      case RealtimeEvent.TABLE_CLEANING_STARTED: {
        const { tableId } = payload as any;
        if (tableId) {

          const session = await QRSession.findOne({ tableId, tenantId, outletId }).sort({ createdAt: -1 });
          if (session) {
            await RestaurantOperationsService.handleTableCleaningStarted(
              tenantId,
              outletId,
              tableId,
              session._id
            );
          }
        }
        break;
      }

      case RealtimeEvent.TABLE_STATUS_CHANGED: {
        const { tableId, status } = payload as any;
        if (tableId && status === "BILL_REQUESTED") {
          const session = await QRSession.findOne({
            tableId,
            status: { $in: ["ACTIVE", "ORDERING", "DINING", "PAYMENT_PENDING"] },
            isDeleted: false
          });
          if (session) {
            await RestaurantOperationsService.handleBillRequested(
              tenantId,
              outletId,
              tableId,
              session._id
            );
          }
        }
        break;
      }
    }
  } catch (err: any) {
    console.error(`[OperationsWorkflowWorker] Error executing workflow orchestrator for ${eventType}:`, err.message);
    throw err;
  }
}
