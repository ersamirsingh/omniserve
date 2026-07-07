import { Types } from "mongoose";
import crypto from "crypto";
import Table, { ITable, TableOperationalStatus } from "../../models/table.model.js";
import { EventBusService } from "../../events/eventBus.js";

export class TableService {
  /**
   * Create a new Table
   */
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

    // Enforce unique table number within outlet
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

    // Broadcast table creation so live floor updates
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

  /**
   * Update an existing Table
   */
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

  /**
   * Archive (soft-delete) a Table
   */
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

    // Cannot delete active occupied or reserved tables
    if (table.operationalStatus !== "AVAILABLE") {
      throw new Error(`Cannot archive table because it is currently ${table.operationalStatus}`);
    }
    if (table.activeSessionId) {
      throw new Error(`Cannot archive table because it has an active session`);
    }

    table.isDeleted = true;
    table.status = "INACTIVE";
    await table.save();

    // Publish event so it drops from live floor
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
  /**
   * Retrieve table by ID
   */
  static async getTableById(tableId: string | Types.ObjectId): Promise<ITable | null> {
    return await Table.findOne({ _id: new Types.ObjectId(tableId), isDeleted: false });
  }

  /**
   * Update table operational status and publish status events
   */
  static async updateTableOperationalStatus(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId,
    tableId: string | Types.ObjectId,
    status: TableOperationalStatus,
    options: { correlationId?: string; triggeredById?: string } = {}
  ): Promise<ITable> {
    const table = await Table.findOneAndUpdate(
      { _id: new Types.ObjectId(tableId), tenantId: new Types.ObjectId(tenantId), isDeleted: false },
      { $set: { operationalStatus: status } },
      { new: true }
    );

    if (!table) {
      throw new Error(`Table not found: ${tableId}`);
    }

    // Publish event depending on the status transition
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

  /**
   * List tables by physical outlet
   */
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

  /**
   * Rotate the table's QR Token for security (e.g. guest left without closing session).
   * This detaches any active session, forcing it to be orphaned (preventing further scanning of the old code).
   */
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

    // Safer Policy: Do not allow rotating QR if there is an active dining session
    if (table.activeSessionId) {
      throw new Error("Cannot rotate QR token while there is an active dining session on this table.");
    }

    // Rotate token
    table.qrToken = crypto.randomBytes(16).toString('hex');
    
    // table.operationalStatus remains unchanged (likely AVAILABLE if no session exists)
    
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

  /**
   * Handle RESERVATION_CONFIRMED Event
   */
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

  /**
   * Handle RESERVATION_SEATED Event
   */
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

  /**
   * Handle RESERVATION_CANCELLED Event
   */
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

    // Only set back to AVAILABLE if it was RESERVED
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
