import { Types } from "mongoose";
import IntegrationEventQueue, { IIntegrationEventQueue } from "../models/integration-event-queue.model.js";
import { RealtimeEvent } from "../types/socket-events.js";

export interface PublishOptions {
  correlationId?: string | undefined;
  causationId?: string | null | undefined;
  createdBy?: string | Types.ObjectId | undefined;
  sourceSystem?: string | undefined;
  eventVersion?: number | undefined;
  schemaVersion?: number | undefined;
}

export class EventBusService {
  /**
   * Helper to write a new event to the integration event outbox queue.
   * Handles deduplication gracefully by catching MongoDB unique index errors.
   */
  private static async createEvent(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId | null,
    eventType: string,
    aggregateType: string,
    aggregateId: string | Types.ObjectId,
    payload: unknown,
    options: PublishOptions = {}
  ): Promise<IIntegrationEventQueue | null> {
    const correlationId = options.correlationId || new Types.ObjectId().toString();
    const createdBy = options.createdBy ? new Types.ObjectId(options.createdBy) : null;
    const sourceSystem = options.sourceSystem || "SYSTEM";
    const eventVersion = options.eventVersion || 1;
    const schemaVersion = options.schemaVersion || 1;

    try {
      const event = new IntegrationEventQueue({
        tenantId: new Types.ObjectId(tenantId),
        outletId: outletId ? new Types.ObjectId(outletId) : null,
        eventType,
        aggregateType,
        aggregateId: new Types.ObjectId(aggregateId),
        payload,
        status: "PENDING",
        correlationId,
        causationId: options.causationId || null,
        eventVersion,
        schemaVersion,
        createdBy,
        sourceSystem,
        queuedAt: new Date(),
        retryCount: 0,
        maxRetryCount: 3,
        nextRetryAt: null,
      });

      return await event.save();
    } catch (error: any) {
      // Catch MongoDB unique index/duplicate key error (code 11000)
      if (error.code === 11000) {
        console.warn(
          `[EventBusService] Deduplicated duplicate event creation. eventType=${eventType}, aggregateId=${aggregateId}, correlationId=${correlationId}, version=${eventVersion}`
        );
        // Find and return the existing duplicate event
        const existing = await IntegrationEventQueue.findOne({
          tenantId: new Types.ObjectId(tenantId),
          eventType,
          aggregateId: new Types.ObjectId(aggregateId),
          correlationId,
          eventVersion,
        });
        return existing;
      }
      throw error;
    }
  }

  static async publishOrderCreated(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId | null,
    orderId: string | Types.ObjectId,
    payload: unknown,
    options?: PublishOptions
  ): Promise<IIntegrationEventQueue | null> {
    return this.createEvent(
      tenantId,
      outletId,
      RealtimeEvent.ORDER_CREATED,
      "ORDER",
      orderId,
      payload,
      options
    );
  }

  static async publishOrderStatusChanged(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId | null,
    orderId: string | Types.ObjectId,
    payload: unknown,
    options?: PublishOptions
  ): Promise<IIntegrationEventQueue | null> {
    return this.createEvent(
      tenantId,
      outletId,
      RealtimeEvent.ORDER_STATUS_CHANGED,
      "ORDER",
      orderId,
      payload,
      options
    );
  }

  static async publishInventoryChanged(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId | null,
    inventoryId: string | Types.ObjectId,
    payload: unknown,
    options?: PublishOptions
  ): Promise<IIntegrationEventQueue | null> {
    return this.createEvent(
      tenantId,
      outletId,
      RealtimeEvent.INVENTORY_CHANGED,
      "INVENTORY",
      inventoryId,
      payload,
      options
    );
  }

  static async publishMenuChanged(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId | null,
    aggregateId: string | Types.ObjectId,
    aggregateType: "MENU_ITEM", // Or others depending on catalog structure
    payload: unknown,
    options?: PublishOptions
  ): Promise<IIntegrationEventQueue | null> {
    return this.createEvent(
      tenantId,
      outletId,
      RealtimeEvent.MENU_CHANGED,
      aggregateType,
      aggregateId,
      payload,
      options
    );
  }

