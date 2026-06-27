import { ApiError } from '../utils/ApiError.js';
import { BillRepository } from '../repositories/bill.repository.js';
import { OrderRepository } from '../repositories/order.repository.js';
import { SessionRepository } from '../repositories/session.repository.js';
import { TableRepository } from '../repositories/table.repository.js';
import type { RequestScope } from '../interfaces/request-scope.interface.js';
import { DINEIN_EVENTS } from '../constants/events.constants.js';
import { SOCKET_EVENTS } from '../constants/socket-events.constants.js';
import { DineInPaymentStatus, SessionStatus, TableStatus } from '../constants/table-states.constants.js';
import { emitOutletEvent, emitSessionEvent, emitTableEvent } from '../socket/socket.server.js';
import { eventBus } from '../events/event-bus.js';
import { ensureObjectId } from '../utils/objectId.js';

export class BillingService {
  constructor(
    private readonly billRepository = new BillRepository(),
    private readonly orderRepository = new OrderRepository(),
    private readonly sessionRepository = new SessionRepository(),
    private readonly tableRepository = new TableRepository()
  ) {}

  async generate(scope: RequestScope, payload: Record<string, unknown>) {
    const existingBill = await this.billRepository.findBySession(scope, String(payload.sessionId));
    if (existingBill) {
      return existingBill;
    }

    const [session, table, orderItems] = await Promise.all([
      this.sessionRepository.findById(scope, String(payload.sessionId)),
      this.tableRepository.findById(scope, String(payload.tableId)),
      this.orderRepository.listSessionOrderItems(String(payload.sessionId)),
    ]);

    if (!session || !table) {
      throw ApiError.badRequest('Invalid session or table');
    }

    const subtotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const discount = Number(payload.discount ?? 0);
    const couponDiscount = Number(payload.couponDiscount ?? 0);
    const tip = Number(payload.tip ?? 0);
    const serviceChargeRate = Number(payload.serviceChargeRate ?? 5);
    const serviceCharge = Number(((subtotal - discount - couponDiscount) * (serviceChargeRate / 100)).toFixed(2));
    const tax = Number(((subtotal - discount - couponDiscount + serviceCharge) * 0.05).toFixed(2));
    const totalAmount = Number(
      (subtotal - discount - couponDiscount + serviceCharge + tax + tip).toFixed(2)
    );

    const bill = await this.billRepository.create(scope, {
      sessionId: session._id,
      tableId: table._id,
      lineItems: orderItems.map((item) => ({
        orderItemId: item._id,
        menuItemId: item.menuItemId,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      })),
      subtotal,
      tax,
      cgst: tax / 2,
      sgst: tax / 2,
      igst: 0,
      serviceCharge,
      serviceChargeRate,
      discount,
      couponCode: payload.couponCode,
      couponDiscount,
      tip,
      roundOff: 0,
      totalAmount,
      splitType: payload.splitType,
      splitCount: payload.splitCount,
      paymentStatus: DineInPaymentStatus.PENDING,
      paidAmount: 0,
      pendingAmount: totalAmount,
      notes: payload.notes,
    });

    session.billId = bill._id;
    session.status = SessionStatus.BILLED;
    await session.save();

    table.status = TableStatus.BILL_REQUESTED;
    await table.save();

    eventBus.publish({
      name: DINEIN_EVENTS.BILL_GENERATED,
      aggregateId: bill.id,
      tenantId: scope.tenantId,
      outletId: scope.outletId,
      payload: { billId: bill.id },
      occurredAt: new Date(),
    });

    emitSessionEvent(session.id, SOCKET_EVENTS.BILL_GENERATED, bill);
    emitTableEvent(table.id, SOCKET_EVENTS.BILL_REQUESTED, bill);
    emitOutletEvent(scope.outletId, SOCKET_EVENTS.BILL_GENERATED, bill);
    return bill;
  }

  async getBySession(scope: RequestScope, sessionId: string) {
    const bill = await this.billRepository.findBySession(scope, sessionId);
    if (!bill) {
      throw ApiError.notFound('Bill');
    }
    return bill;
  }

  async recordPayment(scope: RequestScope, billId: string, amount: number) {
    const bill = await this.billRepository.findById(scope, billId);
    if (!bill) {
      throw ApiError.notFound('Bill');
    }

    bill.paidAmount += amount;
    bill.pendingAmount = Number((bill.totalAmount - bill.paidAmount).toFixed(2));
    bill.paymentStatus =
      bill.pendingAmount <= 0 ? DineInPaymentStatus.COMPLETED : DineInPaymentStatus.PENDING;
    if (bill.paymentStatus === DineInPaymentStatus.COMPLETED) {
      bill.paidAt = new Date();
    }
    await bill.save();

    const session = await this.sessionRepository.findById(scope, bill.sessionId.toString());
    const table = await this.tableRepository.findById(scope, bill.tableId.toString());

    if (session && bill.paymentStatus === DineInPaymentStatus.COMPLETED) {
      session.status = SessionStatus.CLOSED;
      session.closedAt = new Date();
      session.durationMinutes = Math.max(
        1,
        Math.round((session.closedAt.getTime() - session.openedAt.getTime()) / 60000)
      );
      await session.save();
    }

    if (table && bill.paymentStatus === DineInPaymentStatus.COMPLETED) {
      table.activeSessionId = null;
      table.status = TableStatus.CLEANING;
      await table.save();
    }

    eventBus.publish({
      name: DINEIN_EVENTS.PAYMENT_COMPLETED,
      aggregateId: bill.id,
      tenantId: scope.tenantId,
      outletId: scope.outletId,
      payload: { billId: bill.id, amount, paymentStatus: bill.paymentStatus },
      occurredAt: new Date(),
    });

    emitOutletEvent(scope.outletId, SOCKET_EVENTS.PAYMENT_COMPLETED, bill);
    if (session) {
      emitSessionEvent(session.id, SOCKET_EVENTS.PAYMENT_COMPLETED, bill);
    }
    if (table) {
      emitTableEvent(table.id, SOCKET_EVENTS.PAYMENT_COMPLETED, bill);
    }

    return bill;
  }
}
