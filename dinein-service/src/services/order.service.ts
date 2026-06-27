import { ApiError } from '../utils/ApiError.js';
import { DINEIN_EVENTS } from '../constants/events.constants.js';
import { SOCKET_EVENTS } from '../constants/socket-events.constants.js';
import { DineInOrderStatus, OrderItemStatus, TableStatus } from '../constants/table-states.constants.js';
import { OrderRepository } from '../repositories/order.repository.js';
import { TableRepository } from '../repositories/table.repository.js';
import { SessionRepository } from '../repositories/session.repository.js';
import type { RequestScope } from '../interfaces/request-scope.interface.js';
import { emitOutletEvent, emitSessionEvent, emitTableEvent } from '../socket/socket.server.js';
import { eventBus } from '../events/event-bus.js';
import { ensureObjectId } from '../utils/objectId.js';

type OrderItemInput = {
  menuItemId: string;
  variantId?: string;
  name: string;
  description?: string;
  category?: string;
  quantity: number;
  unitPrice: number;
  addons?: Array<{ addonId: string; name: string; price: number }>;
  notes?: string;
  guestId?: string;
  seatId?: string;
};

export class OrderService {
  constructor(
    private readonly orderRepository = new OrderRepository(),
    private readonly tableRepository = new TableRepository(),
    private readonly sessionRepository = new SessionRepository()
  ) {}

  list(scope: RequestScope) {
    return this.orderRepository.listOrders(scope);
  }

  async create(scope: RequestScope, payload: Record<string, unknown>) {
    const table = await this.tableRepository.findById(scope, String(payload.tableId));
    const session = await this.sessionRepository.findById(scope, String(payload.sessionId));

    if (!table || !session) {
      throw ApiError.badRequest('Invalid table or session');
    }

    const items = payload.items as OrderItemInput[];
    const subtotal = items.reduce((sum, item) => {
      const addonsTotal = (item.addons ?? []).reduce((addonSum, addon) => addonSum + addon.price, 0);
      return sum + item.quantity * (item.unitPrice + addonsTotal);
    }, 0);

    const tax = Number((subtotal * 0.05).toFixed(2));
    const totalAmount = subtotal + tax;

    const order = await this.orderRepository.createOrder(scope, {
      sessionId: session._id,
      tableId: table._id,
      sectionId: ensureObjectId(String(payload.sectionId), 'sectionId'),
      guestId: payload.guestId ? ensureObjectId(String(payload.guestId), 'guestId') : null,
      waiterId: payload.waiterId ? ensureObjectId(String(payload.waiterId), 'waiterId') : null,
      notes: payload.notes,
      subtotal,
      tax,
      totalAmount,
      taxBreakdown: {
        cgst: tax / 2,
        sgst: tax / 2,
        igst: 0,
        total: tax,
      },
      status: DineInOrderStatus.PLACED,
      placedAt: new Date(),
    });

    const orderItems = await this.orderRepository.createOrderItems(
      items.map((item) => {
        const addonsTotal = (item.addons ?? []).reduce((sum, addon) => sum + addon.price, 0);
        return {
          tenantId: ensureObjectId(scope.tenantId, 'tenantId'),
          outletId: ensureObjectId(scope.outletId, 'outletId'),
          orderId: order._id,
          sessionId: session._id,
          menuItemId: ensureObjectId(item.menuItemId, 'menuItemId'),
          variantId: item.variantId ? ensureObjectId(item.variantId, 'variantId') : null,
          name: item.name,
          description: item.description,
          category: item.category,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          addons: (item.addons ?? []).map((addon) => ({
            addonId: ensureObjectId(addon.addonId, 'addonId'),
            name: addon.name,
            price: addon.price,
          })),
          addonsTotal,
          totalPrice: item.quantity * (item.unitPrice + addonsTotal),
          notes: item.notes,
          guestId: item.guestId ? ensureObjectId(item.guestId, 'guestId') : null,
          seatId: item.seatId ? ensureObjectId(item.seatId, 'seatId') : null,
          status: OrderItemStatus.PENDING,
        };
      })
    );

    session.activeOrderIds.push(order._id);
    await session.save();

    table.status = TableStatus.ORDERING;
    await table.save();

    eventBus.publish({
      name: DINEIN_EVENTS.ORDER_CREATED,
      aggregateId: order.id,
      tenantId: scope.tenantId,
      outletId: scope.outletId,
      payload: { orderId: order.id },
      occurredAt: new Date(),
    });

    emitSessionEvent(session.id, SOCKET_EVENTS.ORDER_CREATED, { order, items: orderItems });
    emitTableEvent(table.id, SOCKET_EVENTS.ORDER_CREATED, { order, items: orderItems });
    emitOutletEvent(scope.outletId, SOCKET_EVENTS.ORDER_CREATED, { order, items: orderItems });

    return { order, items: orderItems };
  }

  async updateStatus(scope: RequestScope, orderId: string, status: DineInOrderStatus) {
    const order = await this.orderRepository.findOrder(scope, orderId);
    if (!order) {
      throw ApiError.notFound('Order');
    }

    order.status = status;

    if (status === DineInOrderStatus.CONFIRMED) {
      order.confirmedAt = new Date();
    }
    if (status === DineInOrderStatus.COMPLETED) {
      order.completedAt = new Date();
    }
    if (status === DineInOrderStatus.CANCELLED) {
      order.cancelledAt = new Date();
    }

    await order.save();

    const table = await this.tableRepository.findById(scope, order.tableId.toString());
    if (table) {
      table.status =
        status === DineInOrderStatus.READY
          ? TableStatus.READY
          : status === DineInOrderStatus.SERVED
            ? TableStatus.SERVED
            : status === DineInOrderStatus.COMPLETED
              ? TableStatus.BILL_REQUESTED
              : TableStatus.PREPARING;
      await table.save();
    }

    emitSessionEvent(order.sessionId.toString(), SOCKET_EVENTS.ORDER_UPDATED, order);
    emitOutletEvent(scope.outletId, SOCKET_EVENTS.ORDER_UPDATED, order);
    return order;
  }
}