  static async publishCartCreated(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId | null,
    cartId: string | Types.ObjectId,
    payload: unknown,
    options?: PublishOptions
  ): Promise<IIntegrationEventQueue | null> {
    return this.createEvent(
      tenantId,
      outletId,
      RealtimeEvent.CART_CREATED,
      "CART",
      cartId,
      payload,
      options
    );
  }

  static async publishCartUpdated(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId | null,
    cartId: string | Types.ObjectId,
    payload: unknown,
    options?: PublishOptions
  ): Promise<IIntegrationEventQueue | null> {
    return this.createEvent(
      tenantId,
      outletId,
      RealtimeEvent.CART_UPDATED,
      "CART",
      cartId,
      payload,
      options
    );
  }

  static async publishCheckoutStarted(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId | null,
    cartId: string | Types.ObjectId,
    payload: unknown,
    options?: PublishOptions
  ): Promise<IIntegrationEventQueue | null> {
    return this.createEvent(
      tenantId,
      outletId,
      RealtimeEvent.CHECKOUT_STARTED,
      "CART",
      cartId,
      payload,
      options
    );
  }

  static async publishTableOccupied(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId | null,
    tableId: string | Types.ObjectId,
    payload: unknown,
    options?: PublishOptions
  ): Promise<IIntegrationEventQueue | null> {
    return this.createEvent(
      tenantId,
      outletId,
      RealtimeEvent.TABLE_OCCUPIED,
      "TABLE",
      tableId,
      payload,
      options
    );
  }

  static async publishTableAvailable(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId | null,
    tableId: string | Types.ObjectId,
    payload: unknown,
    options?: PublishOptions
  ): Promise<IIntegrationEventQueue | null> {
    return this.createEvent(
      tenantId,
      outletId,
      RealtimeEvent.TABLE_AVAILABLE,
      "TABLE",
      tableId,
      payload,
      options
    );
  }

  static async publishTableReserved(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId | null,
    tableId: string | Types.ObjectId,
    payload: unknown,
    options?: PublishOptions
  ): Promise<IIntegrationEventQueue | null> {
    return this.createEvent(
      tenantId,
      outletId,
      RealtimeEvent.TABLE_RESERVED,
      "TABLE",
      tableId,
      payload,
      options
    );
  }

  static async publishReservationConfirmed(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId | null,
    reservationId: string | Types.ObjectId,
    payload: unknown,
    options?: PublishOptions
  ): Promise<IIntegrationEventQueue | null> {
    return this.createEvent(
      tenantId,
      outletId,
      RealtimeEvent.RESERVATION_CONFIRMED,
      "RESERVATION",
      reservationId,
      payload,
      options
    );
  }

  static async publishReservationSeated(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId | null,
    reservationId: string | Types.ObjectId,
    payload: unknown,
    options?: PublishOptions
  ): Promise<IIntegrationEventQueue | null> {
    return this.createEvent(
      tenantId,
      outletId,
      RealtimeEvent.RESERVATION_SEATED,
      "RESERVATION",
      reservationId,
      payload,
      options
    );
  }

  static async publishReservationCancelled(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId | null,
    reservationId: string | Types.ObjectId,
    payload: unknown,
    options?: PublishOptions
  ): Promise<IIntegrationEventQueue | null> {
    return this.createEvent(
      tenantId,
      outletId,
      RealtimeEvent.RESERVATION_CANCELLED,
      "RESERVATION",
      reservationId,
      payload,
      options
    );
  }

  static async publishTableTransferred(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId | null,
    tableId: string | Types.ObjectId,
    payload: unknown,
    options?: PublishOptions
  ): Promise<IIntegrationEventQueue | null> {
    return this.createEvent(
      tenantId,
      outletId,
      RealtimeEvent.TABLE_TRANSFERRED,
      "TABLE",
      tableId,
      payload,
      options
    );
  }

  static async publishTableMerged(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId | null,
    tableId: string | Types.ObjectId,
    payload: unknown,
    options?: PublishOptions
  ): Promise<IIntegrationEventQueue | null> {
    return this.createEvent(
      tenantId,
      outletId,
      RealtimeEvent.TABLE_MERGED,
      "TABLE",
      tableId,
      payload,
      options
    );
  }

