import DineInSession from '../models/dinein-session.model.js';
import DineInSeat from '../models/dinein-seat.model.js';
import DineInGuest from '../models/dinein-guest.model.js';
import type { RequestScope } from '../interfaces/request-scope.interface.js';
import { ensureObjectId } from '../utils/objectId.js';

export class SessionRepository {
  async create(scope: RequestScope, payload: Record<string, unknown>) {
    return DineInSession.create({
      ...payload,
      tenantId: ensureObjectId(scope.tenantId, 'tenantId'),
      outletId: ensureObjectId(scope.outletId, 'outletId'),
      createdBy: scope.userId ? ensureObjectId(scope.userId, 'userId') : null,
      updatedBy: scope.userId ? ensureObjectId(scope.userId, 'userId') : null,
    });
  }

  async findById(scope: RequestScope, sessionId: string) {
    return DineInSession.findOne({
      _id: ensureObjectId(sessionId, 'sessionId'),
      tenantId: ensureObjectId(scope.tenantId, 'tenantId'),
      outletId: ensureObjectId(scope.outletId, 'outletId'),
    });
  }

  async listActive(scope: RequestScope) {
    return DineInSession.find({
      tenantId: ensureObjectId(scope.tenantId, 'tenantId'),
      outletId: ensureObjectId(scope.outletId, 'outletId'),
      status: { $ne: 'CLOSED' },
    }).sort({ openedAt: -1 });
  }

  async createGuest(payload: Record<string, unknown>) {
    return DineInGuest.create(payload);
  }

  async createSeat(payload: Record<string, unknown>) {
    return DineInSeat.create(payload);
  }

  async listSeatsBySession(sessionId: string) {
    return DineInSeat.find({ sessionId: ensureObjectId(sessionId, 'sessionId') }).sort({ seatNumber: 1 });
  }
}
