import { Types } from "mongoose";
import crypto from "crypto";
import Table, { ITable, TableOperationalStatus } from "../../models/table.model.js";
import { EventBusService } from "../../events/eventBus.js";

export class TableService {

  static async createTable(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId,
    payload: {
      tableNumber: string;
      seatCount: number;
      diningAreaId?: string | Types.ObjectId;
      layout?: any;
    },
    triggeredById?: string
  ): Promise<ITable> {
    if (!payload.tableNumber) throw new Error("Table number is required");
    if (payload.seatCount < 1) throw new Error("Seat count must be at least 1");

    const existingTable = await Table.findOne({
      tenantId: new Types.ObjectId(tenantId),
      outletId: new Types.ObjectId(outletId),
      tableNumber: payload.tableNumber,
      isDeleted: false
    });

    if (existingTable) {
      throw new Error(`Table number ${payload.tableNumber} already exists in this outlet`);
    }

    const table = new Table({
      tenantId: new Types.ObjectId(tenantId),
      outletId: new Types.ObjectId(outletId),
      diningAreaId: payload.diningAreaId ? new Types.ObjectId(payload.diningAreaId) : null,
      tableNumber: payload.tableNumber,
      seatCount: payload.seatCount,
      layout: payload.layout || { x: 0, y: 0, width: 100, height: 100, rotation: 0, shape: 'SQUARE', zIndex: 0, labelPosition: 'CENTER' }
    });

    await table.save();

    await EventBusService.publishTableStatusChanged(
      tenantId,
      outletId,
      table._id,
      {
        tableId: table._id.toString(),
        tableNumber: table.tableNumber,
        status: table.operationalStatus,
        updatedAt: new Date()
      },
      { createdBy: triggeredById, sourceSystem: "SYSTEM" }
    );

    return table;
  }

  static async updateTable(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId,
    tableId: string | Types.ObjectId,
    payload: {
      tableNumber?: string;
      seatCount?: number;
      diningAreaId?: string | Types.ObjectId;
      layout?: any;
      status?: "ACTIVE" | "INACTIVE";
    },
    triggeredById?: string
  ): Promise<ITable> {
    const table = await Table.findOne({
      _id: new Types.ObjectId(tableId),
      tenantId: new Types.ObjectId(tenantId),
      outletId: new Types.ObjectId(outletId),
      isDeleted: false
    });

    if (!table) {
      throw new Error(`Table not found: ${tableId}`);
    }

    if (payload.tableNumber && payload.tableNumber !== table.tableNumber) {
      const existingTable = await Table.findOne({
        tenantId: new Types.ObjectId(tenantId),
        outletId: new Types.ObjectId(outletId),
        tableNumber: payload.tableNumber,
        isDeleted: false
      });
      if (existingTable) {
        throw new Error(`Table number ${payload.tableNumber} already exists in this outlet`);
      }
      table.tableNumber = payload.tableNumber;
    }

    if (payload.seatCount !== undefined) {
      if (payload.seatCount < 1) throw new Error("Seat count must be at least 1");
      table.seatCount = payload.seatCount;
    }
    if (payload.diningAreaId !== undefined) {
      table.diningAreaId = payload.diningAreaId ? new Types.ObjectId(payload.diningAreaId) : null;
    }
    if (payload.layout !== undefined) table.layout = payload.layout;
    if (payload.status !== undefined) table.status = payload.status;

    await table.save();
    return table;
  }

  static async archiveTable(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId,
    tableId: string | Types.ObjectId,
    triggeredById?: string
  ): Promise<ITable> {
    const table = await Table.findOne({
      _id: new Types.ObjectId(tableId),
      tenantId: new Types.ObjectId(tenantId),
      outletId: new Types.ObjectId(outletId),
      isDeleted: false
    });

    if (!table) {
      throw new Error(`Table not found: ${tableId}`);
    }

    if (table.operationalStatus !== "AVAILABLE") {
      throw new Error(`Cannot archive table because it is currently ${table.operationalStatus}`);
    }
    if (table.activeSessionId) {
      throw new Error(`Cannot archive table because it has an active session`);
    }

    table.isDeleted = true;
    table.status = "INACTIVE";
    await table.save();

    await EventBusService.publishTableStatusChanged(
      tenantId,
      outletId,
      table._id,
      {
        tableId: table._id.toString(),
        tableNumber: table.tableNumber,
        status: table.operationalStatus,
        isDeleted: true,
        updatedAt: new Date()
      },
      { createdBy: triggeredById, sourceSystem: "SYSTEM" }
    );

    return table;
  }

  static async getTableById(tableId: string | Types.ObjectId): Promise<ITable | null> {
    return await Table.findOne({ _id: new Types.ObjectId(tableId), isDeleted: false });
  }

