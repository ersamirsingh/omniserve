import { ApiError } from '../utils/ApiError.js';
import { DINEIN_EVENTS } from '../constants/events.constants.js';
import { SOCKET_EVENTS } from '../constants/socket-events.constants.js';
import { AuditAction, ReservationStatus, SessionStatus, TableStatus } from '../constants/table-states.constants.js';
import { TableRepository } from '../repositories/table.repository.js';
import { ReservationRepository } from '../repositories/reservation.repository.js';
import type { RequestScope } from '../interfaces/request-scope.interface.js';
import { assertTableTransition } from '../utils/state-machine.js';
import { emitOutletEvent, emitTableEvent } from '../socket/socket.server.js';
import { eventBus } from '../events/event-bus.js';
import DineInAuditLog from '../models/dinein-audit-log.model.js';
import { ensureObjectId } from '../utils/objectId.js';

export class TableService {
  constructor(
    private readonly tableRepository = new TableRepository(),
    private readonly reservationRepository = new ReservationRepository()
  ) {}

  async list(scope: RequestScope) {
    return this.tableRepository.list(scope);
  }

  async create(scope: RequestScope, payload: Record<string, unknown>) {
    const table = await this.tableRepository.create(scope, payload);
    await this.audit(scope, AuditAction.CREATE, 'TABLE', table.id, { payload });
    this.publish(scope, DINEIN_EVENTS.TABLE_CREATED, SOCKET_EVENTS.TABLE_CREATED, table.id, table);
    return table;
  }

  async update(scope: RequestScope, tableId: string, payload: Record<string, unknown>) {
    const table = await this.ensureTable(scope, tableId);
    Object.assign(table, payload, {
      updatedBy: scope.userId ? ensureObjectId(scope.userId, 'userId') : table.updatedBy,
    });
    await table.save();
    await this.audit(scope, AuditAction.UPDATE, 'TABLE', table.id, { payload });
    this.publish(scope, DINEIN_EVENTS.TABLE_UPDATED, SOCKET_EVENTS.TABLE_UPDATED, table.id, table);
    return table;
  }

  async remove(scope: RequestScope, tableId: string) {
    const table = await this.ensureTable(scope, tableId);
    table.isDeleted = true;
    await table.save();
    await this.audit(scope, AuditAction.DELETE, 'TABLE', table.id);
    this.publish(scope, DINEIN_EVENTS.TABLE_UPDATED, SOCKET_EVENTS.TABLE_DELETED, table.id, { id: table.id });
  }

  async move(scope: RequestScope, tableId: string, payload: Record<string, unknown>) {
    const table = await this.ensureTable(scope, tableId);
    Object.assign(table, payload, {
      position: { ...table.position, ...(payload.position as Record<string, unknown> | undefined) },
    });
    await table.save();
    await this.audit(scope, AuditAction.UPDATE, 'TABLE', table.id, { operation: 'move', payload });
    emitTableEvent(table.id, SOCKET_EVENTS.TABLE_MOVED, table);
    emitOutletEvent(scope.outletId, SOCKET_EVENTS.TABLE_MOVED, table);
    return table;
  }

  async changeStatus(scope: RequestScope, tableId: string, nextStatus: TableStatus) {
    const table = await this.ensureTable(scope, tableId);
    assertTableTransition(table.status, nextStatus);
    table.status = nextStatus;
    await table.save();
    await this.audit(scope, AuditAction.UPDATE, 'TABLE', table.id, {
      operation: 'status-change',
      from: table.status,
      to: nextStatus,
    });
    this.publish(scope, DINEIN_EVENTS.TABLE_STATUS_CHANGED, SOCKET_EVENTS.TABLE_STATUS_CHANGED, table.id, table);
    return table;
  }

  async reserve(scope: RequestScope, tableId: string, reservationId: string) {
    const [table, reservation] = await Promise.all([
      this.ensureTable(scope, tableId),
      this.reservationRepository.findById(scope, reservationId),
    ]);

    if (!reservation) {
      throw ApiError.notFound('Reservation');
    }

    if (table.status !== TableStatus.AVAILABLE) {
      throw ApiError.conflict('Table is not available for reservation');
    }

    table.status = TableStatus.RESERVED;
    reservation.tableId = table._id;
    reservation.status = ReservationStatus.CONFIRMED;
    reservation.confirmedAt = new Date();
    if (scope.userId) {
      reservation.confirmedBy = ensureObjectId(scope.userId, 'userId');
    }

    await Promise.all([table.save(), reservation.save()]);
    await this.audit(scope, AuditAction.UPDATE, 'TABLE', table.id, { operation: 'reserve', reservationId });
    this.publish(scope, DINEIN_EVENTS.TABLE_STATUS_CHANGED, SOCKET_EVENTS.TABLE_STATUS_CHANGED, table.id, table);
    return table;
  }

  async release(scope: RequestScope, tableId: string) {
    const table = await this.ensureTable(scope, tableId);
    table.status = TableStatus.AVAILABLE;
    await table.save();
    await this.audit(scope, AuditAction.UPDATE, 'TABLE', table.id, { operation: 'release' });
    this.publish(scope, DINEIN_EVENTS.TABLE_STATUS_CHANGED, SOCKET_EVENTS.TABLE_STATUS_CHANGED, table.id, table);
    return table;
  }

