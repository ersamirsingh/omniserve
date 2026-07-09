import mongoose, { Types } from "mongoose";
import Reservation, { ReservationStatus } from "../../models/reservation.model.js";
import Table from "../../models/table.model.js";
import { EventBusService } from "../../events/eventBus.js";
import { QRSessionService } from "./qrsession.service.js";
import Outlet from "../../models/outlet.model.js";

export interface ICreateReservationInput {
  outletId: Types.ObjectId;
  guestName: string;
  partySize: number;
  scheduledAt: Date;
  guestPhone?: string;
  guestEmail?: string;
  tableId?: string;
  diningAreaId?: string;
  customerId?: string;
  specialRequests?: string;
  notes?: string;
  seatNumber?: string;
  seatNumbers?: string[];
  createdBy?: Types.ObjectId;
}

export interface IReservationResult {
  reservationId: string;
  guestName: string;
  partySize: number;
  scheduledAt: Date;
  status: ReservationStatus;
  tableId?: string | null;
  tableNumber?: string | null;
}

export class ReservationService {
  /**
   * Create a new reservation — starts as PENDING.
   */
  static async createReservation(
    tenantId: Types.ObjectId,
    input: ICreateReservationInput
  ): Promise<IReservationResult> {
    // Validate outlet is active (open)
    const outlet = await Outlet.findOne({
      _id: new Types.ObjectId(input.outletId),
      tenantId,
      isDeleted: false
    });
    if (!outlet) throw new Error("Outlet not found");
    if (outlet.status === "INACTIVE") {
      throw new Error("This outlet is currently closed. Bookings are disabled.");
    }

    // Determine and normalize seat numbers for compatibility
    const seatNumbers = input.seatNumbers || (input.seatNumber ? [input.seatNumber] : []);
    const seatNumber = input.seatNumber || (input.seatNumbers && input.seatNumbers.length > 0 ? input.seatNumbers[0] : null);

    if (seatNumbers.length > 0) {
      if (seatNumbers.length !== input.partySize) {
        throw new Error(`Selected seat count (${seatNumbers.length}) must equal party size (${input.partySize})`);
      }
      const uniqueSeats = new Set(seatNumbers);
      if (uniqueSeats.size !== seatNumbers.length) {
        throw new Error("Seat selection cannot contain duplicates");
      }
    }

    // If a table is specified, validate it exists and is not already reserved at the slot
    let tableNumber: string | null = null;
    if (input.tableId) {
      const table = await Table.findOne({
        _id: new Types.ObjectId(input.tableId),
        tenantId,
        isDeleted: false
      });
      if (!table) throw new Error(`Table ${input.tableId} not found`);

      // Validate capacity
      if (table.seatCount < input.partySize) {
        throw new Error(`Table capacity (${table.seatCount}) is smaller than party size (${input.partySize})`);
      }

      // Check for time-overlapping confirmed/active reservations (within ±2 hour window)
      const windowStart = new Date(input.scheduledAt.getTime() - 2 * 60 * 60 * 1000);
      const windowEnd = new Date(input.scheduledAt.getTime() + 2 * 60 * 60 * 1000);

      const overlapping = await Reservation.find({
        tableId: new Types.ObjectId(input.tableId),
        tenantId,
        status: { $in: ["PENDING", "CONFIRMED", "SEATED", "HOLD"] },
        scheduledAt: { $gte: windowStart, $lte: windowEnd },
        isDeleted: false
      });

      const occupiedSeats = new Set<string>();
      for (const res of overlapping) {
        const resSeats = res.seatNumbers && res.seatNumbers.length > 0 ? res.seatNumbers : (res.seatNumber ? [res.seatNumber] : []);
        resSeats.forEach(s => occupiedSeats.add(s));
      }

      // Also check active QRSession seat occupancy
      const QRSession = mongoose.model("QRSession");
      const activeSession = await QRSession.findOne({
        tableId: new Types.ObjectId(input.tableId),
        status: { $in: ["ACTIVE", "ORDERING", "DINING", "PAYMENT_PENDING", "OPEN", "ORDERED", "PAID"] },
        isDeleted: false
      });
      if (activeSession) {
        for (const seat of activeSession.seats) {
          occupiedSeats.add(seat.seatNumber);
        }
      }

      // Check if selected seats overlap
      for (const seat of seatNumbers) {
        if (occupiedSeats.has(seat)) {
          throw new Error(`Seat "${seat}" is already reserved/occupied in this time window`);
        }
      }

      tableNumber = table.tableNumber;
    }

    const reservation = await Reservation.create({
      tenantId,
      outletId: input.outletId,
      guestName: input.guestName,
      partySize: input.partySize,
      scheduledAt: input.scheduledAt,
      status: "PENDING",
      ...(input.guestPhone && { guestPhone: input.guestPhone }),
      ...(input.guestEmail && { guestEmail: input.guestEmail }),
      ...(input.tableId && { tableId: new Types.ObjectId(input.tableId) }),
      ...(input.diningAreaId && { diningAreaId: new Types.ObjectId(input.diningAreaId) }),
      ...(input.customerId && { customerId: new Types.ObjectId(input.customerId) }),
      ...(input.specialRequests && { specialRequests: input.specialRequests }),
      ...(input.notes && { notes: input.notes }),
      seatNumber,
      seatNumbers,
      ...(input.createdBy && { createdBy: input.createdBy })
    });

    return {
      reservationId: reservation._id.toString(),
      guestName: reservation.guestName,
      partySize: reservation.partySize,
      scheduledAt: reservation.scheduledAt,
      status: "PENDING",
      tableId: input.tableId ?? null,
      tableNumber
    };
  }

