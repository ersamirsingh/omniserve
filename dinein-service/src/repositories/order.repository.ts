import DineInOrder from '../models/dinein-order.model.js';
import DineInOrderItem from '../models/dinein-order-item.model.js';
import type { RequestScope } from '../interfaces/request-scope.interface.js';
import { ensureObjectId } from '../utils/objectId.js';

export class OrderRepository {
  async createOrder(scope: RequestScope, payload: Record<string, unknown>) {
    return DineInOrder.create({
      ...payload,
      tenantId: ensureObjectId(scope.tenantId, 'tenantId'),
      outletId: ensureObjectId(scope.outletId, 'outletId'),
      createdBy: scope.userId ? ensureObjectId(scope.userId, 'userId') : null,
      updatedBy: scope.userId ? ensureObjectId(scope.userId, 'userId') : null,
    });
  }

  async createOrderItems(items: Array<Record<string, unknown>>) {
    return DineInOrderItem.insertMany(items);
  }

  async listOrders(scope: RequestScope) {
    return DineInOrder.find({
      tenantId: ensureObjectId(scope.tenantId, 'tenantId'),
      outletId: ensureObjectId(scope.outletId, 'outletId'),
    }).sort({ createdAt: -1 });
  }

  async findOrder(scope: RequestScope, orderId: string) {
    return DineInOrder.findOne({
      _id: ensureObjectId(orderId, 'orderId'),
      tenantId: ensureObjectId(scope.tenantId, 'tenantId'),
      outletId: ensureObjectId(scope.outletId, 'outletId'),
    });
  }

  async listOrderItems(orderId: string) {
    return DineInOrderItem.find({ orderId: ensureObjectId(orderId, 'orderId') }).sort({ createdAt: 1 });
  }

  async listSessionOrderItems(sessionId: string) {
    return DineInOrderItem.find({ sessionId: ensureObjectId(sessionId, 'sessionId') }).sort({ createdAt: 1 });
  }
}
