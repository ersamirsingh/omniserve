import QRCode from 'qrcode';
import { ApiError } from '../utils/ApiError.js';
import { SessionRepository } from '../repositories/session.repository.js';
import { TableRepository } from '../repositories/table.repository.js';
import type { RequestScope } from '../interfaces/request-scope.interface.js';
import { DINEIN_EVENTS } from '../constants/events.constants.js';
import { SOCKET_EVENTS, SOCKET_ROOMS } from '../constants/socket-events.constants.js';
import { SeatStatus, SessionStatus, TableStatus } from '../constants/table-states.constants.js';
import { ensureObjectId } from '../utils/objectId.js';
import { eventBus } from '../events/event-bus.js';
import { emitOutletEvent, emitSessionEvent, getIo } from '../socket/socket.server.js';

export class SessionService {
  constructor(
    private readonly sessionRepository = new SessionRepository(),
    private readonly tableRepository = new TableRepository()
  ) {}

  async listActive(scope: RequestScope) {
    return this.sessionRepository.listActive(scope);
  }

  async open(scope: RequestScope, payload: Record<string, unknown>) {
    const table = await this.tableRepository.findById(scope, String(payload.tableId));

    if (!table) {
      throw ApiError.notFound('Table');
    }

    if (table.activeSessionId) {
      throw ApiError.conflict('Table already has an active session');
    }

    const session = await this.sessionRepository.create(scope, {
      ...payload,
      tableId: table._id,
      waiterId: payload.waiterId ? ensureObjectId(String(payload.waiterId), 'waiterId') : null,
      hostUserId: payload.hostUserId ? ensureObjectId(String(payload.hostUserId), 'hostUserId') : null,
    });

    table.activeSessionId = session._id;
    table.status = TableStatus.OCCUPIED;
    await table.save();

    const joinUrl = `${process.env.DINEIN_CONSOLE_URL ?? 'http://localhost:5173'}/join/${session.qrToken}`;
    const qrCodeDataUrl = await QRCode.toDataURL(joinUrl);

    eventBus.publish({
      name: DINEIN_EVENTS.SESSION_OPENED,
      aggregateId: session.id,
      tenantId: scope.tenantId,
      outletId: scope.outletId,
      payload: { sessionId: session.id, tableId: table.id },
      occurredAt: new Date(),
    });

    emitOutletEvent(scope.outletId, SOCKET_EVENTS.SESSION_STARTED, { session, qrCodeDataUrl, joinUrl });

    return { session, joinUrl, qrCodeDataUrl };
  }

  async join(scope: RequestScope, sessionId: string, payload: Record<string, unknown>) {
    const session = await this.ensureSession(scope, sessionId);
    const table = await this.tableRepository.findById(scope, session.tableId.toString());

    if (!table) {
      throw ApiError.notFound('Table');
    }

    const guest = await this.sessionRepository.createGuest({
      tenantId: ensureObjectId(scope.tenantId, 'tenantId'),
      outletId: ensureObjectId(scope.outletId, 'outletId'),
      sessionId: session._id,
      tableId: table._id,
      name: payload.guestName,
    });

    const seats = await this.sessionRepository.listSeatsBySession(session.id);
    const seatNumber = String(payload.seatNumber ?? `S${seats.length + 1}`);
    const seat = await this.sessionRepository.createSeat({
      tenantId: ensureObjectId(scope.tenantId, 'tenantId'),
      outletId: ensureObjectId(scope.outletId, 'outletId'),
      tableId: table._id,
      sessionId: session._id,
      seatNumber,
      status: SeatStatus.OCCUPIED,
      guestId: guest._id,
      guestName: guest.name,
    });

    session.guestCount += 1;
    session.status = SessionStatus.ORDERING;
    await session.save();

    const io = getIo();
    io?.to(SOCKET_ROOMS.session(session.id)).emit(SOCKET_EVENTS.CUSTOMER_JOINED, { guest, seat });
    emitSessionEvent(session.id, SOCKET_EVENTS.SEAT_UPDATED, { guest, seat });

    return { session, guest, seat };
  }

  async close(scope: RequestScope, sessionId: string, notes?: string) {
    const session = await this.ensureSession(scope, sessionId);
    if (session.status === SessionStatus.CLOSED) {
      throw ApiError.conflict('Session already closed');
    }

    session.status = SessionStatus.CLOSED;
    session.closedAt = new Date();
    session.notes = notes ?? session.notes;
    session.durationMinutes = Math.max(
      1,
      Math.round((session.closedAt.getTime() - session.openedAt.getTime()) / 60000)
    );
    await session.save();

    const table = await this.tableRepository.findById(scope, session.tableId.toString());
    if (table) {
      table.activeSessionId = null;
      table.status = TableStatus.CLEANING;
      await table.save();
    }

    eventBus.publish({
      name: DINEIN_EVENTS.SESSION_CLOSED,
      aggregateId: session.id,
      tenantId: scope.tenantId,
      outletId: scope.outletId,
      payload: { sessionId: session.id },
      occurredAt: new Date(),
    });

    emitSessionEvent(session.id, SOCKET_EVENTS.SESSION_CLOSED, session);
    emitOutletEvent(scope.outletId, SOCKET_EVENTS.SESSION_CLOSED, session);

    return session;
  }

  async getById(scope: RequestScope, sessionId: string) {
    const session = await this.ensureSession(scope, sessionId);
    const seats = await this.sessionRepository.listSeatsBySession(session.id);
    return { session, seats };
  }

  private async ensureSession(scope: RequestScope, sessionId: string) {
    const session = await this.sessionRepository.findById(scope, sessionId);
    if (!session) {
      throw ApiError.notFound('Session');
    }
    return session;
  }
}
