import { Types } from "mongoose";
import Reservation, { ReservationStatus } from "../../models/reservation.model.js";
import Table from "../../models/table.model.js";

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
    // If a table is specified, validate it exists and is not already reserved at the slot
    let tableNumber: string | null = null;
    if (input.tableId) {
      const table = await Table.findOne({
        _id: new Types.ObjectId(input.tableId),
        tenantId,
        isDeleted: false
      });
      if (!table) throw new Error(`Table ${input.tableId} not found`);

      // Check for time-overlapping confirmed reservations (within ±2 hour window)
      const windowStart = new Date(input.scheduledAt.getTime() - 2 * 60 * 60 * 1000);
      const windowEnd = new Date(input.scheduledAt.getTime() + 2 * 60 * 60 * 1000);
      const conflict = await Reservation.findOne({
        tableId: new Types.ObjectId(input.tableId),
        tenantId,
        status: { $in: ["PENDING", "CONFIRMED"] },
        scheduledAt: { $gte: windowStart, $lte: windowEnd },
        isDeleted: false
      });
      if (conflict) {
        throw new Error(`Table is already reserved around that time slot`);
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
      ...(input.seatNumber && { seatNumber: input.seatNumber }),
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
    if (options.tableId) reservation.tableId = new Types.ObjectId(options.tableId);
    if (options.sessionId) reservation.sessionId = new Types.ObjectId(options.sessionId);
    if (options.updatedBy) reservation.updatedBy = options.updatedBy;
    await reservation.save();

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