  async merge(scope: RequestScope, primaryTableId: string, secondaryTableIds: string[]) {
    const primaryTable = await this.ensureTable(scope, primaryTableId);
    const secondaryTables = await Promise.all(
      secondaryTableIds.map((tableId) => this.ensureTable(scope, tableId))
    );

    primaryTable.mergedWith = secondaryTables.map((table) => table._id);
    primaryTable.capacity += secondaryTables.reduce((sum, table) => sum + table.capacity, 0);
    primaryTable.isMerged = true;
    await primaryTable.save();

    await Promise.all(
      secondaryTables.map(async (table) => {
        table.isMerged = true;
        table.mergedIntoTableId = primaryTable._id;
        table.status = TableStatus.BLOCKED;
        await table.save();
      })
    );

    await this.audit(scope, AuditAction.MERGE, 'TABLE', primaryTable.id, { secondaryTableIds });
    this.publish(scope, DINEIN_EVENTS.TABLE_MERGED, SOCKET_EVENTS.TABLES_MERGED, primaryTable.id, {
      primaryTable,
      secondaryTables,
    });

    return primaryTable;
  }

  async split(scope: RequestScope, primaryTableId: string) {
    const table = await this.ensureTable(scope, primaryTableId);

    if (!table.isMerged) {
      throw ApiError.conflict('Table is not merged');
    }

    table.isMerged = false;
    table.mergedWith = [];
    await table.save();

    await this.audit(scope, AuditAction.SPLIT, 'TABLE', table.id);
    this.publish(scope, DINEIN_EVENTS.TABLE_SPLIT, SOCKET_EVENTS.TABLES_SPLIT, table.id, table);
    return table;
  }

  async assignWaiter(scope: RequestScope, tableId: string, waiterId: string, transfer = false) {
    const table = await this.ensureTable(scope, tableId);
    table.lockedBy = ensureObjectId(waiterId, 'waiterId');
    await table.save();
    await this.audit(scope, transfer ? AuditAction.TRANSFER : AuditAction.ASSIGN, 'TABLE', table.id, {
      waiterId,
    });
    emitTableEvent(table.id, transfer ? SOCKET_EVENTS.WAITER_TRANSFERRED : SOCKET_EVENTS.WAITER_ASSIGNED, table);
    emitOutletEvent(scope.outletId, transfer ? SOCKET_EVENTS.WAITER_TRANSFERRED : SOCKET_EVENTS.WAITER_ASSIGNED, table);
    return table;
  }

  async lock(scope: RequestScope, tableId: string, reason: string) {
    const table = await this.ensureTable(scope, tableId);
    table.lockedAt = new Date();
    table.lockedReason = reason;
    table.status = TableStatus.BLOCKED;
    if (scope.userId) {
      table.lockedBy = ensureObjectId(scope.userId, 'userId');
    }
    await table.save();
    await this.audit(scope, AuditAction.LOCK, 'TABLE', table.id, { reason });
    this.publish(scope, DINEIN_EVENTS.TABLE_LOCKED, SOCKET_EVENTS.TABLE_LOCKED, table.id, table);
    return table;
  }

  async unlock(scope: RequestScope, tableId: string) {
    const table = await this.ensureTable(scope, tableId);
    table.lockedAt = null;
    table.lockedReason = undefined;
    table.lockedBy = null;
    table.status = TableStatus.AVAILABLE;
    await table.save();
    await this.audit(scope, AuditAction.UNLOCK, 'TABLE', table.id);
    this.publish(scope, DINEIN_EVENTS.TABLE_UNLOCKED, SOCKET_EVENTS.TABLE_UNLOCKED, table.id, table);
    return table;
  }

  async markSessionClosed(scope: RequestScope, tableId: string) {
    const table = await this.ensureTable(scope, tableId);
    table.activeSessionId = null;
    table.status = TableStatus.CLEANING;
    await table.save();
    await this.audit(scope, AuditAction.CLOSE, 'TABLE', table.id, { sessionStatus: SessionStatus.CLOSED });
    this.publish(scope, DINEIN_EVENTS.TABLE_STATUS_CHANGED, SOCKET_EVENTS.TABLE_STATUS_CHANGED, table.id, table);
  }

  private async ensureTable(scope: RequestScope, tableId: string) {
    const table = await this.tableRepository.findById(scope, tableId);
    if (!table) {
      throw ApiError.notFound('Table');
    }
    return table;
  }

  private publish(
    scope: RequestScope,
    domainEvent: string,
    socketEvent: string,
    tableId: string,
    payload: unknown
  ) {
    eventBus.publish({
      name: domainEvent,
      aggregateId: tableId,
      tenantId: scope.tenantId,
      outletId: scope.outletId,
      payload: payload as Record<string, unknown>,
      occurredAt: new Date(),
    });
    emitTableEvent(tableId, socketEvent, payload);
    emitOutletEvent(scope.outletId, socketEvent, payload);
  }

  private async audit(
    scope: RequestScope,
    action: AuditAction,
    entityType: string,
    entityId: string,
    metadata?: Record<string, unknown>
  ) {
    await DineInAuditLog.create({
      tenantId: ensureObjectId(scope.tenantId, 'tenantId'),
      outletId: ensureObjectId(scope.outletId, 'outletId'),
      resource: entityType,
      resourceId: entityId,
      action,
      userId: scope.userId ? ensureObjectId(scope.userId, 'userId') : null,
      after: metadata,
    });
  }
}
