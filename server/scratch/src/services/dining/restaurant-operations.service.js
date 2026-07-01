import mongoose, { Types } from "mongoose";
import { TableService } from "./table.service.js";
import { QRSessionService } from "./qrsession.service.js";
import { WaiterTaskService } from "./waiter-task.service.js";
import { NotificationService } from "../notification.service.js";
import WaiterTask from "../../models/waitertask.model.js";
import QRSession from "../../models/qrsession.model.js";
import Table from "../../models/table.model.js";
import Order from "../../models/order.model.js";
import OrderTimeline from "../../models/ordertimeline.model.js";
import { EventBusService } from "../event-bus.service.js";
// Helper to map assistance action strings to typed WaiterTaskType
function mapAssistanceTypeToTaskType(assistanceType) {
    const type = String(assistanceType).toUpperCase();
    if (type === "WATER")
        return "WATER";
    if (type === "BILL")
        return "BILL";
    if (type === "TISSUE")
        return "TISSUE";
    if (type === "SPOON")
        return "SPOON";
    if (type === "CLEANING")
        return "CLEANING";
    return "CUSTOM"; // Default to CUSTOM/General Assistance
}
export class RestaurantOperationsService {
    static tables = TableService;
    static sessions = QRSessionService;
    static waiterTasks = WaiterTaskService;
    static async runInTransaction(fn) {
        const session = await mongoose.startSession();
        try {
            session.startTransaction();
            const result = await fn(session);
            await session.commitTransaction();
            return result;
        }
        catch (error) {
            if (session.inTransaction()) {
                await session.abortTransaction();
            }
            const isReplicaSetError = error.message && (error.message.includes("ReplicaSetNoPrimary") ||
                error.message.includes("not a replica set") ||
                error.message.includes("Transaction numbers are only allowed on a Replica Set member"));
            if (isReplicaSetError) {
                console.warn("[RestaurantOperationsService] MongoDB Transactions not supported. Falling back to non-transactional execution.");
                return await fn(undefined);
            }
            throw error;
        }
        finally {
            session.endSession();
        }
    }
    static async executeOperation(command) {
        const operationId = new Types.ObjectId().toString();
        const traceId = operationId;
        const correlationId = command.payload?.correlationId || new Types.ObjectId().toString();
        const start = Date.now();
        const affectedTables = new Set();
        const affectedSessions = new Set();
        const affectedOrders = new Set();
        const eventsPublished = [];
        const waiterTasksList = [];
        const warnings = [];
        const result = await this.runInTransaction(async (dbSession) => {
            const { operationType, payload } = command;
            const tenantId = new Types.ObjectId(command.tenantId);
            const outletId = new Types.ObjectId(command.outletId);
            switch (operationType) {
                case 'TRANSFER_TABLE': {
                    const { fromTableId, toTableId, expectedVersionFrom, expectedVersionTo } = payload;
                    const fromTable = await Table.findOne({ _id: new Types.ObjectId(fromTableId), tenantId, isDeleted: false }).session(dbSession || null);
                    const toTable = await Table.findOne({ _id: new Types.ObjectId(toTableId), tenantId, isDeleted: false }).session(dbSession || null);
                    if (!fromTable)
                        throw new Error(`Origin Table ${fromTableId} not found`);
                    if (!toTable)
                        throw new Error(`Destination Table ${toTableId} not found`);
                    // Optimistic Locking Check
                    if (expectedVersionFrom && fromTable.updatedAt.toISOString() !== new Date(expectedVersionFrom).toISOString()) {
                        throw new Error("Concurrency Conflict: Origin table has been modified concurrently.");
                    }
                    if (expectedVersionTo && toTable.updatedAt.toISOString() !== new Date(expectedVersionTo).toISOString()) {
                        throw new Error("Concurrency Conflict: Destination table has been modified concurrently.");
                    }
                    // Validation
                    if (!fromTable.activeSessionId) {
                        throw new Error("Origin table does not have an active session");
                    }
                    if (toTable.activeSessionId && toTable.activeSessionId.toString() !== fromTable.activeSessionId.toString()) {
                        throw new Error("Destination table is already occupied");
                    }
                    const activeSessionId = fromTable.activeSessionId;
                    affectedSessions.add(activeSessionId.toString());
                    // Update QRSession table pointer
                    const sessionDoc = await QRSession.findById(activeSessionId).session(dbSession || null);
                    if (!sessionDoc)
                        throw new Error("Active QR session not found");
                    sessionDoc.tableId = toTable._id;
                    await sessionDoc.save(dbSession ? { session: dbSession } : undefined);
                    // Update Orders diningContext
                    const orders = await Order.find({ "diningContext.sessionId": activeSessionId, isDeleted: false }).session(dbSession || null);
                    for (const order of orders) {
                        if (order.diningContext) {
                            order.diningContext.tableId = toTable._id;
                            order.diningContext.tableNumber = toTable.tableNumber;
                            await order.save(dbSession ? { session: dbSession } : undefined);
                            affectedOrders.add(order._id.toString());
                        }
                    }
                    // Handle Merged Tables transfer
                    if (fromTable.isMerged) {
                        toTable.isMerged = true;
                        toTable.mergedWithTableIds = fromTable.mergedWithTableIds || [];
                        // If we are transferring the primary table in a merge
                        const secondaryIds = fromTable.mergedWithTableIds || [];
                        for (const secId of secondaryIds) {
                            const secTable = await Table.findById(secId).session(dbSession || null);
                            if (secTable && secTable.isMerged && secTable.mergedWithTableIds) {
                                // Replace fromTable._id with toTable._id in secondary table's merged list
                                secTable.mergedWithTableIds = secTable.mergedWithTableIds.map(id => id.toString() === fromTable._id.toString() ? toTable._id : id);
                                await secTable.save(dbSession ? { session: dbSession } : undefined);
                                affectedTables.add(secTable._id.toString());
                            }
                        }
                    }
                    // Transfer session pointers
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
                    // Log timeline
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
                    // Outbox event
                    await EventBusService.publishTableTransferred(tenantId, outletId, fromTable._id, {
                        fromTableId: fromTable._id.toString(),
                        toTableId: toTable._id.toString(),
                        sessionId: activeSessionId.toString()
                    }, { correlationId, createdBy: command.triggeredById });
                    eventsPublished.push("TABLE_TRANSFERRED");
                    break;
                }
                case 'MERGE_TABLE': {
                    const { primaryTableId, secondaryTableIds, expectedVersionPrimary } = payload;
                    const primaryTable = await Table.findOne({ _id: new Types.ObjectId(primaryTableId), tenantId, isDeleted: false }).session(dbSession || null);
                    if (!primaryTable)
                        throw new Error(`Primary Table ${primaryTableId} not found`);
                    if (expectedVersionPrimary && primaryTable.updatedAt.toISOString() !== new Date(expectedVersionPrimary).toISOString()) {
                        throw new Error("Concurrency Conflict: Primary table has been modified concurrently.");
                    }
                    if (!primaryTable.activeSessionId) {
                        throw new Error("Primary table must have an active session to merge");
                    }
                    const activeSessionId = primaryTable.activeSessionId;
                    affectedSessions.add(activeSessionId.toString());
                    affectedTables.add(primaryTable._id.toString());
                    const newSecondaryIds = [];
                    for (const secId of secondaryTableIds) {
                        const secTable = await Table.findOne({ _id: new Types.ObjectId(secId), tenantId, isDeleted: false }).session(dbSession || null);
                        if (!secTable)
                            throw new Error(`Secondary Table ${secId} not found`);
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
                    // Log timeline
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
                    await EventBusService.publishTableMerged(tenantId, outletId, primaryTable._id, {
                        primaryTableId: primaryTable._id.toString(),
                        secondaryTableIds: secondaryTableIds.map((id) => id.toString()),
                        sessionId: activeSessionId.toString()
                    }, { correlationId, createdBy: command.triggeredById });
                    eventsPublished.push("TABLE_MERGED");
                    break;
                }
                case 'UNMERGE_TABLE': {
                    const { primaryTableId } = payload;
                    const table = await Table.findOne({ _id: new Types.ObjectId(primaryTableId), tenantId, isDeleted: false }).session(dbSession || null);
                    if (!table)
                        throw new Error(`Table ${primaryTableId} not found`);
                    let primaryTable = table;
                    let secondaryIds = [];
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
                    if (activeSessionId)
                        affectedSessions.add(activeSessionId.toString());
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
                    await EventBusService.publishTableUnmerged(tenantId, outletId, primaryTable._id, {
                        primaryTableId: primaryTable._id.toString(),
                        secondaryTableIds: secondaryIds.map(id => id.toString())
                    }, { correlationId, createdBy: command.triggeredById });
                    eventsPublished.push("TABLE_UNMERGED");
                    break;
                }
                case 'MOVE_SEAT': {
                    const { sessionId, fromSeatNumber, toSeatNumber } = payload;
                    const sessionDoc = await QRSession.findOne({ _id: new Types.ObjectId(sessionId), tenantId, isDeleted: false }).session(dbSession || null);
                    if (!sessionDoc)
                        throw new Error(`QR Session ${sessionId} not found`);
                    affectedSessions.add(sessionDoc._id.toString());
                    affectedTables.add(sessionDoc.tableId.toString());
                    const seatIndex = sessionDoc.seats.findIndex(s => s.seatNumber === fromSeatNumber);
                    if (seatIndex === -1)
                        throw new Error(`Seat ${fromSeatNumber} not found in session`);
                    const targetSeat = sessionDoc.seats.find(s => s.seatNumber === toSeatNumber);
                    if (targetSeat)
                        throw new Error(`Seat ${toSeatNumber} is already occupied`);
                    const seatObj = sessionDoc.seats[seatIndex];
                    if (!seatObj)
                        throw new Error("Seat object not found");
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
                    await EventBusService.publishSeatMoved(tenantId, outletId, sessionDoc.tableId, {
                        sessionId: sessionDoc._id.toString(),
                        fromSeatNumber,
                        toSeatNumber
                    }, { correlationId, createdBy: command.triggeredById });
                    eventsPublished.push("SEAT_MOVED");
                    break;
                }
                case 'SWAP_SEAT': {
                    const { sessionId, seatNumberA, seatNumberB } = payload;
                    const sessionDoc = await QRSession.findOne({ _id: new Types.ObjectId(sessionId), tenantId, isDeleted: false }).session(dbSession || null);
                    if (!sessionDoc)
                        throw new Error(`QR Session ${sessionId} not found`);
                    affectedSessions.add(sessionDoc._id.toString());
                    affectedTables.add(sessionDoc.tableId.toString());
                    const seatA = sessionDoc.seats.find(s => s.seatNumber === seatNumberA);
                    const seatB = sessionDoc.seats.find(s => s.seatNumber === seatNumberB);
                    if (!seatA || !seatB)
                        throw new Error(`Seat ${seatNumberA} or Seat ${seatNumberB} not found`);
                    const tempCust = seatA.customerId;
                    const tempDevice = seatA.deviceToken;
                    const tempJoined = seatA.joinedAt;
                    seatA.customerId = seatB.customerId !== undefined ? seatB.customerId : null;
                    if (seatB.deviceToken !== undefined) {
                        seatA.deviceToken = seatB.deviceToken;
                    }
                    else {
                        delete seatA.deviceToken;
                    }
                    seatA.joinedAt = seatB.joinedAt !== undefined ? seatB.joinedAt : new Date();
                    seatB.customerId = tempCust !== undefined ? tempCust : null;
                    if (tempDevice !== undefined) {
                        seatB.deviceToken = tempDevice;
                    }
                    else {
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
                            }
                            else if (order.diningContext.seatNumber === seatNumberB) {
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
                    await EventBusService.publishSeatSwapped(tenantId, outletId, sessionDoc.tableId, {
                        sessionId: sessionDoc._id.toString(),
                        seatNumberA,
                        seatNumberB
                    }, { correlationId, createdBy: command.triggeredById });
                    eventsPublished.push("SEAT_SWAPPED");
                    break;
                }
                case 'ADD_SEAT': {
                    const { sessionId, seatNumber, customerId } = payload;
                    const sessionDoc = await QRSession.findOne({ _id: new Types.ObjectId(sessionId), tenantId, isDeleted: false }).session(dbSession || null);
                    if (!sessionDoc)
                        throw new Error(`QR Session ${sessionId} not found`);
                    affectedSessions.add(sessionDoc._id.toString());
                    affectedTables.add(sessionDoc.tableId.toString());
                    const targetSeat = sessionDoc.seats.find(s => s.seatNumber === seatNumber);
                    if (targetSeat)
                        throw new Error(`Seat ${seatNumber} already exists in session`);
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
                    await EventBusService.publishSeatAdded(tenantId, outletId, sessionDoc.tableId, {
                        sessionId: sessionDoc._id.toString(),
                        seatNumber,
                        customerId: customerId || null
                    }, { correlationId, createdBy: command.triggeredById });
                    eventsPublished.push("SEAT_ADDED");
                    break;
                }
                case 'REMOVE_SEAT': {
                    const { sessionId, seatNumber } = payload;
                    const sessionDoc = await QRSession.findOne({ _id: new Types.ObjectId(sessionId), tenantId, isDeleted: false }).session(dbSession || null);
                    if (!sessionDoc)
                        throw new Error(`QR Session ${sessionId} not found`);
                    affectedSessions.add(sessionDoc._id.toString());
                    affectedTables.add(sessionDoc.tableId.toString());
                    const targetSeat = sessionDoc.seats.find(s => s.seatNumber === seatNumber);
                    if (!targetSeat)
                        throw new Error(`Seat ${seatNumber} not found in session`);
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
                    await EventBusService.publishSeatRemoved(tenantId, outletId, sessionDoc.tableId, {
                        sessionId: sessionDoc._id.toString(),
                        seatNumber
                    }, { correlationId, createdBy: command.triggeredById });
                    eventsPublished.push("SEAT_REMOVED");
                    break;
                }
                case 'CHANGE_GUEST_COUNT': {
                    const { tableId, seatCount } = payload;
                    const tableDoc = await Table.findOne({ _id: new Types.ObjectId(tableId), tenantId, isDeleted: false }).session(dbSession || null);
                    if (!tableDoc)
                        throw new Error(`Table ${tableId} not found`);
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
                    await EventBusService.publishGuestCountChanged(tenantId, outletId, tableDoc._id, {
                        tableId: tableDoc._id.toString(),
                        seatCount: Number(seatCount)
                    }, { correlationId, createdBy: command.triggeredById });
                    eventsPublished.push("GUEST_COUNT_CHANGED");
                    break;
                }
                case 'CHANGE_WAITER': {
                    const { sessionId, waiterId } = payload;
                    const sessionDoc = await QRSession.findOne({ _id: new Types.ObjectId(sessionId), tenantId, isDeleted: false }).session(dbSession || null);
                    if (!sessionDoc)
                        throw new Error(`QR Session ${sessionId} not found`);
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
                    await EventBusService.publishWaiterChanged(tenantId, outletId, sessionDoc.tableId, {
                        sessionId: sessionDoc._id.toString(),
                        waiterId: waiterId || null
                    }, { correlationId, createdBy: command.triggeredById });
                    eventsPublished.push("WAITER_CHANGED");
                    break;
                }
                case 'CLOSE_SESSION': {
                    const { sessionId } = payload;
                    const sessionDoc = await QRSession.findOne({ _id: new Types.ObjectId(sessionId), tenantId, isDeleted: false }).session(dbSession || null);
                    if (!sessionDoc)
                        throw new Error(`QR Session ${sessionId} not found`);
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
                    await EventBusService.publishSessionClosed(tenantId, outletId, sessionDoc.tableId, {
                        sessionId: sessionDoc._id.toString()
                    }, { correlationId, createdBy: command.triggeredById });
                    eventsPublished.push("SESSION_CLOSED");
                    break;
                }
                case 'REQUEST_BILL': {
                    const { sessionId } = payload;
                    const sessionDoc = await QRSession.findOne({ _id: new Types.ObjectId(sessionId), tenantId, isDeleted: false }).session(dbSession || null);
                    if (!sessionDoc)
                        throw new Error(`QR Session ${sessionId} not found`);
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
                    if (!tableDoc)
                        throw new Error(`Table ${tableId} not found`);
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
    /**
     * Handle QR assistance requests by spawning a waiter task and sending notifications
     */
    static async handleQRAssistanceRequested(tenantId, outletId, tableId, sessionId, assistanceType, seatNumber) {
        const taskType = mapAssistanceTypeToTaskType(assistanceType);
        // Prevent duplicate pending tasks of same type for the active QR Session
        const existingTask = await WaiterTask.findOne({
            sessionId: new Types.ObjectId(sessionId),
            taskType,
            status: { $in: ["CREATED", "ASSIGNED", "ACKNOWLEDGED", "IN_PROGRESS"] },
            isDeleted: false
        });
        if (existingTask) {
            console.log(`[RestaurantOperationsService] Pending task of type ${taskType} already exists for session ${sessionId}. Skipping duplicate creation.`);
            return existingTask;
        }
        let priority = "MEDIUM";
        if (taskType === "BILL") {
            priority = "HIGH";
            // Transition session to PAYMENT_PENDING which auto-sets table status to BILL_REQUESTED
            const session = await QRSession.findById(sessionId);
            if (session && session.status !== "PAYMENT_PENDING" && session.status !== "CLOSED") {
                await QRSessionService.updateSessionStatus(sessionId, "PAYMENT_PENDING");
            }
        }
        else if (taskType === "WATER" || taskType === "TISSUE" || taskType === "SPOON") {
            priority = "LOW";
        }
        const metadata = {
            seatNumber: seatNumber || null,
            requestTime: new Date()
        };
        const task = await WaiterTaskService.createTask(tenantId, outletId, tableId, sessionId, taskType, "QR_ASSISTANCE", {
            priority,
            ...(seatNumber && { seatNumber }),
            metadata
        });
        // Dispatch operational notification
        const table = await TableService.getTableById(tableId);
        const tableNum = table ? table.tableNumber : "Unknown";
        const alertTitle = `${taskType.replace('_', ' ')} Requested`;
        const alertMessage = `Table ${tableNum}${seatNumber ? ` (Seat ${seatNumber})` : ''} requested ${assistanceType.toLowerCase().replace('_', ' ')}.`;
        await NotificationService.notifyOutletOperationalAlert(tenantId.toString(), outletId.toString(), alertTitle, alertMessage, tableId.toString(), "Table").catch(err => console.error("Failed to notify operational alert:", err));
        return task;
    }
    /**
     * Handle food ready order status events by spawning a food runner task
     */
    static async handleOrderReady(tenantId, outletId, orderId, sessionId, tableId, seatNumber) {
        const existingTask = await WaiterTask.findOne({
            associatedOrderId: new Types.ObjectId(orderId),
            taskType: "SERVE_FOOD",
            status: { $in: ["CREATED", "ASSIGNED", "ACKNOWLEDGED", "IN_PROGRESS"] },
            isDeleted: false
        });
        if (existingTask) {
            console.log(`[RestaurantOperationsService] Food runner task already exists for order ${orderId}. Skipping duplicate creation.`);
            return existingTask;
        }
        const metadata = {
            orderId: orderId.toString(),
            seatNumber: seatNumber || null,
            readyAt: new Date()
        };
        const task = await WaiterTaskService.createTask(tenantId, outletId, tableId, sessionId, "SERVE_FOOD", "KITCHEN", {
            priority: "HIGH",
            ...(seatNumber && { seatNumber }),
            associatedOrderId: orderId.toString(),
            metadata
        });
        // Dispatch alert
        const table = await TableService.getTableById(tableId);
        const tableNum = table ? table.tableNumber : "Unknown";
        const alertTitle = `Food Ready - Table ${tableNum}`;
        const alertMessage = `Order is ready to be served to Table ${tableNum}${seatNumber ? ` (Seat ${seatNumber})` : ''}.`;
        await NotificationService.notifyOutletOperationalAlert(tenantId.toString(), outletId.toString(), alertTitle, alertMessage, tableId.toString(), "Table").catch(err => console.error("Failed to notify operational alert:", err));
        return task;
    }
    /**
     * Handle table cleaning start events by spawning a cleaning task
     */
    static async handleTableCleaningStarted(tenantId, outletId, tableId, sessionId) {
        const existingTask = await WaiterTask.findOne({
            sessionId: new Types.ObjectId(sessionId),
            taskType: "CLEANING",
            status: { $in: ["CREATED", "ASSIGNED", "ACKNOWLEDGED", "IN_PROGRESS"] },
            isDeleted: false
        });
        if (existingTask) {
            console.log(`[RestaurantOperationsService] Cleaning task already exists for session ${sessionId}. Skipping duplicate creation.`);
            return existingTask;
        }
        const task = await WaiterTaskService.createTask(tenantId, outletId, tableId, sessionId, "CLEANING", "TABLE_CLEANING", {
            priority: "MEDIUM"
        });
        // Dispatch alert
        const table = await TableService.getTableById(tableId);
        const tableNum = table ? table.tableNumber : "Unknown";
        const alertTitle = `Table Cleaning Required`;
        const alertMessage = `Table ${tableNum} needs to be cleaned and reset.`;
        await NotificationService.notifyOutletOperationalAlert(tenantId.toString(), outletId.toString(), alertTitle, alertMessage, tableId.toString(), "Table").catch(err => console.error("Failed to notify operational alert:", err));
        return task;
    }
    /**
     * Handle bill request table events by spawning a bill delivery task
     */
    static async handleBillRequested(tenantId, outletId, tableId, sessionId) {
        const existingTask = await WaiterTask.findOne({
            sessionId: new Types.ObjectId(sessionId),
            taskType: "BILL",
            status: { $in: ["CREATED", "ASSIGNED", "ACKNOWLEDGED", "IN_PROGRESS"] },
            isDeleted: false
        });
        if (existingTask) {
            console.log(`[RestaurantOperationsService] Bill delivery task already exists for session ${sessionId}. Skipping duplicate creation.`);
            return existingTask;
        }
        const task = await WaiterTaskService.createTask(tenantId, outletId, tableId, sessionId, "BILL", "BILL_REQUEST", {
            priority: "HIGH"
        });
        // Dispatch alert
        const table = await TableService.getTableById(tableId);
        const tableNum = table ? table.tableNumber : "Unknown";
        const alertTitle = `Bill Requested`;
        const alertMessage = `Table ${tableNum} requested checkout bill.`;
        await NotificationService.notifyOutletOperationalAlert(tenantId.toString(), outletId.toString(), alertTitle, alertMessage, tableId.toString(), "Table").catch(err => console.error("Failed to notify operational alert:", err));
        return task;
    }
}
