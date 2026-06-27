import { ApiError } from '../utils/ApiError.js';
import { ReservationRepository } from '../repositories/reservation.repository.js';
import type { RequestScope } from '../interfaces/request-scope.interface.js';
import { DINEIN_EVENTS } from '../constants/events.constants.js';
import { SOCKET_EVENTS } from '../constants/socket-events.constants.js';
import { ReservationStatus } from '../constants/table-states.constants.js';
import { emitOutletEvent } from '../socket/socket.server.js';
import { eventBus } from '../events/event-bus.js';
import { ensureObjectId } from '../utils/objectId.js';

export class ReservationService {
  constructor(private readonly reservationRepository = new ReservationRepository()) {}

  list(scope: RequestScope) {
    return this.reservationRepository.list(scope);
  }

  async create(scope: RequestScope, payload: Record<string, unknown>) {
    const reservedFor = payload.reservedFor as Date;
    const expiresAt = new Date(reservedFor.getTime() - 15 * 60 * 1000);

    const reservation = await this.reservationRepository.create(scope, {
      ...payload,
      tableId: payload.tableId ? ensureObjectId(String(payload.tableId), 'tableId') : null,
      reservedFor,
      expiresAt,
    });

    eventBus.publish({
      name: DINEIN_EVENTS.RESERVATION_CREATED,
      aggregateId: reservation.id,
      tenantId: scope.tenantId,
      outletId: scope.outletId,
      payload: { reservationId: reservation.id },
      occurredAt: new Date(),
    });

    emitOutletEvent(scope.outletId, SOCKET_EVENTS.RESERVATION_CREATED, reservation);
    return reservation;
  }

  async confirm(scope: RequestScope, reservationId: string, tableId?: string) {
    const reservation = await this.ensureReservation(scope, reservationId);
    reservation.status = ReservationStatus.CONFIRMED;
    reservation.confirmedAt = new Date();
    reservation.tableId = tableId ? ensureObjectId(tableId, 'tableId') : reservation.tableId;
    if (scope.userId) {
      reservation.confirmedBy = ensureObjectId(scope.userId, 'userId');
    }
    await reservation.save();
    emitOutletEvent(scope.outletId, SOCKET_EVENTS.RESERVATION_UPDATED, reservation);
    return reservation;
  }

  async cancel(scope: RequestScope, reservationId: string, reason: string) {
    const reservation = await this.ensureReservation(scope, reservationId);
    reservation.status = ReservationStatus.CANCELLED;
    reservation.cancelledAt = new Date();
    reservation.cancellationReason = reason;
    await reservation.save();
    eventBus.publish({
      name: DINEIN_EVENTS.RESERVATION_CANCELLED,
      aggregateId: reservation.id,
      tenantId: scope.tenantId,
      outletId: scope.outletId,
      payload: { reservationId: reservation.id, reason },
      occurredAt: new Date(),
    });
    emitOutletEvent(scope.outletId, SOCKET_EVENTS.RESERVATION_UPDATED, reservation);
    return reservation;
  }

  private async ensureReservation(scope: RequestScope, reservationId: string) {
    const reservation = await this.reservationRepository.findById(scope, reservationId);
    if (!reservation) {
      throw ApiError.notFound('Reservation');
    }
    return reservation;
  }
}
