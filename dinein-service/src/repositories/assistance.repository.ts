import DineInAssistanceRequest from '../models/dinein-assistance-request.model.js';
import type { RequestScope } from '../interfaces/request-scope.interface.js';
import { ensureObjectId } from '../utils/objectId.js';

export class AssistanceRepository {
  async create(scope: RequestScope, payload: Record<string, unknown>) {
    return DineInAssistanceRequest.create({
      ...payload,
      tenantId: ensureObjectId(scope.tenantId, 'tenantId'),
      outletId: ensureObjectId(scope.outletId, 'outletId'),
    });
  }

  async list(scope: RequestScope) {
    return DineInAssistanceRequest.find({
      tenantId: ensureObjectId(scope.tenantId, 'tenantId'),
      outletId: ensureObjectId(scope.outletId, 'outletId'),
    }).sort({ createdAt: -1 });
  }

  async findById(scope: RequestScope, requestId: string) {
    return DineInAssistanceRequest.findOne({
      _id: ensureObjectId(requestId, 'requestId'),
      tenantId: ensureObjectId(scope.tenantId, 'tenantId'),
      outletId: ensureObjectId(scope.outletId, 'outletId'),
    });
  }
}