  /**
   * Confirm a reservation (PENDING → CONFIRMED).
   */
  static async confirmReservation(
    tenantId: Types.ObjectId,
    reservationId: string,
    updatedBy?: Types.ObjectId
  ): Promise<IReservationResult> {
    const reservation = await Reservation.findOne({
      _id: new Types.ObjectId(reservationId),
      tenantId,
      isDeleted: false
    });
    if (!reservation) throw new Error(`Reservation ${reservationId} not found`);
    if (reservation.status !== "PENDING") {
      throw new Error(`Reservation is ${reservation.status} — only PENDING reservations can be confirmed`);
    }

    reservation.status = "CONFIRMED";
    reservation.confirmedAt = new Date();
    if (updatedBy) reservation.updatedBy = updatedBy;
    await reservation.save();

    await EventBusService.publishReservationConfirmed(
      tenantId,
      reservation.outletId,
      reservation._id,
      { reservationId, tableId: reservation.tableId?.toString() }
    ).catch(err => console.error("Failed to publish reservation confirmed event", err));

    return {
      reservationId: reservation._id.toString(),
      guestName: reservation.guestName,
      partySize: reservation.partySize,
      scheduledAt: reservation.scheduledAt,
      status: "CONFIRMED",
      tableId: reservation.tableId?.toString() ?? null
    };
  }

  /**
   * Seat a reservation — marks guest as SEATED and optionally links the live QRSession.
   */
  static async seatReservation(
    tenantId: Types.ObjectId,
    reservationId: string,
    options: { tableId?: string; sessionId?: string; updatedBy?: Types.ObjectId } = {}
  ): Promise<IReservationResult> {
    const reservation = await Reservation.findOne({
      _id: new Types.ObjectId(reservationId),
      tenantId,
      isDeleted: false
    });
    if (!reservation) throw new Error(`Reservation ${reservationId} not found`);
    if (!["PENDING", "CONFIRMED"].includes(reservation.status)) {
      throw new Error(`Cannot seat a reservation with status ${reservation.status}`);
    }

    reservation.status = "SEATED";
    reservation.seatedAt = new Date();
    
    let activeSessionId = options.sessionId;
    const finalTableId = options.tableId || reservation.tableId?.toString();
    
    if (finalTableId && !activeSessionId) {
      // Create a new QR session for this table
      const session = await QRSessionService.createSession(
        tenantId.toString(),
        reservation.outletId.toString(),
        finalTableId,
        {
          ...(reservation.customerId ? { customerId: reservation.customerId.toString() } : {}),
          ...((() => {
            const sn = reservation.seatNumber || (reservation.seatNumbers && reservation.seatNumbers.length > 0 ? reservation.seatNumbers[0] : undefined);
            return sn ? { seatNumber: sn } : {};
          })()),
          seatNumbers: reservation.seatNumbers && reservation.seatNumbers.length > 0 ? reservation.seatNumbers : (reservation.seatNumber ? [reservation.seatNumber] : []),
          reservationId: reservation._id.toString()
        }
      );
      activeSessionId = session._id.toString();
    }

    if (options.tableId) reservation.tableId = new Types.ObjectId(options.tableId);
    if (activeSessionId) reservation.sessionId = new Types.ObjectId(activeSessionId);
    if (options.updatedBy) reservation.updatedBy = options.updatedBy;
    await reservation.save();

    await EventBusService.publishReservationSeated(
      tenantId,
      reservation.outletId,
      reservation._id,
      { reservationId, tableId: reservation.tableId?.toString(), sessionId: reservation.sessionId?.toString() }
    ).catch(err => console.error("Failed to publish reservation seated event", err));

    return {
      reservationId: reservation._id.toString(),
      guestName: reservation.guestName,
      partySize: reservation.partySize,
      scheduledAt: reservation.scheduledAt,
      status: "SEATED",
      tableId: reservation.tableId?.toString() ?? null
    };
  }

