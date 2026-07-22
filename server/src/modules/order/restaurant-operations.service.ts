import mongoose, { Types } from "mongoose";
import { TableService } from "../outlet/table.service.js";
import { QRSessionService } from "./qrsession.service.js";
import { WaiterTaskService } from "./waiter-task.service.js";
import { NotificationService } from "../notification/notification.service.js";
import WaiterTask, { WaiterTaskType } from "../../models/waitertask.model.js";
import QRSession from "../../models/qrsession.model.js";
import Table from "../../models/table.model.js";
import Order from "../../models/order.model.js";
import OrderItem from "../../models/orderItem.model.js";
import Inventory from "../../models/inventory.model.js";
import OrderTimeline from "../../models/ordertimeline.model.js";
import { OrderService } from "./order.service.js";
import { BillingService } from "./billing.service.js";
import { OrderStatus } from "../../models/enums.js";
import { EventBusService } from "../../events/eventBus.js";

function mapAssistanceTypeToTaskType(assistanceType: string): WaiterTaskType {
  const type = String(assistanceType).toUpperCase();
  if (type === "WATER") return "WATER";
  if (type === "BILL") return "BILL";
  if (type === "TISSUE") return "TISSUE";
  if (type === "SPOON") return "SPOON";
  if (type === "CLEANING") return "CLEANING";
  return "CUSTOM";
}

export interface IOperationResult {
  operationId: string;
  success: boolean;
  eventsPublished: string[];
  affectedEntities: {
    tables: string[];
    sessions: string[];
    orders: string[];
  };
  warnings: string[];
  traceId: string;
  correlationId: string;
  durationMs: number;
  waiterTasks: string[];
}

export class RestaurantOperationsService {
  static tables = TableService;
  static sessions = QRSessionService;
  static waiterTasks = WaiterTaskService;

