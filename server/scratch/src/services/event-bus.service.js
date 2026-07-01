import { Types } from "mongoose";
import IntegrationEventQueue from "../models/integration-event-queue.model.js";
import { RealtimeEvent } from "../types/socket-events.js";
export class EventBusService {
    /**
     * Helper to write a new event to the integration event outbox queue.
     * Handles deduplication gracefully by catching MongoDB unique index errors.
     */
    static async createEvent(tenantId, outletId, eventType, aggregateType, aggregateId, payload, options = {}) {
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
        }
        catch (error) {
            // Catch MongoDB unique index/duplicate key error (code 11000)
            if (error.code === 11000) {
                console.warn(`[EventBusService] Deduplicated duplicate event creation. eventType=${eventType}, aggregateId=${aggregateId}, correlationId=${correlationId}, version=${eventVersion}`);
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
    static async publishOrderCreated(tenantId, outletId, orderId, payload, options) {
        return this.createEvent(tenantId, outletId, RealtimeEvent.ORDER_CREATED, "ORDER", orderId, payload, options);
    }
    static async publishOrderStatusChanged(tenantId, outletId, orderId, payload, options) {
        return this.createEvent(tenantId, outletId, RealtimeEvent.ORDER_STATUS_CHANGED, "ORDER", orderId, payload, options);
    }
    static async publishInventoryChanged(tenantId, outletId, inventoryId, payload, options) {
        return this.createEvent(tenantId, outletId, RealtimeEvent.INVENTORY_CHANGED, "INVENTORY", inventoryId, payload, options);
    }
    static async publishMenuChanged(tenantId, outletId, aggregateId, aggregateType, // Or others depending on catalog structure
    payload, options) {
        return this.createEvent(tenantId, outletId, RealtimeEvent.MENU_CHANGED, aggregateType, aggregateId, payload, options);
    }
    static async publishCartCreated(tenantId, outletId, cartId, payload, options) {
        return this.createEvent(tenantId, outletId, RealtimeEvent.CART_CREATED, "CART", cartId, payload, options);
    }
    static async publishCartUpdated(tenantId, outletId, cartId, payload, options) {
        return this.createEvent(tenantId, outletId, RealtimeEvent.CART_UPDATED, "CART", cartId, payload, options);
    }
    static async publishCheckoutStarted(tenantId, outletId, cartId, payload, options) {
        return this.createEvent(tenantId, outletId, RealtimeEvent.CHECKOUT_STARTED, "CART", cartId, payload, options);
    }
    static async publishTableOccupied(tenantId, outletId, tableId, payload, options) {
        return this.createEvent(tenantId, outletId, RealtimeEvent.TABLE_OCCUPIED, "TABLE", tableId, payload, options);
    }
    static async publishTableAvailable(tenantId, outletId, tableId, payload, options) {
        return this.createEvent(tenantId, outletId, RealtimeEvent.TABLE_AVAILABLE, "TABLE", tableId, payload, options);
    }
    static async publishTableReserved(tenantId, outletId, tableId, payload, options) {
        return this.createEvent(tenantId, outletId, RealtimeEvent.TABLE_RESERVED, "TABLE", tableId, payload, options);
    }
    static async publishTableTransferred(tenantId, outletId, tableId, payload, options) {
        return this.createEvent(tenantId, outletId, RealtimeEvent.TABLE_TRANSFERRED, "TABLE", tableId, payload, options);
    }
    static async publishTableMerged(tenantId, outletId, tableId, payload, options) {
        return this.createEvent(tenantId, outletId, RealtimeEvent.TABLE_MERGED, "TABLE", tableId, payload, options);
    }
    static async publishTableCleaningStarted(tenantId, outletId, tableId, payload, options) {
        return this.createEvent(tenantId, outletId, RealtimeEvent.TABLE_CLEANING_STARTED, "TABLE", tableId, payload, options);
    }
    static async publishTableCleaningCompleted(tenantId, outletId, tableId, payload, options) {
        return this.createEvent(tenantId, outletId, RealtimeEvent.TABLE_CLEANING_COMPLETED, "TABLE", tableId, payload, options);
    }
    static async publishTableStatusChanged(tenantId, outletId, tableId, payload, options) {
        return this.createEvent(tenantId, outletId, RealtimeEvent.TABLE_STATUS_CHANGED, "TABLE", tableId, payload, options);
    }
    static async publishWaiterTaskCreated(tenantId, outletId, taskId, payload, options) {
        return this.createEvent(tenantId, outletId, RealtimeEvent.WAITER_TASK_CREATED, "WAITER_TASK", taskId, payload, options);
    }
    static async publishWaiterTaskAcknowledged(tenantId, outletId, taskId, payload, options) {
        return this.createEvent(tenantId, outletId, RealtimeEvent.WAITER_TASK_ACKNOWLEDGED, "WAITER_TASK", taskId, payload, options);
    }
    static async publishWaiterTaskCompleted(tenantId, outletId, taskId, payload, options) {
        return this.createEvent(tenantId, outletId, RealtimeEvent.WAITER_TASK_COMPLETED, "WAITER_TASK", taskId, payload, options);
    }
    static async publishWaiterTaskAssigned(tenantId, outletId, taskId, payload, options) {
        return this.createEvent(tenantId, outletId, RealtimeEvent.WAITER_TASK_ASSIGNED, "WAITER_TASK", taskId, payload, options);
    }
    static async publishWaiterTaskInProgress(tenantId, outletId, taskId, payload, options) {
        return this.createEvent(tenantId, outletId, RealtimeEvent.WAITER_TASK_IN_PROGRESS, "WAITER_TASK", taskId, payload, options);
    }
    static async publishWaiterTaskCancelled(tenantId, outletId, taskId, payload, options) {
        return this.createEvent(tenantId, outletId, RealtimeEvent.WAITER_TASK_CANCELLED, "WAITER_TASK", taskId, payload, options);
    }
    static async publishWaiterTaskEscalated(tenantId, outletId, taskId, payload, options) {
        return this.createEvent(tenantId, outletId, RealtimeEvent.WAITER_TASK_ESCALATED, "WAITER_TASK", taskId, payload, options);
    }
    static async publishItemFireRequested(tenantId, outletId, orderId, payload, options) {
        return this.createEvent(tenantId, outletId, RealtimeEvent.ITEM_FIRE_REQUESTED, "ORDER", orderId, payload, options);
    }
    static async publishQRAssistanceRequested(tenantId, outletId, tableId, payload, options) {
        return this.createEvent(tenantId, outletId, RealtimeEvent.QR_ASSISTANCE_REQUESTED, "TABLE", tableId, payload, options);
    }
    static async publishTableUnmerged(tenantId, outletId, tableId, payload, options) {
        return this.createEvent(tenantId, outletId, RealtimeEvent.TABLE_UNMERGED, "TABLE", tableId, payload, options);
    }
    static async publishSeatMoved(tenantId, outletId, tableId, payload, options) {
        return this.createEvent(tenantId, outletId, RealtimeEvent.SEAT_MOVED, "TABLE", tableId, payload, options);
    }
    static async publishSeatSwapped(tenantId, outletId, tableId, payload, options) {
        return this.createEvent(tenantId, outletId, RealtimeEvent.SEAT_SWAPPED, "TABLE", tableId, payload, options);
    }
    static async publishWaiterChanged(tenantId, outletId, tableId, payload, options) {
        return this.createEvent(tenantId, outletId, RealtimeEvent.WAITER_CHANGED, "TABLE", tableId, payload, options);
    }
    static async publishSessionClosed(tenantId, outletId, tableId, payload, options) {
        return this.createEvent(tenantId, outletId, RealtimeEvent.SESSION_CLOSED, "TABLE", tableId, payload, options);
    }
    static async publishSeatAdded(tenantId, outletId, tableId, payload, options) {
        return this.createEvent(tenantId, outletId, RealtimeEvent.SEAT_ADDED, "TABLE", tableId, payload, options);
    }
    static async publishSeatRemoved(tenantId, outletId, tableId, payload, options) {
        return this.createEvent(tenantId, outletId, RealtimeEvent.SEAT_REMOVED, "TABLE", tableId, payload, options);
    }
    static async publishGuestCountChanged(tenantId, outletId, tableId, payload, options) {
        return this.createEvent(tenantId, outletId, RealtimeEvent.GUEST_COUNT_CHANGED, "TABLE", tableId, payload, options);
    }
}