  /**
   * Pre-assign a waiter to a reservation.
   */
  static async assignWaiterToReservation(
    tenantId: Types.ObjectId,
    reservationId: string,
    waiterId: string,
    updatedBy?: Types.ObjectId
  ): Promise<IReservationResult> {
    const reservation = await Reservation.findOne({
      _id: new Types.ObjectId(reservationId),
      tenantId,
      isDeleted: false
    });
    if (!reservation) throw new Error(`Reservation ${reservationId} not found`);

    reservation.assignedWaiterId = new Types.ObjectId(waiterId);
    if (updatedBy) reservation.updatedBy = updatedBy;
    await reservation.save();

    return {
      reservationId: reservation._id.toString(),
      guestName: reservation.guestName,
      partySize: reservation.partySize,
      scheduledAt: reservation.scheduledAt,
      status: reservation.status,
      tableId: reservation.tableId?.toString() ?? null
    };
  }

  /**
   * Mark a reservation as NO_SHOW.
   */
  static async markNoShow(
    tenantId: Types.ObjectId,
    reservationId: string,
    updatedBy?: Types.ObjectId
  ): Promise<IReservationResult> {
    const reservation = await Reservation.findOne({
      _id: new Types.ObjectId(reservationId),
      tenantId,
      isDeleted: false
    });
    if (!reservation) throw new Error(`Reservation ${reservationId} not found`);
    if (!["PENDING", "CONFIRMED"].includes(reservation.status)) {
      throw new Error(`Cannot mark ${reservation.status} reservation as no-show`);
    }

    reservation.status = "NO_SHOW";
    reservation.noShowAt = new Date();
    if (updatedBy) reservation.updatedBy = updatedBy;
    await reservation.save();

    return {
      reservationId: reservation._id.toString(),
      guestName: reservation.guestName,
      partySize: reservation.partySize,
      scheduledAt: reservation.scheduledAt,
      status: "NO_SHOW",
      tableId: reservation.tableId?.toString() ?? null
    };
  }

  /**
   * Cancel a reservation with an optional reason.
   */
  static async cancelReservation(
    tenantId: Types.ObjectId,
    reservationId: string,
    options: { reason?: string; updatedBy?: Types.ObjectId } = {}
  ): Promise<IReservationResult> {
    const reservation = await Reservation.findOne({
      _id: new Types.ObjectId(reservationId),
      tenantId,
      isDeleted: false
    });
    if (!reservation) throw new Error(`Reservation ${reservationId} not found`);
    if (["COMPLETED", "CANCELLED"].includes(reservation.status)) {
      throw new Error(`Reservation is already ${reservation.status}`);
    }

    reservation.status = "CANCELLED";
    reservation.cancelledAt = new Date();
    if (options.reason) reservation.cancellationReason = options.reason;
    if (options.updatedBy) reservation.updatedBy = options.updatedBy;
    await reservation.save();

    await EventBusService.publishReservationCancelled(
      tenantId,
      reservation.outletId,
      reservation._id,
      { reservationId, tableId: reservation.tableId?.toString(), reason: options.reason }
    ).catch(err => console.error("Failed to publish reservation cancelled event", err));

    return {
      reservationId: reservation._id.toString(),
      guestName: reservation.guestName,
      partySize: reservation.partySize,
      scheduledAt: reservation.scheduledAt,
      status: "CANCELLED",
      tableId: reservation.tableId?.toString() ?? null
    };
  }

  /**
   * Get reservations for an outlet — optionally filter by date and status.
   */
  static async getReservations(
    tenantId: Types.ObjectId,
    outletId: Types.ObjectId,
    filters: {
      date?: Date;
      status?: ReservationStatus;
      tableId?: string;
    } = {}
  ): Promise<any[]> {
    const query: Record<string, any> = { tenantId, outletId, isDeleted: false };

    if (filters.status) query.status = filters.status;
    if (filters.tableId) query.tableId = new Types.ObjectId(filters.tableId);
    if (filters.date) {
      const dayStart = new Date(filters.date);
      dayStart.setUTCHours(0, 0, 0, 0);
      const dayEnd = new Date(filters.date);
      dayEnd.setUTCHours(23, 59, 59, 999);
      query.scheduledAt = { $gte: dayStart, $lte: dayEnd };
    }

    return Reservation.find(query)
      .sort({ scheduledAt: 1 })
      .populate("tableId", "tableNumber seatCount")
      .lean();
  }
}