  static async runInTransaction(fn: (session: mongoose.ClientSession | undefined) => Promise<any>): Promise<any> {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const result = await fn(session);
      await session.commitTransaction();
      return result;
    } catch (error: any) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      const isReplicaSetError = error.message && (
        error.message.includes("ReplicaSetNoPrimary") ||
        error.message.includes("not a replica set") ||
        error.message.includes("Transaction numbers are only allowed on a Replica Set member")
      );
      if (isReplicaSetError) {
        console.warn("[RestaurantOperationsService] MongoDB Transactions not supported. Falling back to non-transactional execution.");
        return await fn(undefined);
      }
      throw error;
    } finally {
      session.endSession();
    }
  }

  static async executeOperation(command: {
    tenantId: string | Types.ObjectId;
    outletId: string | Types.ObjectId;
    operationType: 'TRANSFER_TABLE' | 'MERGE_TABLE' | 'UNMERGE_TABLE' | 'MOVE_SEAT' | 'SWAP_SEAT' | 'ADD_SEAT' | 'REMOVE_SEAT' | 'CHANGE_GUEST_COUNT' | 'CHANGE_WAITER' | 'CLOSE_SESSION' | 'REQUEST_BILL' | 'START_CLEANING' | 'COMPLETE_CLEANING' | 'ACKNOWLEDGE_TASK' | 'START_TASK' | 'COMPLETE_TASK' | 'ESCALATE_TASK' | 'APPROVE_ORDER_CANCEL' | 'REJECT_ORDER_CANCEL';
    payload: any;
    triggeredById?: string | Types.ObjectId;
  }): Promise<IOperationResult> {
    const operationId = new Types.ObjectId().toString();
    const traceId = operationId;
    const correlationId = command.payload?.correlationId || new Types.ObjectId().toString();
    const start = Date.now();

    const affectedTables = new Set<string>();
    const affectedSessions = new Set<string>();
    const affectedOrders = new Set<string>();
    const eventsPublished: string[] = [];
    const waiterTasksList: string[] = [];
    const warnings: string[] = [];

    const result = await this.runInTransaction(async (dbSession) => {
      const { operationType, payload } = command;
      const tenantId = new Types.ObjectId(command.tenantId);
      const outletId = new Types.ObjectId(command.outletId);

      switch (operationType) {
        case 'TRANSFER_TABLE': {
          const { fromTableId, toTableId, expectedVersionFrom, expectedVersionTo } = payload;
          const fromTable = await Table.findOne({ _id: new Types.ObjectId(fromTableId), tenantId, isDeleted: false }).session(dbSession || null);
          const toTable = await Table.findOne({ _id: new Types.ObjectId(toTableId), tenantId, isDeleted: false }).session(dbSession || null);

          if (!fromTable) throw new Error(`Origin Table ${fromTableId} not found`);
          if (!toTable) throw new Error(`Destination Table ${toTableId} not found`);

          if (expectedVersionFrom && fromTable.updatedAt.toISOString() !== new Date(expectedVersionFrom).toISOString()) {
            throw new Error("Concurrency Conflict: Origin table has been modified concurrently.");
          }
          if (expectedVersionTo && toTable.updatedAt.toISOString() !== new Date(expectedVersionTo).toISOString()) {
            throw new Error("Concurrency Conflict: Destination table has been modified concurrently.");
          }

          if (!fromTable.activeSessionId) {
            throw new Error("Origin table does not have an active session");
          }
          if (toTable.activeSessionId && toTable.activeSessionId.toString() !== fromTable.activeSessionId.toString()) {
            throw new Error("Destination table is already occupied");
          }

          const activeSessionId = fromTable.activeSessionId;
          affectedSessions.add(activeSessionId.toString());

          const sessionDoc = await QRSession.findById(activeSessionId).session(dbSession || null);
          if (!sessionDoc) throw new Error("Active QR session not found");
          sessionDoc.tableId = toTable._id;
          await sessionDoc.save(dbSession ? { session: dbSession } : undefined);

          const orders = await Order.find({ "diningContext.sessionId": activeSessionId, isDeleted: false }).session(dbSession || null);
          for (const order of orders) {
            if (order.diningContext) {
              order.diningContext.tableId = toTable._id;
              order.diningContext.tableNumber = toTable.tableNumber;
              await order.save(dbSession ? { session: dbSession } : undefined);
              affectedOrders.add(order._id.toString());
            }
          }

          if (fromTable.isMerged) {
            toTable.isMerged = true;
            toTable.mergedWithTableIds = fromTable.mergedWithTableIds || [];

            const secondaryIds = fromTable.mergedWithTableIds || [];
            for (const secId of secondaryIds) {
              const secTable = await Table.findById(secId).session(dbSession || null);
              if (secTable && secTable.isMerged && secTable.mergedWithTableIds) {

                secTable.mergedWithTableIds = secTable.mergedWithTableIds.map(id =>
                  id.toString() === fromTable._id.toString() ? toTable._id : id
                );
                await secTable.save(dbSession ? { session: dbSession } : undefined);
                affectedTables.add(secTable._id.toString());
              }
            }
          }

          toTable.activeSessionId = activeSessionId;
          toTable.operationalStatus = fromTable.operationalStatus;

          fromTable.activeSessionId = null;
          fromTable.operationalStatus = 'AVAILABLE';
          fromTable.isMerged = false;
          fromTable.mergedWithTableIds = [];

          await fromTable.save(dbSession ? { session: dbSession } : undefined);
          await toTable.save(dbSession ? { session: dbSession } : undefined);

          affectedTables.add(fromTable._id.toString());
          affectedTables.add(toTable._id.toString());

          await OrderTimeline.create([{
            tenantId,
            qrsessionId: activeSessionId,
            status: "TABLE_TRANSFERRED",
            sourceSystem: "SYSTEM",
            notes: `Transferred from Table ${fromTable.tableNumber} to Table ${toTable.tableNumber}`,
            audit: {
              ...(command.triggeredById && { triggeredById: new Types.ObjectId(command.triggeredById) }),
              triggeredByType: "WAITER",
              correlationId
            }
          }], dbSession ? { session: dbSession } : undefined);

          await EventBusService.publishTableTransferred(
            tenantId,
            outletId,
            fromTable._id,
            {
              fromTableId: fromTable._id.toString(),
              toTableId: toTable._id.toString(),
              sessionId: activeSessionId.toString()
            },
            { correlationId, createdBy: command.triggeredById }
          );
          eventsPublished.push("TABLE_TRANSFERRED");
          break;
        }

        case 'MERGE_TABLE': {
          const { primaryTableId, secondaryTableIds, expectedVersionPrimary } = payload;
          const primaryTable = await Table.findOne({ _id: new Types.ObjectId(primaryTableId), tenantId, isDeleted: false }).session(dbSession || null);

          if (!primaryTable) throw new Error(`Primary Table ${primaryTableId} not found`);

          if (expectedVersionPrimary && primaryTable.updatedAt.toISOString() !== new Date(expectedVersionPrimary).toISOString()) {
            throw new Error("Concurrency Conflict: Primary table has been modified concurrently.");
          }

          if (!primaryTable.activeSessionId) {
            throw new Error("Primary table must have an active session to merge");
          }

          const activeSessionId = primaryTable.activeSessionId;
          affectedSessions.add(activeSessionId.toString());
          affectedTables.add(primaryTable._id.toString());

          const newSecondaryIds: Types.ObjectId[] = [];
          for (const secId of secondaryTableIds) {
            const secTable = await Table.findOne({ _id: new Types.ObjectId(secId), tenantId, isDeleted: false }).session(dbSession || null);
            if (!secTable) throw new Error(`Secondary Table ${secId} not found`);
            if (secTable.activeSessionId && secTable.activeSessionId.toString() !== activeSessionId.toString()) {
              throw new Error(`Secondary Table ${secTable.tableNumber} is occupied by another session.`);
            }

            secTable.isMerged = true;
            secTable.mergedWithTableIds = [primaryTable._id];
            secTable.activeSessionId = activeSessionId;
            secTable.operationalStatus = 'OCCUPIED';
            await secTable.save(dbSession ? { session: dbSession } : undefined);

            newSecondaryIds.push(secTable._id);
            affectedTables.add(secTable._id.toString());
          }

          primaryTable.isMerged = true;
          primaryTable.mergedWithTableIds = [
            ...new Set([
              ...(primaryTable.mergedWithTableIds || []).map(id => id.toString()),
              ...newSecondaryIds.map(id => id.toString())
            ])
          ].map(id => new Types.ObjectId(id));
          await primaryTable.save(dbSession ? { session: dbSession } : undefined);

          await OrderTimeline.create([{
            tenantId,
            qrsessionId: activeSessionId,
            status: "TABLE_MERGED",
            sourceSystem: "SYSTEM",
            notes: `Merged Table ${primaryTable.tableNumber} with tables: ${secondaryTableIds.join(', ')}`,
            audit: {
              ...(command.triggeredById && { triggeredById: new Types.ObjectId(command.triggeredById) }),
              triggeredByType: "WAITER",
              correlationId
            }
          }], dbSession ? { session: dbSession } : undefined);

          await EventBusService.publishTableMerged(
            tenantId,
            outletId,
            primaryTable._id,
            {
              primaryTableId: primaryTable._id.toString(),
              secondaryTableIds: secondaryTableIds.map((id: string) => id.toString()),
              sessionId: activeSessionId.toString()
            },
            { correlationId, createdBy: command.triggeredById }
          );
          eventsPublished.push("TABLE_MERGED");
          break;
        }

        case 'UNMERGE_TABLE': {
          const { primaryTableId } = payload;
          const table = await Table.findOne({ _id: new Types.ObjectId(primaryTableId), tenantId, isDeleted: false }).session(dbSession || null);
          if (!table) throw new Error(`Table ${primaryTableId} not found`);

          let primaryTable = table;
          let secondaryIds: Types.ObjectId[] = [];

          if (table.isMerged) {
            const linkedIds = table.mergedWithTableIds || [];
            if (linkedIds.length === 1) {
              const possiblePrimary = await Table.findOne({ _id: linkedIds[0], tenantId, isDeleted: false }).session(dbSession || null);
              if (possiblePrimary) {
                primaryTable = possiblePrimary;
              }
            }
            secondaryIds = primaryTable.mergedWithTableIds || [];
          }

          affectedTables.add(primaryTable._id.toString());
          const activeSessionId = primaryTable.activeSessionId;
          if (activeSessionId) affectedSessions.add(activeSessionId.toString());

          for (const secId of secondaryIds) {
            const secTable = await Table.findById(secId).session(dbSession || null);
            if (secTable) {
              secTable.isMerged = false;
              secTable.mergedWithTableIds = [];
              secTable.activeSessionId = null;
              secTable.operationalStatus = 'AVAILABLE';
              await secTable.save(dbSession ? { session: dbSession } : undefined);
              affectedTables.add(secTable._id.toString());
            }
          }

          primaryTable.isMerged = false;
          primaryTable.mergedWithTableIds = [];
          await primaryTable.save(dbSession ? { session: dbSession } : undefined);

          if (activeSessionId) {
            await OrderTimeline.create([{
              tenantId,
              qrsessionId: activeSessionId,
              status: "TABLE_UNMERGED",
              sourceSystem: "SYSTEM",
              notes: `Unmerged Table ${primaryTable.tableNumber}`,
              audit: {
                ...(command.triggeredById && { triggeredById: new Types.ObjectId(command.triggeredById) }),
                triggeredByType: "WAITER",
                correlationId
              }
            }], dbSession ? { session: dbSession } : undefined);
          }

          await EventBusService.publishTableUnmerged(
            tenantId,
            outletId,
            primaryTable._id,
            {
              primaryTableId: primaryTable._id.toString(),
              secondaryTableIds: secondaryIds.map(id => id.toString())
            },
            { correlationId, createdBy: command.triggeredById }
          );
          eventsPublished.push("TABLE_UNMERGED");
          break;
        }

        case 'MOVE_SEAT': {
          const { sessionId, fromSeatNumber, toSeatNumber } = payload;
          const sessionDoc = await QRSession.findOne({ _id: new Types.ObjectId(sessionId), tenantId, isDeleted: false }).session(dbSession || null);
          if (!sessionDoc) throw new Error(`QR Session ${sessionId} not found`);

          affectedSessions.add(sessionDoc._id.toString());
          affectedTables.add(sessionDoc.tableId.toString());

          const seatIndex = sessionDoc.seats.findIndex(s => s.seatNumber === fromSeatNumber);
          if (seatIndex === -1) throw new Error(`Seat ${fromSeatNumber} not found in session`);

          const targetSeat = sessionDoc.seats.find(s => s.seatNumber === toSeatNumber);
          if (targetSeat) throw new Error(`Seat ${toSeatNumber} is already occupied`);

          const seatObj = sessionDoc.seats[seatIndex];
          if (!seatObj) throw new Error("Seat object not found");
          seatObj.seatNumber = toSeatNumber;
          await sessionDoc.save(dbSession ? { session: dbSession } : undefined);

          const orders = await Order.find({ "diningContext.sessionId": sessionDoc._id, "diningContext.seatNumber": fromSeatNumber, isDeleted: false }).session(dbSession || null);
          for (const order of orders) {
            if (order.diningContext) {
              order.diningContext.seatNumber = toSeatNumber;
              await order.save(dbSession ? { session: dbSession } : undefined);
              affectedOrders.add(order._id.toString());
            }
          }

          await OrderTimeline.create([{
            tenantId,
            qrsessionId: sessionDoc._id,
            status: "SEAT_MOVED",
            sourceSystem: "SYSTEM",
            notes: `Seat ${fromSeatNumber} moved to ${toSeatNumber}`,
            audit: {
              ...(command.triggeredById && { triggeredById: new Types.ObjectId(command.triggeredById) }),
              triggeredByType: "WAITER",
              correlationId
            }
          }], dbSession ? { session: dbSession } : undefined);

          await EventBusService.publishSeatMoved(
            tenantId,
            outletId,
            sessionDoc.tableId,
            {
              sessionId: sessionDoc._id.toString(),
              fromSeatNumber,
              toSeatNumber
            },
            { correlationId, createdBy: command.triggeredById }
          );
          eventsPublished.push("SEAT_MOVED");
          break;
        }

        case 'SWAP_SEAT': {
          const { sessionId, seatNumberA, seatNumberB } = payload;
          const sessionDoc = await QRSession.findOne({ _id: new Types.ObjectId(sessionId), tenantId, isDeleted: false }).session(dbSession || null);
          if (!sessionDoc) throw new Error(`QR Session ${sessionId} not found`);

          affectedSessions.add(sessionDoc._id.toString());
          affectedTables.add(sessionDoc.tableId.toString());

          const seatA = sessionDoc.seats.find(s => s.seatNumber === seatNumberA);
          const seatB = sessionDoc.seats.find(s => s.seatNumber === seatNumberB);

          if (!seatA || !seatB) throw new Error(`Seat ${seatNumberA} or Seat ${seatNumberB} not found`);

          const tempCust = seatA.customerId;
          const tempDevice = seatA.deviceToken;
          const tempJoined = seatA.joinedAt;

          seatA.customerId = seatB.customerId !== undefined ? seatB.customerId : null;
          if (seatB.deviceToken !== undefined) {
            seatA.deviceToken = seatB.deviceToken;
          } else {
            delete seatA.deviceToken;
          }
          seatA.joinedAt = seatB.joinedAt !== undefined ? seatB.joinedAt : new Date();

          seatB.customerId = tempCust !== undefined ? tempCust : null;
          if (tempDevice !== undefined) {
            seatB.deviceToken = tempDevice;
          } else {
            delete seatB.deviceToken;
          }
          seatB.joinedAt = tempJoined !== undefined ? tempJoined : new Date();

          await sessionDoc.save(dbSession ? { session: dbSession } : undefined);

          const orders = await Order.find({ "diningContext.sessionId": sessionDoc._id, isDeleted: false }).session(dbSession || null);
          for (const order of orders) {
            if (order.diningContext) {
              if (order.diningContext.seatNumber === seatNumberA) {
                order.diningContext.seatNumber = seatNumberB;
                await order.save(dbSession ? { session: dbSession } : undefined);
                affectedOrders.add(order._id.toString());
              } else if (order.diningContext.seatNumber === seatNumberB) {
                order.diningContext.seatNumber = seatNumberA;
                await order.save(dbSession ? { session: dbSession } : undefined);
                affectedOrders.add(order._id.toString());
              }
            }
          }

          await OrderTimeline.create([{
            tenantId,
            qrsessionId: sessionDoc._id,
            status: "SEAT_SWAPPED",
            sourceSystem: "SYSTEM",
            notes: `Seat ${seatNumberA} swapped with ${seatNumberB}`,
            audit: {
              ...(command.triggeredById && { triggeredById: new Types.ObjectId(command.triggeredById) }),
              triggeredByType: "WAITER",
              correlationId
            }
          }], dbSession ? { session: dbSession } : undefined);

          await EventBusService.publishSeatSwapped(
            tenantId,
            outletId,
            sessionDoc.tableId,
            {
              sessionId: sessionDoc._id.toString(),
              seatNumberA,
              seatNumberB
            },
            { correlationId, createdBy: command.triggeredById }
          );
          eventsPublished.push("SEAT_SWAPPED");
          break;
        }

        case 'ADD_SEAT': {
          const { sessionId, seatNumber, customerId } = payload;
          const sessionDoc = await QRSession.findOne({ _id: new Types.ObjectId(sessionId), tenantId, isDeleted: false }).session(dbSession || null);
          if (!sessionDoc) throw new Error(`QR Session ${sessionId} not found`);

          affectedSessions.add(sessionDoc._id.toString());
          affectedTables.add(sessionDoc.tableId.toString());

          const targetSeat = sessionDoc.seats.find(s => s.seatNumber === seatNumber);
          if (targetSeat) throw new Error(`Seat ${seatNumber} already exists in session`);

          sessionDoc.seats.push({
            seatNumber,
            customerId: customerId ? new Types.ObjectId(customerId) : null,
            joinedAt: new Date()
          });
          await sessionDoc.save(dbSession ? { session: dbSession } : undefined);

          await OrderTimeline.create([{
            tenantId,
            qrsessionId: sessionDoc._id,
            status: "SEAT_ADDED",
            sourceSystem: "SYSTEM",
            notes: `Seat ${seatNumber} added to session`,
            audit: {
              ...(command.triggeredById && { triggeredById: new Types.ObjectId(command.triggeredById) }),
              triggeredByType: "WAITER",
              correlationId
            }
          }], dbSession ? { session: dbSession } : undefined);

          await EventBusService.publishSeatAdded(
            tenantId,
            outletId,
            sessionDoc.tableId,
            {
              sessionId: sessionDoc._id.toString(),
              seatNumber,
              customerId: customerId || null
            },
            { correlationId, createdBy: command.triggeredById }
          );
          eventsPublished.push("SEAT_ADDED");
          break;
        }

        case 'REMOVE_SEAT': {
          const { sessionId, seatNumber } = payload;
          const sessionDoc = await QRSession.findOne({ _id: new Types.ObjectId(sessionId), tenantId, isDeleted: false }).session(dbSession || null);
          if (!sessionDoc) throw new Error(`QR Session ${sessionId} not found`);

          affectedSessions.add(sessionDoc._id.toString());
          affectedTables.add(sessionDoc.tableId.toString());

          const targetSeat = sessionDoc.seats.find(s => s.seatNumber === seatNumber);
          if (!targetSeat) throw new Error(`Seat ${seatNumber} not found in session`);

          sessionDoc.seats = sessionDoc.seats.filter(s => s.seatNumber !== seatNumber);
          await sessionDoc.save(dbSession ? { session: dbSession } : undefined);

          await OrderTimeline.create([{
            tenantId,
            qrsessionId: sessionDoc._id,
            status: "SEAT_REMOVED",
            sourceSystem: "SYSTEM",
            notes: `Seat ${seatNumber} removed from session`,
            audit: {
              ...(command.triggeredById && { triggeredById: new Types.ObjectId(command.triggeredById) }),
              triggeredByType: "WAITER",
              correlationId
            }
          }], dbSession ? { session: dbSession } : undefined);

          await EventBusService.publishSeatRemoved(
            tenantId,
            outletId,
            sessionDoc.tableId,
            {
              sessionId: sessionDoc._id.toString(),
              seatNumber
            },
            { correlationId, createdBy: command.triggeredById }
          );
          eventsPublished.push("SEAT_REMOVED");
          break;
        }

        case 'CHANGE_GUEST_COUNT': {
          const { tableId, seatCount } = payload;
          const tableDoc = await Table.findOne({ _id: new Types.ObjectId(tableId), tenantId, isDeleted: false }).session(dbSession || null);
          if (!tableDoc) throw new Error(`Table ${tableId} not found`);

          tableDoc.seatCount = Number(seatCount);
          await tableDoc.save(dbSession ? { session: dbSession } : undefined);

          affectedTables.add(tableDoc._id.toString());

          if (tableDoc.activeSessionId) {
            affectedSessions.add(tableDoc.activeSessionId.toString());
            await OrderTimeline.create([{
              tenantId,
              qrsessionId: tableDoc.activeSessionId,
              status: "GUEST_COUNT_CHANGED",
              sourceSystem: "SYSTEM",
              notes: `Guest capacity changed to ${seatCount}`,
              audit: {
                ...(command.triggeredById && { triggeredById: new Types.ObjectId(command.triggeredById) }),
                triggeredByType: "WAITER",
                correlationId
              }
            }], dbSession ? { session: dbSession } : undefined);
          }

          await EventBusService.publishGuestCountChanged(
            tenantId,
            outletId,
            tableDoc._id,
            {
              tableId: tableDoc._id.toString(),
              seatCount: Number(seatCount)
            },
            { correlationId, createdBy: command.triggeredById }
          );
          eventsPublished.push("GUEST_COUNT_CHANGED");
          break;
        }

        case 'CHANGE_WAITER': {
          const { sessionId, waiterId } = payload;
          const sessionDoc = await QRSession.findOne({ _id: new Types.ObjectId(sessionId), tenantId, isDeleted: false }).session(dbSession || null);
          if (!sessionDoc) throw new Error(`QR Session ${sessionId} not found`);

          sessionDoc.waiterId = waiterId ? new Types.ObjectId(waiterId) : null;
          await sessionDoc.save(dbSession ? { session: dbSession } : undefined);

          affectedSessions.add(sessionDoc._id.toString());
          affectedTables.add(sessionDoc.tableId.toString());

          await OrderTimeline.create([{
            tenantId,
            qrsessionId: sessionDoc._id,
            status: "WAITER_CHANGED",
            sourceSystem: "SYSTEM",
            notes: `Assigned waiter updated`,
            audit: {
              ...(command.triggeredById && { triggeredById: new Types.ObjectId(command.triggeredById) }),
              triggeredByType: "WAITER",
              correlationId
            }
          }], dbSession ? { session: dbSession } : undefined);

          await EventBusService.publishWaiterChanged(
            tenantId,
            outletId,
            sessionDoc.tableId,
            {
              sessionId: sessionDoc._id.toString(),
              waiterId: waiterId || null
            },
            { correlationId, createdBy: command.triggeredById }
          );
          eventsPublished.push("WAITER_CHANGED");
          break;
        }

        case 'CLOSE_SESSION': {
          const { sessionId } = payload;
          const sessionDoc = await QRSession.findOne({ _id: new Types.ObjectId(sessionId), tenantId, isDeleted: false }).session(dbSession || null);
          if (!sessionDoc) throw new Error(`QR Session ${sessionId} not found`);

          affectedSessions.add(sessionDoc._id.toString());
          affectedTables.add(sessionDoc.tableId.toString());

          await QRSessionService.updateSessionStatus(sessionDoc._id, "CLOSED", {
            ...(command.triggeredById && { triggeredById: command.triggeredById.toString() })
          });

          await OrderTimeline.create([{
            tenantId,
            qrsessionId: sessionDoc._id,
            status: "SESSION_CLOSED",
            sourceSystem: "SYSTEM",
            notes: `Dining session closed`,
            audit: {
              ...(command.triggeredById && { triggeredById: new Types.ObjectId(command.triggeredById) }),
              triggeredByType: "WAITER",
              correlationId
            }
          }], dbSession ? { session: dbSession } : undefined);

          await EventBusService.publishSessionClosed(
            tenantId,
            outletId,
            sessionDoc.tableId,
            {
              sessionId: sessionDoc._id.toString()
            },
            { correlationId, createdBy: command.triggeredById }
          );
          eventsPublished.push("SESSION_CLOSED");
          break;
        }

        case 'REQUEST_BILL': {
          const { sessionId } = payload;
          const sessionDoc = await QRSession.findOne({ _id: new Types.ObjectId(sessionId), tenantId, isDeleted: false }).session(dbSession || null);
          if (!sessionDoc) throw new Error(`QR Session ${sessionId} not found`);

          affectedSessions.add(sessionDoc._id.toString());
          affectedTables.add(sessionDoc.tableId.toString());

          await QRSessionService.updateSessionStatus(sessionDoc._id, "PAYMENT_PENDING", {
            ...(command.triggeredById && { triggeredById: command.triggeredById.toString() })
          });

          const task = await this.handleBillRequested(tenantId, outletId, sessionDoc.tableId, sessionDoc._id);
          if (task) {
            waiterTasksList.push(task._id.toString());
          }
          break;
        }

        case 'START_CLEANING': {
          const { tableId } = payload;
          const tableDoc = await Table.findOne({ _id: new Types.ObjectId(tableId), tenantId, isDeleted: false }).session(dbSession || null);
          if (!tableDoc) throw new Error(`Table ${tableId} not found`);

          affectedTables.add(tableDoc._id.toString());

          await TableService.updateTableOperationalStatus(tenantId, outletId, tableDoc._id, 'CLEANING', {
            correlationId
          });

          const task = await this.handleTableCleaningStarted(tenantId, outletId, tableDoc._id, tableDoc.lastSessionId || null);
          if (task) {
            waiterTasksList.push(task._id.toString());
          }
          break;
        }

        case 'COMPLETE_CLEANING': {
          const { tableId } = payload;
          const tableDoc = await Table.findOne({ _id: new Types.ObjectId(tableId), tenantId, isDeleted: false }).session(dbSession || null);
          if (!tableDoc) throw new Error(`Table ${tableId} not found`);

          affectedTables.add(tableDoc._id.toString());

          const updateOptions: { correlationId?: string; triggeredById?: string } = {};
          if (correlationId) updateOptions.correlationId = correlationId.toString();
          if (command.triggeredById) updateOptions.triggeredById = command.triggeredById.toString();

          await TableService.updateTableOperationalStatus(tenantId, outletId, tableDoc._id, 'AVAILABLE', updateOptions);

          const WaiterTaskModel = (await import("../../models/waitertask.model.js")).default;
          const openTask = await WaiterTaskModel.findOne({
            tenantId,
            tableId: tableDoc._id,
            taskType: 'CLEANING',
            status: { $nin: ['COMPLETED', 'CANCELLED'] }
          }).session(dbSession || null);

          if (openTask) {
            openTask.status = 'COMPLETED';
            openTask.completedAt = new Date();
            await openTask.save();
            waiterTasksList.push(openTask._id.toString());
          }
          break;
        }

        case 'ACKNOWLEDGE_TASK': {
          const { taskId } = payload;
          const task = await WaiterTaskService.acknowledgeTask(taskId, (command.triggeredById || new Types.ObjectId().toString()).toString());
          if (task) {
            affectedSessions.add(task.sessionId.toString());
            waiterTasksList.push(task._id.toString());
            const { RealtimeService } = await import("../../sockets/realtime.service.js");
            RealtimeService.sendToSession(task.sessionId.toString(), "WAITER_TASK_ASSIGNED" as any, { taskId: task._id.toString(), status: "ACKNOWLEDGED", waiterId: task.assignedWaiterId });
          }
          break;
        }

        case 'START_TASK': {
          const { taskId } = payload;
          const task = await WaiterTaskService.startTaskProgress(taskId);
          if (task) {
            affectedSessions.add(task.sessionId.toString());
            waiterTasksList.push(task._id.toString());
            const { RealtimeService } = await import("../../sockets/realtime.service.js");
            RealtimeService.sendToSession(task.sessionId.toString(), "WAITER_TASK_IN_PROGRESS" as any, { taskId: task._id.toString(), status: "IN_PROGRESS" });
          }
          break;
        }

        case 'COMPLETE_TASK': {
          const { taskId } = payload;
          const task = await WaiterTaskService.completeTask(taskId);
          if (task) {
            affectedSessions.add(task.sessionId.toString());
            waiterTasksList.push(task._id.toString());

            if (task.taskType === 'CLEANING') {
              affectedTables.add(task.tableId.toString());

              const updateOptions: { correlationId?: string; triggeredById?: string } = {};
              if (command.triggeredById) updateOptions.triggeredById = command.triggeredById.toString();

              await TableService.updateTableOperationalStatus(tenantId, outletId, task.tableId, 'AVAILABLE', updateOptions);
            }

            const { RealtimeService } = await import("../../sockets/realtime.service.js");
            RealtimeService.sendToSession(task.sessionId.toString(), "WAITER_TASK_COMPLETED" as any, { taskId: task._id.toString(), status: "COMPLETED" });
          }
          break;
        }

        case 'ESCALATE_TASK': {
          const { taskId } = payload;
          const task = await WaiterTaskService.escalateTask(taskId);
          if (task) {
            affectedSessions.add(task.sessionId.toString());
            waiterTasksList.push(task._id.toString());
            const { RealtimeService } = await import("../../sockets/realtime.service.js");
            RealtimeService.sendToSession(task.sessionId.toString(), "WAITER_TASK_ESCALATED" as any, { taskId: task._id.toString(), status: "ESCALATED" });
          }
          break;
        }

        case 'APPROVE_ORDER_CANCEL': {
          const { taskId, reason } = payload;
          const task = await WaiterTask.findOne({ _id: new Types.ObjectId(taskId), isDeleted: false });
          if (!task) throw new Error(`Waiter task ${taskId} not found`);

          const sessionId = task.sessionId;
          let ordersToCancel = [];
          if (task.associatedOrderId) {
            const order = await Order.findOne({ _id: task.associatedOrderId, tenantId, isDeleted: false });
            if (order) ordersToCancel.push(order);
          } else {
            ordersToCancel = await Order.find({
              "diningContext.sessionId": sessionId,
              tenantId,
              orderStatus: { $in: [OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.PREPARING, OrderStatus.READY] },
              isDeleted: false
            });
          }

          const cancelItemId = task.metadata?.itemId;
          if (cancelItemId) {
            const itemObjId = new Types.ObjectId(cancelItemId);
            const orderItem = await OrderItem.findOne({ _id: itemObjId, tenantId, isDeleted: false });
            if (orderItem) {
              orderItem.status = "CANCELLED" as any;
              await orderItem.save();

              const parentOrder = await Order.findById(orderItem.orderId);
              if (parentOrder) {
                const siblingItems = await OrderItem.find({ orderId: parentOrder._id, status: { $ne: "CANCELLED" as any }, isDeleted: false });
                const newSubtotal = siblingItems.reduce((sum, i) => sum + i.totalPrice, 0);
                const newTax = parseFloat((newSubtotal * 0.05).toFixed(2));
                const newTotal = newSubtotal + newTax;

                parentOrder.subtotal = newSubtotal;
                parentOrder.tax = newTax;
                parentOrder.totalAmount = newTotal;

                if (siblingItems.length === 0) {
                  parentOrder.orderStatus = OrderStatus.CANCELLED;
                  parentOrder.cancelledAt = new Date();
                  parentOrder.cancellationReason = reason || "All items cancelled";
                }
                await parentOrder.save();
                affectedOrders.add(parentOrder._id.toString());
              }

              const parentOrderCurrentStatus = parentOrder?.orderStatus;
              if (parentOrderCurrentStatus && [OrderStatus.ACCEPTED, OrderStatus.PREPARING, OrderStatus.READY].includes(parentOrderCurrentStatus)) {
                const inventory = await Inventory.findOne({
                  menuItemId: orderItem.menuItemId,
                  outletId,
                  tenantId,
                  isDeleted: false
                });
                if (inventory) {
                  const newQty = inventory.quantity + orderItem.quantity;
                  await Inventory.updateOne({ _id: inventory._id }, { quantity: newQty, isLowStock: newQty <= inventory.threshold });
                }
              }

              await OrderTimeline.create({
                tenantId,
                qrsessionId: sessionId,
                orderId: orderItem.orderId,
                status: "ORDER_UPDATED" as any,
                notes: `Cancelled Item: ${orderItem.name}. Reason: ${reason || "Approved by staff"}`,
                timestamp: new Date(),
                audit: {
                  ...(command.triggeredById && { triggeredById: new Types.ObjectId(command.triggeredById) })
                }
              });
            }
          } else {
            for (const order of ordersToCancel) {
              await OrderService.cancelOrder(order._id.toString(), tenantId.toString(), reason || "Cancellation approved by staff", command.triggeredById?.toString());
              affectedOrders.add(order._id.toString());
            }
          }

          task.status = "COMPLETED";
          task.completedAt = new Date();
          task.metadata = { ...(task.metadata || {}), approvalStatus: "APPROVED", approvalReason: reason || "Approved by staff" };
          await task.save();

          await BillingService.recalculateBillSession(tenantId, sessionId);

          affectedSessions.add(sessionId.toString());
          waiterTasksList.push(task._id.toString());

          const { RealtimeService } = await import("../../sockets/realtime.service.js");
          RealtimeService.sendToSession(sessionId.toString(), "ORDER_CANCEL_APPROVED" as any, { taskId: task._id.toString(), status: "APPROVED" });
          break;
        }

        case 'REJECT_ORDER_CANCEL': {
          const { taskId, reason } = payload;
          const task = await WaiterTask.findOne({ _id: new Types.ObjectId(taskId), isDeleted: false });
          if (!task) throw new Error(`Waiter task ${taskId} not found`);

          task.status = "COMPLETED";
          task.completedAt = new Date();
          task.metadata = { ...(task.metadata || {}), approvalStatus: "REJECTED", rejectionReason: reason || "Rejected by staff" };
          await task.save();

          affectedSessions.add(task.sessionId.toString());
          waiterTasksList.push(task._id.toString());

          const { RealtimeService } = await import("../../sockets/realtime.service.js");
          RealtimeService.sendToSession(task.sessionId.toString(), "ORDER_CANCEL_REJECTED" as any, { taskId: task._id.toString(), status: "REJECTED", reason });
          break;
        }

        default:
          throw new Error(`Unsupported operation: ${operationType}`);
      }

      return true;
    });

    const durationMs = Date.now() - start;

    return {
      operationId,
      success: !!result,
      eventsPublished,
      affectedEntities: {
        tables: Array.from(affectedTables),
        sessions: Array.from(affectedSessions),
        orders: Array.from(affectedOrders)
      },
      warnings,
      traceId,
      correlationId,
      durationMs,
      waiterTasks: waiterTasksList
    };
  }

  static async handleQRAssistanceRequested(
    tenantId: any,
    outletId: any,
    tableId: any,
    sessionId: any,
    assistanceType: string,
    seatNumber?: string
  ): Promise<any> {
    const taskType = mapAssistanceTypeToTaskType(assistanceType);

    const existingTask = await WaiterTask.findOne({
      sessionId: new Types.ObjectId(sessionId),
      taskType,
      status: { $in: ["CREATED", "ASSIGNED", "ACKNOWLEDGED", "IN_PROGRESS"] },
      isDeleted: false
    });

    if (existingTask) {
      return existingTask;
    }

    let priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = "MEDIUM";
    if (taskType === "BILL") {
      priority = "HIGH";

      const session = await QRSession.findById(sessionId);
      if (session && session.status !== "PAYMENT_PENDING" && session.status !== "CLOSED") {
        await QRSessionService.updateSessionStatus(sessionId, "PAYMENT_PENDING");
      }
    } else if (taskType === "WATER" || taskType === "TISSUE" || taskType === "SPOON") {
      priority = "LOW";
    }

    const metadata = {
      seatNumber: seatNumber || null,
      requestTime: new Date()
    };

    const task = await WaiterTaskService.createTask(
      tenantId,
      outletId,
      tableId,
      sessionId,
      taskType,
      "QR_ASSISTANCE",
      {
        priority,
        ...(seatNumber && { seatNumber }),
        metadata
      }
    );

    const table = await TableService.getTableById(tableId);
    const tableNum = table ? table.tableNumber : "Unknown";
    const alertTitle = `${taskType.replace('_', ' ')} Requested`;
    const alertMessage = `Table ${tableNum}${seatNumber ? ` (Seat ${seatNumber})` : ''} requested ${assistanceType.toLowerCase().replace('_', ' ')}.`;

    await NotificationService.notifyOutletOperationalAlert(
      tenantId.toString(),
      outletId.toString(),
      alertTitle,
      alertMessage,
      tableId.toString(),
      "Table"
    ).catch(err => console.error("Failed to notify operational alert:", err));

    return task;
  }

  static async handleOrderReady(
    tenantId: any,
    outletId: any,
    orderId: any,
    sessionId: any,
    tableId: any,
    seatNumber?: string
  ): Promise<any> {
    const existingTask = await WaiterTask.findOne({
      associatedOrderId: new Types.ObjectId(orderId),
      taskType: "SERVE_FOOD",
      status: { $in: ["CREATED", "ASSIGNED", "ACKNOWLEDGED", "IN_PROGRESS"] },
      isDeleted: false
    });

    if (existingTask) {
      return existingTask;
    }

    const metadata = {
      orderId: orderId.toString(),
      seatNumber: seatNumber || null,
      readyAt: new Date()
    };

    const task = await WaiterTaskService.createTask(
      tenantId,
      outletId,
      tableId,
      sessionId,
      "SERVE_FOOD",
      "KITCHEN",
      {
        priority: "HIGH",
        ...(seatNumber && { seatNumber }),
        associatedOrderId: orderId.toString(),
        metadata
      }
    );

    const table = await TableService.getTableById(tableId);
    const tableNum = table ? table.tableNumber : "Unknown";
    const alertTitle = `Food Ready - Table ${tableNum}`;
    const alertMessage = `Order is ready to be served to Table ${tableNum}${seatNumber ? ` (Seat ${seatNumber})` : ''}.`;

    await NotificationService.notifyOutletOperationalAlert(
      tenantId.toString(),
      outletId.toString(),
      alertTitle,
      alertMessage,
      tableId.toString(),
      "Table"
    ).catch(err => console.error("Failed to notify operational alert:", err));

    return task;
  }

  static async handleTableCleaningStarted(
    tenantId: any,
    outletId: any,
    tableId: any,
    sessionId: any
  ): Promise<any> {
    const existingTask = await WaiterTask.findOne({
      sessionId: new Types.ObjectId(sessionId),
      taskType: "CLEANING",
      status: { $in: ["CREATED", "ASSIGNED", "ACKNOWLEDGED", "IN_PROGRESS"] },
      isDeleted: false
    });

    if (existingTask) {
      return existingTask;
    }

    const task = await WaiterTaskService.createTask(
      tenantId,
      outletId,
      tableId,
      sessionId,
      "CLEANING",
      "TABLE_CLEANING",
      {
        priority: "MEDIUM"
      }
    );

    const table = await TableService.getTableById(tableId);
    const tableNum = table ? table.tableNumber : "Unknown";
    const alertTitle = `Table Cleaning Required`;
    const alertMessage = `Table ${tableNum} needs to be cleaned and reset.`;

    await NotificationService.notifyOutletOperationalAlert(
      tenantId.toString(),
      outletId.toString(),
      alertTitle,
      alertMessage,
      tableId.toString(),
      "Table"
    ).catch(err => console.error("Failed to notify operational alert:", err));

    return task;
  }

  static async handleBillRequested(
    tenantId: any,
    outletId: any,
    tableId: any,
    sessionId: any
  ): Promise<any> {
    const existingTask = await WaiterTask.findOne({
      sessionId: new Types.ObjectId(sessionId),
      taskType: "BILL",
      status: { $in: ["CREATED", "ASSIGNED", "ACKNOWLEDGED", "IN_PROGRESS"] },
      isDeleted: false
    });

    if (existingTask) {
      return existingTask;
    }

    const task = await WaiterTaskService.createTask(
      tenantId,
      outletId,
      tableId,
      sessionId,
      "BILL",
      "BILL_REQUEST",
      {
        priority: "HIGH"
      }
    );

    const table = await TableService.getTableById(tableId);
    const tableNum = table ? table.tableNumber : "Unknown";
    const alertTitle = `Bill Requested`;
    const alertMessage = `Table ${tableNum} requested checkout bill.`;

    await NotificationService.notifyOutletOperationalAlert(
      tenantId.toString(),
      outletId.toString(),
      alertTitle,
      alertMessage,
      tableId.toString(),
      "Table"
    ).catch(err => console.error("Failed to notify operational alert:", err));

    return task;
  }
}
