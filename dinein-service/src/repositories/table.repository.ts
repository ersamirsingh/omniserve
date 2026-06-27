import DineInTable from '../models/dinein-table.model.js';
import type { RequestScope } from '../interfaces/request-scope.interface.js';
import { ensureObjectId } from '../utils/objectId.js';

export class TableRepository {
  async create(scope: RequestScope, payload: Record<string, unknown>) {
    return DineInTable.create({
      ...payload,
      tenantId: ensureObjectId(scope.tenantId, 'tenantId'),
      outletId: ensureObjectId(scope.outletId, 'outletId'),
      createdBy: scope.userId ? ensureObjectId(scope.userId, 'userId') : null,
      updatedBy: scope.userId ? ensureObjectId(scope.userId, 'userId') : null,
    });
  }

  async list(scope: RequestScope) {
    return DineInTable.find({
      tenantId: ensureObjectId(scope.tenantId, 'tenantId'),
      outletId: ensureObjectId(scope.outletId, 'outletId'),
    }).sort({ tableNumber: 1 });
  }

  async findById(scope: RequestScope, tableId: string) {
    return DineInTable.findOne({
      _id: ensureObjectId(tableId, 'tableId'),
      tenantId: ensureObjectId(scope.tenantId, 'tenantId'),
      outletId: ensureObjectId(scope.outletId, 'outletId'),
    });
  }
}