  static async publishTableCleaningStarted(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId | null,
    tableId: string | Types.ObjectId,
    payload: unknown,
    options?: PublishOptions
  ): Promise<IIntegrationEventQueue | null> {
    return this.createEvent(
      tenantId,
      outletId,
      RealtimeEvent.TABLE_CLEANING_STARTED,
      "TABLE",
      tableId,
      payload,
      options
    );
  }

  static async publishTableCleaningCompleted(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId | null,
    tableId: string | Types.ObjectId,
    payload: unknown,
    options?: PublishOptions
  ): Promise<IIntegrationEventQueue | null> {
    return this.createEvent(
      tenantId,
      outletId,
      RealtimeEvent.TABLE_CLEANING_COMPLETED,
      "TABLE",
      tableId,
      payload,
      options
    );
  }

  static async publishTableStatusChanged(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId | null,
    tableId: string | Types.ObjectId,
    payload: unknown,
    options?: PublishOptions
  ): Promise<IIntegrationEventQueue | null> {
    return this.createEvent(
      tenantId,
      outletId,
      RealtimeEvent.TABLE_STATUS_CHANGED,
      "TABLE",
      tableId,
      payload,
      options
    );
  }

  static async publishWaiterTaskCreated(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId | null,
    taskId: string | Types.ObjectId,
    payload: unknown,
    options?: PublishOptions
  ): Promise<IIntegrationEventQueue | null> {
    return this.createEvent(
      tenantId,
      outletId,
      RealtimeEvent.WAITER_TASK_CREATED,
      "WAITER_TASK",
      taskId,
      payload,
      options
    );
  }

  static async publishWaiterTaskAcknowledged(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId | null,
    taskId: string | Types.ObjectId,
    payload: unknown,
    options?: PublishOptions
  ): Promise<IIntegrationEventQueue | null> {
    return this.createEvent(
      tenantId,
      outletId,
      RealtimeEvent.WAITER_TASK_ACKNOWLEDGED,
      "WAITER_TASK",
      taskId,
      payload,
      options
    );
  }

  static async publishWaiterTaskCompleted(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId | null,
    taskId: string | Types.ObjectId,
    payload: unknown,
    options?: PublishOptions
  ): Promise<IIntegrationEventQueue | null> {
    return this.createEvent(
      tenantId,
      outletId,
      RealtimeEvent.WAITER_TASK_COMPLETED,
      "WAITER_TASK",
      taskId,
      payload,
      options
    );
  }

  static async publishWaiterTaskAssigned(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId | null,
    taskId: string | Types.ObjectId,
    payload: unknown,
    options?: PublishOptions
  ): Promise<IIntegrationEventQueue | null> {
    return this.createEvent(
      tenantId,
      outletId,
      RealtimeEvent.WAITER_TASK_ASSIGNED,
      "WAITER_TASK",
      taskId,
      payload,
      options
    );
  }

  static async publishWaiterTaskInProgress(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId | null,
    taskId: string | Types.ObjectId,
    payload: unknown,
    options?: PublishOptions
  ): Promise<IIntegrationEventQueue | null> {
    return this.createEvent(
      tenantId,
      outletId,
      RealtimeEvent.WAITER_TASK_IN_PROGRESS,
      "WAITER_TASK",
      taskId,
      payload,
      options
    );
  }

  static async publishWaiterTaskCancelled(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId | null,
    taskId: string | Types.ObjectId,
    payload: unknown,
    options?: PublishOptions
  ): Promise<IIntegrationEventQueue | null> {
    return this.createEvent(
      tenantId,
      outletId,
      RealtimeEvent.WAITER_TASK_CANCELLED,
      "WAITER_TASK",
      taskId,
      payload,
      options
    );
  }

  static async publishWaiterTaskEscalated(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId | null,
    taskId: string | Types.ObjectId,
    payload: unknown,
    options?: PublishOptions
  ): Promise<IIntegrationEventQueue | null> {
    return this.createEvent(
      tenantId,
      outletId,
      RealtimeEvent.WAITER_TASK_ESCALATED,
      "WAITER_TASK",
      taskId,
      payload,
      options
    );
  }

