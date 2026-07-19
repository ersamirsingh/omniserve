import mongoose, { Types } from "mongoose";
import Reservation, { ReservationStatus } from "../../models/reservation.model.js";
import Table from "../../models/table.model.js";
import { EventBusService } from "../../events/eventBus.js";
import { QRSessionService } from "./qrsession.service.js";
import Outlet from "../../models/outlet.model.js";
import TableLock from "../../models/tableLock.model.js";

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
  allowMerge?: boolean;
  ipAddress?: string;
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

      // Check operationalStatus availability (only for reservations scheduled within the next 2 hours)
      const now = new Date();
      const diffMs = Math.abs(input.scheduledAt.getTime() - now.getTime());
      const isWithinTwoHours = diffMs <= 2 * 60 * 60 * 1000;

      if (isWithinTwoHours && ["OCCUPIED", "RESERVED", "BILL_REQUESTED", "PAYMENT_PENDING", "CLEANING", "HELD"].includes(table.operationalStatus)) {
        if (table.operationalStatus === "HELD") {
          const activeLock = await TableLock.findOne({ tableId: table._id, expiresAt: { $gt: new Date() } });
          if (activeLock && activeLock.ipAddress !== input.ipAddress) {
            throw new Error(`Table ${table.tableNumber} is currently held and cannot be reserved`);
          }
        } else {
          const statusStr = table.operationalStatus.toLowerCase().replace('_', ' ');
          throw new Error(`Table ${table.tableNumber} is currently ${statusStr} and cannot be reserved`);
        }
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

    // Check for duplicate active booking
    if (input.guestPhone) {
      const activeBooking = await ReservationService.checkActiveBooking(tenantId, input.guestPhone);
      if (activeBooking && activeBooking.hasActive) {
        if (input.allowMerge && activeBooking.bookingId) {
          // Perform the merge!
          if (activeBooking.type === "RESERVATION") {
            const existingRes = await Reservation.findById(activeBooking.bookingId);
            if (existingRes) {
              existingRes.partySize += Number(input.partySize);
              if (seatNumbers && seatNumbers.length > 0) {
                if (!existingRes.seatNumbers) existingRes.seatNumbers = [];
                seatNumbers.forEach(s => {
                  if (!existingRes.seatNumbers!.includes(s)) {
                    existingRes.seatNumbers!.push(s);
                  }
                });
                if (existingRes.seatNumbers!.length > 0) {
                  existingRes.seatNumber = existingRes.seatNumbers![0] ?? null;
                }
              }
              await existingRes.save();

              // Update the table status to RESERVED
              if (existingRes.tableId) {
                const TableServiceMod = await import("../outlet/table.service.js").then(m => m.TableService);
                await TableServiceMod.updateTableOperationalStatus(
                  tenantId,
                  existingRes.outletId,
                  existingRes.tableId,
                  "RESERVED",
                  { correlationId: existingRes._id.toString() }
                );
              }
              
              // Return merged result
              return {
                reservationId: existingRes._id.toString(),
                guestName: existingRes.guestName,
                partySize: existingRes.partySize,
                scheduledAt: existingRes.scheduledAt,
                status: existingRes.status,
                tableId: existingRes.tableId?.toString() ?? null,
                tableNumber
              };
            }
          } else if (activeBooking.type === "SESSION") {
            const QRSession = mongoose.model("QRSession");
            const activeSession = await QRSession.findById(activeBooking.bookingId);
            if (activeSession) {
              // Merge into the QR session by adding seat(s)
              if (seatNumbers && seatNumbers.length > 0) {
                seatNumbers.forEach(seatNum => {
                  if (!activeSession.seats.some((s: any) => s.seatNumber === seatNum)) {
                    activeSession.seats.push({
                      seatNumber: seatNum,
                      joinedAt: new Date()
                    });
                  }
                });
                await activeSession.save();
              }
              // Return the session's active table
              return {
                reservationId: activeSession._id.toString(),
                guestName: input.guestName,
                partySize: Number(input.partySize),
                scheduledAt: new Date(),
                status: "SEATED",
                tableId: activeSession.tableId.toString(),
                tableNumber
              };
            }
          }
        } else {
          // Block creation and return details
          throw new Error(`ACTIVE_BOOKING_EXISTS:${JSON.stringify({
            type: activeBooking.type,
            bookingId: activeBooking.bookingId,
            details: activeBooking.details
          })}`);
        }
      }
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
      ...(input.seatNumbers && { seatNumbers: input.seatNumbers }),
      ...(seatNumber && { seatNumber: seatNumber })
    });

    if (reservation.tableId) {
      // Delete any TableLock for this table
      await TableLock.deleteOne({ tableId: reservation.tableId });
      
      const TableServiceMod = await import("../outlet/table.service.js").then(m => m.TableService);
      const table = await mongoose.model("Table").findById(reservation.tableId);
      if (table && table.operationalStatus === "HELD") {
        await TableServiceMod.updateTableOperationalStatus(
          tenantId,
          reservation.outletId,
          reservation.tableId,
          "AVAILABLE",
          { correlationId: reservation._id.toString() }
        );
      }
    }

    return {
      reservationId: reservation._id.toString(),
      guestName: reservation.guestName,
      partySize: reservation.partySize,
      scheduledAt: reservation.scheduledAt,
      status: "PENDING",
      tableId: reservation.tableId?.toString() ?? null,
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

    if (reservation.tableId) {
      const TableServiceMod = await import("../outlet/table.service.js").then(m => m.TableService);
      await TableServiceMod.updateTableOperationalStatus(
        tenantId,
        reservation.outletId,
        reservation.tableId,
        "RESERVED",
        { correlationId: reservation._id.toString() }
      );
      // Delete any TableLock for this table
      await TableLock.deleteOne({ tableId: reservation.tableId });
    }

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

    if (finalTableId) {
      const TableServiceMod = await import("../outlet/table.service.js").then(m => m.TableService);
      await TableServiceMod.updateTableOperationalStatus(
        tenantId,
        reservation.outletId,
        finalTableId,
        "OCCUPIED",
        { correlationId: reservation._id.toString() }
      );
    }

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

    if (reservation.tableId) {
      const TableServiceMod = await import("../outlet/table.service.js").then(m => m.TableService);
      await TableServiceMod.updateTableOperationalStatus(
        tenantId,
        reservation.outletId,
        reservation.tableId,
        "AVAILABLE",
        { correlationId: reservation._id.toString() }
      );
    }

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

    if (reservation.tableId) {
      const TableServiceMod = await import("../outlet/table.service.js").then(m => m.TableService);
      await TableServiceMod.updateTableOperationalStatus(
        tenantId,
        reservation.outletId,
        reservation.tableId,
        "AVAILABLE",
        { correlationId: reservation._id.toString() }
      );
    }

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

  /**
   * Check if a guest has any active bookings (incomplete reservations, active QR sessions, or active orders)
   */
  static async checkActiveBooking(
    tenantId: Types.ObjectId,
    phone: string
  ): Promise<{ hasActive: boolean; type?: "RESERVATION" | "ORDER" | "SESSION"; bookingId?: string; details?: string } | null> {
    if (!phone) return { hasActive: false };
    const formattedPhone = phone.trim();

    // 1. Check for active/incomplete reservation under guestPhone
    const activeRes = await Reservation.findOne({
      tenantId,
      guestPhone: formattedPhone,
      status: { $in: ["PENDING", "CONFIRMED", "SEATED", "HOLD"] },
      isDeleted: false
    }).populate("tableId").lean();

    if (activeRes) {
      const tableNum = (activeRes.tableId as any)?.tableNumber || "N/A";
      return {
        hasActive: true,
        type: "RESERVATION",
        bookingId: activeRes._id.toString(),
        details: `Active reservation at Table ${tableNum} scheduled for ${new Date(activeRes.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      };
    }

    // 2. Check if a Customer account exists with this phone number
    const customer = await mongoose.model("Customer").findOne({
      tenantId,
      phone: formattedPhone,
      isDeleted: false
    }).lean();

    if (customer) {
      // 2a. Check for active sessions for this customer
      const activeSession = await mongoose.model("QRSession").findOne({
        tenantId,
        status: { $in: ["ACTIVE", "ORDERING", "DINING", "PAYMENT_PENDING", "OPEN", "ORDERED", "PAID"] },
        $or: [
          { customerId: (customer as any)._id },
          { "seats.customerId": (customer as any)._id }
        ],
        isDeleted: false
      }).populate("tableId").lean() as any;

      if (activeSession) {
        const tableNum = (activeSession.tableId as any)?.tableNumber || "N/A";
        return {
          hasActive: true,
          type: "SESSION",
          bookingId: activeSession._id.toString(),
          details: `Active dining session at Table ${tableNum}`
        };
      }

      // 2b. Check for active/incomplete orders for this customer
      const activeOrder = await mongoose.model("Order").findOne({
        tenantId,
        customerId: (customer as any)._id,
        orderStatus: { $in: ["PLACED", "ACCEPTED", "PREPARING", "READY", "PICKED_UP", "DELIVERED", "PARTIALLY_PAID"] },
        isDeleted: false
      }).lean() as any;

      if (activeOrder) {
        return {
          hasActive: true,
          type: "ORDER",
          bookingId: activeOrder._id.toString(),
          details: `Active order #${activeOrder.orderNumber} (Status: ${activeOrder.orderStatus})`
        };
      }
    }

    return { hasActive: false };
  }
}
