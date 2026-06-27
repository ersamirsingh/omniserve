import { ApiError } from '../utils/ApiError.js';
import { AssistanceRepository } from '../repositories/assistance.repository.js';
import type { RequestScope } from '../interfaces/request-scope.interface.js';
import { DINEIN_EVENTS } from '../constants/events.constants.js';
import { SOCKET_EVENTS } from '../constants/socket-events.constants.js';
import { AssistanceStatus } from '../models/dinein-assistance-request.model.js';
import { emitOutletEvent, emitSessionEvent, emitTableEvent } from '../socket/socket.server.js';
import { eventBus } from '../events/event-bus.js';
import { ensureObjectId } from '../utils/objectId.js';

export class AssistanceService {
  constructor(private readonly assistanceRepository = new AssistanceRepository()) {}

  list(scope: RequestScope) {
    return this.assistanceRepository.list(scope);
  }

  async create(scope: RequestScope, payload: Record<string, unknown>) {
    const request = await this.assistanceRepository.create(scope, {
      ...payload,
      sessionId: ensureObjectId(String(payload.sessionId), 'sessionId'),
      tableId: ensureObjectId(String(payload.tableId), 'tableId'),
      guestId: payload.guestId ? ensureObjectId(String(payload.guestId), 'guestId') : null,
      seatId: payload.seatId ? ensureObjectId(String(payload.seatId), 'seatId') : null,
    });

    eventBus.publish({
      name: DINEIN_EVENTS.ASSISTANCE_REQUESTED,
      aggregateId: request.id,
      tenantId: scope.tenantId,
      outletId: scope.outletId,
      payload: { assistanceRequestId: request.id },
      occurredAt: new Date(),
    });

    emitSessionEvent(request.sessionId.toString(), SOCKET_EVENTS.ASSISTANCE_REQUESTED, request);
    emitTableEvent(request.tableId.toString(), SOCKET_EVENTS.ASSISTANCE_REQUESTED, request);
    emitOutletEvent(scope.outletId, SOCKET_EVENTS.ASSISTANCE_REQUESTED, request);
    return request;
  }

  async resolve(scope: RequestScope, requestId: string, assignedWaiterId?: string) {
    const request = await this.assistanceRepository.findById(scope, requestId);
    if (!request) {
      throw ApiError.notFound('Assistance request');
    }

    request.status = AssistanceStatus.RESOLVED;
    request.resolvedAt = new Date();
    request.assignedWaiterId = assignedWaiterId
      ? ensureObjectId(assignedWaiterId, 'assignedWaiterId')
      : request.assignedWaiterId;
    request.resolvedBy = scope.userId ? ensureObjectId(scope.userId, 'userId') : null;
    request.responseTimeSeconds = Math.round((request.resolvedAt.getTime() - request.createdAt.getTime()) / 1000);
    await request.save();

    eventBus.publish({
      name: DINEIN_EVENTS.ASSISTANCE_RESOLVED,
      aggregateId: request.id,
      tenantId: scope.tenantId,
      outletId: scope.outletId,
      payload: { assistanceRequestId: request.id },
      occurredAt: new Date(),
    });

    emitSessionEvent(request.sessionId.toString(), SOCKET_EVENTS.ASSISTANCE_RESOLVED, request);
    emitTableEvent(request.tableId.toString(), SOCKET_EVENTS.ASSISTANCE_RESOLVED, request);
    emitOutletEvent(scope.outletId, SOCKET_EVENTS.ASSISTANCE_RESOLVED, request);
    return request;
  }
}