  static async publishItemFireRequested(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId | null,
    orderId: string | Types.ObjectId,
    payload: unknown,
    options?: PublishOptions
  ): Promise<IIntegrationEventQueue | null> {
    return this.createEvent(
      tenantId,
      outletId,
      RealtimeEvent.ITEM_FIRE_REQUESTED,
      "ORDER",
      orderId,
      payload,
      options
    );
  }

  static async publishQRAssistanceRequested(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId | null,
    tableId: string | Types.ObjectId,
    payload: unknown,
    options?: PublishOptions
  ): Promise<IIntegrationEventQueue | null> {
    return this.createEvent(
      tenantId,
      outletId,
      RealtimeEvent.QR_ASSISTANCE_REQUESTED,
      "TABLE",
      tableId,
      payload,
      options
    );
  }

  static async publishTableUnmerged(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId | null,
    tableId: string | Types.ObjectId,
    payload: unknown,
    options?: PublishOptions
  ): Promise<IIntegrationEventQueue | null> {
    return this.createEvent(
      tenantId,
      outletId,
      RealtimeEvent.TABLE_UNMERGED,
      "TABLE",
      tableId,
      payload,
      options
    );
  }

  static async publishSeatMoved(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId | null,
    tableId: string | Types.ObjectId,
    payload: unknown,
    options?: PublishOptions
  ): Promise<IIntegrationEventQueue | null> {
    return this.createEvent(
      tenantId,
      outletId,
      RealtimeEvent.SEAT_MOVED,
      "TABLE",
      tableId,
      payload,
      options
    );
  }

  static async publishSeatSwapped(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId | null,
    tableId: string | Types.ObjectId,
    payload: unknown,
    options?: PublishOptions
  ): Promise<IIntegrationEventQueue | null> {
    return this.createEvent(
      tenantId,
      outletId,
      RealtimeEvent.SEAT_SWAPPED,
      "TABLE",
      tableId,
      payload,
      options
    );
  }

  static async publishWaiterChanged(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId | null,
    tableId: string | Types.ObjectId,
    payload: unknown,
    options?: PublishOptions
  ): Promise<IIntegrationEventQueue | null> {
    return this.createEvent(
      tenantId,
      outletId,
      RealtimeEvent.WAITER_CHANGED,
      "TABLE",
      tableId,
      payload,
      options
    );
  }

  static async publishSessionClosed(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId | null,
    tableId: string | Types.ObjectId,
    payload: unknown,
    options?: PublishOptions
  ): Promise<IIntegrationEventQueue | null> {
    return this.createEvent(
      tenantId,
      outletId,
      RealtimeEvent.SESSION_CLOSED,
      "TABLE",
      tableId,
      payload,
      options
    );
  }

  static async publishSeatAdded(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId | null,
    tableId: string | Types.ObjectId,
    payload: unknown,
    options?: PublishOptions
  ): Promise<IIntegrationEventQueue | null> {
    return this.createEvent(
      tenantId,
      outletId,
      RealtimeEvent.SEAT_ADDED,
      "TABLE",
      tableId,
      payload,
      options
    );
  }

  static async publishSeatRemoved(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId | null,
    tableId: string | Types.ObjectId,
    payload: unknown,
    options?: PublishOptions
  ): Promise<IIntegrationEventQueue | null> {
    return this.createEvent(
      tenantId,
      outletId,
      RealtimeEvent.SEAT_REMOVED,
      "TABLE",
      tableId,
      payload,
      options
    );
  }

  static async publishGuestCountChanged(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId | null,
    tableId: string | Types.ObjectId,
    payload: unknown,
    options?: PublishOptions
  ): Promise<IIntegrationEventQueue | null> {
    return this.createEvent(
      tenantId,
      outletId,
      RealtimeEvent.GUEST_COUNT_CHANGED,
      "TABLE",
      tableId,
      payload,
      options
    );
  }

