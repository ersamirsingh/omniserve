import DineInBill from '../models/dinein-bill.model.js';
import type { RequestScope } from '../interfaces/request-scope.interface.js';
import { ensureObjectId } from '../utils/objectId.js';

export class BillRepository {
  async create(scope: RequestScope, payload: Record<string, unknown>) {
    return DineInBill.create({
      ...payload,
      tenantId: ensureObjectId(scope.tenantId, 'tenantId'),
      outletId: ensureObjectId(scope.outletId, 'outletId'),
      generatedBy: scope.userId ? ensureObjectId(scope.userId, 'userId') : null,
    });
  }

  async findById(scope: RequestScope, billId: string) {
    return DineInBill.findOne({
      _id: ensureObjectId(billId, 'billId'),
      tenantId: ensureObjectId(scope.tenantId, 'tenantId'),
      outletId: ensureObjectId(scope.outletId, 'outletId'),
    });
  }

  async findBySession(scope: RequestScope, sessionId: string) {
    return DineInBill.findOne({
      sessionId: ensureObjectId(sessionId, 'sessionId'),
      tenantId: ensureObjectId(scope.tenantId, 'tenantId'),
      outletId: ensureObjectId(scope.outletId, 'outletId'),
    });
  }
}