  static async updateTableOperationalStatus(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId,
    tableId: string | Types.ObjectId,
    status: TableOperationalStatus,
    options: { correlationId?: string; triggeredById?: string; force?: boolean } = {}
  ): Promise<ITable> {
    const allowedPriorMap: Record<TableOperationalStatus, TableOperationalStatus[]> = {
      HELD: ['AVAILABLE', 'RESERVED', 'HELD'],
      RESERVED: ['AVAILABLE', 'HELD', 'RESERVED'],
      OCCUPIED: ['AVAILABLE', 'HELD', 'RESERVED', 'ORDERING', 'DINING', 'OCCUPIED'],
      ORDERING: ['AVAILABLE', 'HELD', 'RESERVED', 'OCCUPIED', 'DINING', 'ORDERING'],
      DINING: ['AVAILABLE', 'HELD', 'RESERVED', 'OCCUPIED', 'ORDERING', 'DINING'],
      BILL_REQUESTED: ['OCCUPIED', 'ORDERING', 'DINING', 'PAYMENT_PENDING', 'BILL_REQUESTED'],
      PAYMENT_PENDING: ['OCCUPIED', 'ORDERING', 'DINING', 'BILL_REQUESTED', 'PAYMENT_PENDING'],
      CLEANING: ['OCCUPIED', 'ORDERING', 'DINING', 'BILL_REQUESTED', 'PAYMENT_PENDING', 'AVAILABLE', 'CLEANING'],
      AVAILABLE: ['CLEANING', 'HELD', 'RESERVED', 'OCCUPIED', 'ORDERING', 'DINING', 'BILL_REQUESTED', 'PAYMENT_PENDING', 'AVAILABLE'],
    };

    const query: any = {
      _id: new Types.ObjectId(tableId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false
    };

    if (!options.force && allowedPriorMap[status]) {
      query.operationalStatus = { $in: allowedPriorMap[status] };
    }

    const table = await Table.findOneAndUpdate(
      query,
      { $set: { operationalStatus: status } },
      { new: true }
    );

    if (!table) {
      const existing = await Table.findOne({ _id: new Types.ObjectId(tableId), tenantId: new Types.ObjectId(tenantId) });
      if (!existing) {
        throw new Error(`Table not found: ${tableId}`);
      }
      throw new Error(`Invalid status transition from ${existing.operationalStatus} to ${status}`);
    }

    const payload = {
      tableId: table._id.toString(),
      tableNumber: table.tableNumber,
      status: table.operationalStatus,
      updatedAt: new Date()
    };

    const publishOpts = {
      correlationId: options.correlationId,
      createdBy: options.triggeredById,
      sourceSystem: "SYSTEM"
    };

    if (status === "OCCUPIED") {
      await EventBusService.publishTableOccupied(tenantId, outletId, tableId, payload, publishOpts);
    } else if (status === "AVAILABLE") {
      await EventBusService.publishTableAvailable(tenantId, outletId, tableId, payload, publishOpts);
    } else if (status === "RESERVED") {
      await EventBusService.publishTableReserved(tenantId, outletId, tableId, payload, publishOpts);
    } else if (status === "CLEANING") {
      await EventBusService.publishTableCleaningStarted(tenantId, outletId, tableId, payload, publishOpts);
    } else {
      await EventBusService.publishTableStatusChanged(tenantId, outletId, tableId, payload, publishOpts);
    }

    return table;
  }

  static async listTablesByOutlet(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId
  ): Promise<ITable[]> {
    return await Table.find({
      tenantId: new Types.ObjectId(tenantId),
      outletId: new Types.ObjectId(outletId),
      isDeleted: false
    }).sort({ tableNumber: 1 });
  }

  static async rotateQrToken(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId,
    tableId: string | Types.ObjectId,
    triggeredById?: string
  ): Promise<ITable> {
    const table = await Table.findOne({
      _id: new Types.ObjectId(tableId),
      tenantId: new Types.ObjectId(tenantId),
      outletId: new Types.ObjectId(outletId),
      isDeleted: false
    });

    if (!table) throw new Error(`Table not found: ${tableId}`);

    if (table.activeSessionId) {
      throw new Error("Cannot rotate QR token while there is an active dining session on this table.");
    }

    table.qrToken = crypto.randomBytes(16).toString('hex');

    await table.save();

    await EventBusService.publishTableStatusChanged(
      tenantId,
      outletId,
      table._id,
      {
        tableId: table._id.toString(),
        tableNumber: table.tableNumber,
        status: table.operationalStatus,
        updatedAt: new Date()
      },
      { createdBy: triggeredById, sourceSystem: "QR" }
    );

    return table;
  }

  static async handleReservationConfirmed(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId,
    tableId: string | Types.ObjectId,
    reservationId: string | Types.ObjectId
  ): Promise<void> {
    if (!tableId) return;
    const table = await Table.findOne({
      _id: new Types.ObjectId(tableId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false
    });
    if (!table) return;

    table.reservedSessionId = new Types.ObjectId(reservationId);
    await table.save();

    await EventBusService.publishTableStatusChanged(
      tenantId,
      outletId,
      table._id,
      {
        tableId: table._id.toString(),
        tableNumber: table.tableNumber,
        status: table.operationalStatus,
        updatedAt: new Date()
      }
    );
  }

  static async handleReservationSeated(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId,
    tableId: string | Types.ObjectId,
    sessionId?: string | Types.ObjectId | null
  ): Promise<void> {
    if (!tableId) return;
    const table = await Table.findOne({
      _id: new Types.ObjectId(tableId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false
    });
    if (!table) return;

    table.operationalStatus = "OCCUPIED";
    table.reservedSessionId = null;
    if (sessionId) {
      table.activeSessionId = new Types.ObjectId(sessionId);
    }
    await table.save();

    await EventBusService.publishTableOccupied(
      tenantId,
      outletId,
      table._id,
      {
        tableId: table._id.toString(),
        tableNumber: table.tableNumber,
        status: table.operationalStatus,
        updatedAt: new Date()
      }
    );
  }

  static async handleReservationCancelled(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId,
    tableId: string | Types.ObjectId
  ): Promise<void> {
    if (!tableId) return;
    const table = await Table.findOne({
      _id: new Types.ObjectId(tableId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false
    });
    if (!table) return;

    if (table.operationalStatus === "RESERVED") {
      table.operationalStatus = "AVAILABLE";
    }
    table.reservedSessionId = null;
    await table.save();

    await EventBusService.publishTableStatusChanged(
      tenantId,
      outletId,
      table._id,
      {
        tableId: table._id.toString(),
        tableNumber: table.tableNumber,
        status: table.operationalStatus,
        updatedAt: new Date()
      }
    );
  }
}