  // ─── KDS / Course Management Publishers ─────────────────────────────────────

  static async publishItemFired(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId | null,
    orderItemId: string | Types.ObjectId,
    payload: unknown,
    options?: PublishOptions
  ): Promise<IIntegrationEventQueue | null> {
    return this.createEvent(
      tenantId,
      outletId,
      RealtimeEvent.ITEM_FIRED,
      "ORDER_ITEM",
      orderItemId,
      payload,
      options
    );
  }

  static async publishItemHeld(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId | null,
    orderItemId: string | Types.ObjectId,
    payload: unknown,
    options?: PublishOptions
  ): Promise<IIntegrationEventQueue | null> {
    return this.createEvent(
      tenantId,
      outletId,
      RealtimeEvent.ITEM_HELD,
      "ORDER_ITEM",
      orderItemId,
      payload,
      options
    );
  }

  static async publishCourseFired(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId | null,
    orderId: string | Types.ObjectId,
    payload: unknown,
    options?: PublishOptions
  ): Promise<IIntegrationEventQueue | null> {
    return this.createEvent(
      tenantId,
      outletId,
      RealtimeEvent.COURSE_FIRED,
      "ORDER",
      orderId,
      payload,
      options
    );
  }

  // ─── Billing Publishers ──────────────────────────────────────────────────────

  static async publishBillRequested(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId | null,
    billSessionId: string | Types.ObjectId,
    payload: unknown,
    options?: PublishOptions
  ): Promise<IIntegrationEventQueue | null> {
    return this.createEvent(
      tenantId,
      outletId,
      RealtimeEvent.BILL_REQUESTED,
      "BILL_SESSION",
      billSessionId,
      payload,
      options
    );
  }

  static async publishBillSplitCreated(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId | null,
    billSessionId: string | Types.ObjectId,
    payload: unknown,
    options?: PublishOptions
  ): Promise<IIntegrationEventQueue | null> {
    return this.createEvent(
      tenantId,
      outletId,
      RealtimeEvent.BILL_SPLIT_CREATED,
      "BILL_SESSION",
      billSessionId,
      payload,
      options
    );
  }

  static async publishBillSettled(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId | null,
    billSessionId: string | Types.ObjectId,
    payload: unknown,
    options?: PublishOptions
  ): Promise<IIntegrationEventQueue | null> {
    return this.createEvent(
      tenantId,
      outletId,
      RealtimeEvent.BILL_SETTLED,
      "BILL_SESSION",
      billSessionId,
      payload,
      options
    );
  }

  static async publishOutletStatusChanged(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId,
    payload: unknown,
    options?: PublishOptions
  ): Promise<IIntegrationEventQueue | null> {
    return this.createEvent(
      tenantId,
      outletId,
      RealtimeEvent.OUTLET_STATUS_CHANGED,
      "OUTLET",
      outletId,
      payload,
      options
    );
  }

  static async publishDiningAreaCreated(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId,
    diningAreaId: string | Types.ObjectId,
    payload: unknown,
    options?: PublishOptions
  ): Promise<IIntegrationEventQueue | null> {
    return this.createEvent(
      tenantId,
      outletId,
      RealtimeEvent.DINING_AREA_CREATED,
      "DINING_AREA",
      diningAreaId,
      payload,
      options
    );
  }

  static async publishDiningAreaUpdated(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId,
    diningAreaId: string | Types.ObjectId,
    payload: unknown,
    options?: PublishOptions
  ): Promise<IIntegrationEventQueue | null> {
    return this.createEvent(
      tenantId,
      outletId,
      RealtimeEvent.DINING_AREA_UPDATED,
      "DINING_AREA",
      diningAreaId,
      payload,
      options
    );
  }

  static async publishDiningAreaArchived(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId,
    diningAreaId: string | Types.ObjectId,
    payload: unknown,
    options?: PublishOptions
  ): Promise<IIntegrationEventQueue | null> {
    return this.createEvent(
      tenantId,
      outletId,
      RealtimeEvent.DINING_AREA_ARCHIVED,
      "DINING_AREA",
      diningAreaId,
      payload,
      options
    );
  }
}
