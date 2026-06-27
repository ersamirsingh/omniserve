import DineInReservation from '../models/dinein-reservation.model.js';
import type { RequestScope } from '../interfaces/request-scope.interface.js';
import { ensureObjectId } from '../utils/objectId.js';

export class ReservationRepository {
  async create(scope: RequestScope, payload: Record<string, unknown>) {
    return DineInReservation.create({
      ...payload,
      tenantId: ensureObjectId(scope.tenantId, 'tenantId'),
      outletId: ensureObjectId(scope.outletId, 'outletId'),
      createdBy: scope.userId ? ensureObjectId(scope.userId, 'userId') : null,
      updatedBy: scope.userId ? ensureObjectId(scope.userId, 'userId') : null,
    });
  }

  async list(scope: RequestScope) {
    return DineInReservation.find({
      tenantId: ensureObjectId(scope.tenantId, 'tenantId'),
      outletId: ensureObjectId(scope.outletId, 'outletId'),
    }).sort({ reservedFor: 1 });
  }

  async findById(scope: RequestScope, reservationId: string) {
    return DineInReservation.findOne({
      _id: ensureObjectId(reservationId, 'reservationId'),
      tenantId: ensureObjectId(scope.tenantId, 'tenantId'),
      outletId: ensureObjectId(scope.outletId, 'outletId'),
    });
  }
}
