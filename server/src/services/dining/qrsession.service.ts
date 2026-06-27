import { Types } from "mongoose";
import crypto from "crypto";
import QRSession, { IQRSession, QRSessionStatus } from "../../models/qrsession.model.js";
import Table from "../../models/table.model.js";
import { TableService } from "./table.service.js";

export class QRSessionService {
  /**
   * Create a new QRSession at a table
   */
  static async createSession(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId,
    tableId: string | Types.ObjectId,
    options: { customerId?: string; seatNumber?: string; waiterId?: string } = {}
  ): Promise<IQRSession> {
    const table = await Table.findOne({ _id: new Types.ObjectId(tableId), isDeleted: false });
    if (!table) {
      throw new Error(`Table not found: ${tableId}`);
    }

    // Generate a clean 6-digit numeric join code for group sessions
    const joinCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Create session
    const session = new QRSession({
      tenantId: new Types.ObjectId(tenantId),
      outletId: new Types.ObjectId(outletId),
      tableId: new Types.ObjectId(tableId),
      status: "ACTIVE",
      joinCode,
      seats: options.seatNumber ? [{
        seatNumber: options.seatNumber,
        customerId: options.customerId ? new Types.ObjectId(options.customerId) : null,
        joinedAt: new Date()
      }] : [],
      customerId: options.customerId ? new Types.ObjectId(options.customerId) : null,
      seatNumber: options.seatNumber || null,
      waiterId: options.waiterId ? new Types.ObjectId(options.waiterId) : null,
      openedAt: new Date()
    });

    await session.save();

    // Link session to Table (aggregate root)
    table.activeSessionId = session._id;
    await table.save();

    // Update table state to OCCUPIED
    await TableService.updateTableOperationalStatus(tenantId, outletId, tableId, "OCCUPIED", {
      correlationId: session.sessionToken
    });

    return session;
  }

  /**
   * Retrieve active session by ID
   */
  static async getSessionById(sessionId: string | Types.ObjectId): Promise<IQRSession | null> {
    return await QRSession.findOne({ _id: new Types.ObjectId(sessionId), isDeleted: false });
  }

  /**
   * Find an active session by table token
   */
  static async getActiveSessionByTable(tableId: string | Types.ObjectId): Promise<IQRSession | null> {
    const table = await Table.findOne({ _id: new Types.ObjectId(tableId), isDeleted: false });
    if (!table || !table.activeSessionId) {
      return null;
    }
    return await QRSession.findOne({
      _id: table.activeSessionId,
      status: { $in: ["ACTIVE", "ORDERING", "DINING", "PAYMENT_PENDING", "OPEN", "ORDERED", "PAID"] },
      isDeleted: false
    });
  }

  /**
   * Join an existing session via a join code (Group ordering)
   */
  static async joinSessionByCode(
    joinCode: string,
    customerId: string | Types.ObjectId,
    seatNumber: string,
    options: { deviceToken?: string } = {}
  ): Promise<IQRSession> {
    const session = await QRSession.findOne({
      joinCode,
      status: { $in: ["ACTIVE", "ORDERING", "DINING", "OPEN", "ORDERED"] },
      isDeleted: false
    });

    if (!session) {
      throw new Error(`Active session not found for join code: ${joinCode}`);
    }

    // Check if seat is already occupied in the session
    const seatIndex = session.seats.findIndex((s) => s.seatNumber === seatNumber);
    if (seatIndex > -1) {
      const occupiedSeat = session.seats[seatIndex];
      if (occupiedSeat && occupiedSeat.customerId && occupiedSeat.customerId.toString() !== customerId.toString()) {
        throw new Error(`Seat ${seatNumber} is already occupied by another customer.`);
      }
    } else {
      const newSeat: any = {
        seatNumber,
        customerId: new Types.ObjectId(customerId),
        joinedAt: new Date()
      };
      if (options.deviceToken) {
        newSeat.deviceToken = options.deviceToken;
      }
      session.seats.push(newSeat);
    }

    await session.save();
    return session;
  }

  /**
   * Transition session status and update table state accordingly
   */
  static async updateSessionStatus(
    sessionId: string | Types.ObjectId,
    status: QRSessionStatus,
    options: { triggeredById?: string } = {}
  ): Promise<IQRSession> {
    const session = await QRSession.findOne({ _id: new Types.ObjectId(sessionId), isDeleted: false });
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.status = status;
    if (status === "CLOSED") {
      session.closedAt = new Date();
    }
    await session.save();

    // Map session status changes to physical Table operational statuses
    let tableStatus: any = null;
    if (status === "ORDERING") {
      tableStatus = "ORDERING";
    } else if (status === "DINING") {
      tableStatus = "DINING";
    } else if (status === "PAYMENT_PENDING") {
      tableStatus = "BILL_REQUESTED";
    } else if (status === "CLOSED") {
      tableStatus = "CLEANING";
    }

    if (tableStatus) {
      const updateOpts: any = {
        correlationId: session.sessionToken
      };
      if (options.triggeredById) {
        updateOpts.triggeredById = options.triggeredById;
      }

      // If session is closed, update table activeSessionId to null and store lastSessionId
      if (status === "CLOSED") {
        await Table.findOneAndUpdate(
          { _id: session.tableId },
          { 
            $set: { 
              activeSessionId: null, 
              lastSessionId: session._id 
            } 
          }
        );
      }

      await TableService.updateTableOperationalStatus(
        session.tenantId,
        session.outletId,
        session.tableId,
        tableStatus,
        updateOpts
      );
    }

    return session;
  }

  /**
   * Assign a waiter to lead a dining session
   */
  static async assignWaiter(
    sessionId: string | Types.ObjectId,
    waiterId: string | Types.ObjectId
  ): Promise<IQRSession> {
    const session = await QRSession.findOneAndUpdate(
      { _id: new Types.ObjectId(sessionId), isDeleted: false },
      { $set: { waiterId: new Types.ObjectId(waiterId) } },
      { new: true }
    );

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    return session;
  }
}
