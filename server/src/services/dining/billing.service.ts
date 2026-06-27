import { Types } from "mongoose";
import BillSession, { IBillSplitDetail } from "../../models/billsession.model.js";
import Order from "../../models/order.model.js";
import OrderItem from "../../models/orderitems.model.js";
import QRSession from "../../models/qrsession.model.js";
import Table from "../../models/table.model.js";
import OrderTimeline from "../../models/ordertimeline.model.js";
import { EventBusService } from "../event-bus.service.js";

export type SplitType = "NONE" | "EQUAL" | "BY_SEAT" | "BY_ITEM" | "CUSTOM";

export interface IRequestBillResult {
  billSessionId: string;
  sessionId: string;
  tableId: string;
  totalAmount: number;
  subtotal: number;
  tax: number;
  outstandingBalance: number;
  status: string;
  requestedAt: Date;
}

export interface ISplitBillResult {
  billSessionId: string;
  splitType: SplitType;
  splits: Array<{
    seatNumber?: string;
    customerId?: string | null;
    amount: number;
    isPaid: boolean;
  }>;
  totalAmount: number;
}

export interface ISettleBillResult {
  billSessionId: string;
  totalSettled: number;
  outstandingBalance: number;
  status: string;
  settledAt: Date;
}

export class BillingService {
  /**
   * Create or fetch a BillSession for a QRSession, compute totals from all linked orders.
   * Transitions QRSession to PAYMENT_PENDING and Table to BILL_REQUESTED.
   */
  static async requestBill(
    tenantId: Types.ObjectId,
    outletId: Types.ObjectId,
    sessionId: string,
    options: {
      discount?: number;
      tip?: number;
      notes?: string;
      requestedBy?: Types.ObjectId;
    } = {}
  ): Promise<IRequestBillResult> {
    const session = await QRSession.findOne({
      _id: new Types.ObjectId(sessionId),
      tenantId,
      isDeleted: false
    });
    if (!session) throw new Error(`QR Session ${sessionId} not found`);

    // Fetch all active orders for this session
    const orders = await Order.find({
      "diningContext.sessionId": session._id,
      tenantId,
      isDeleted: false
    }).lean();

    if (orders.length === 0) {
      throw new Error("No orders found for this session to generate a bill");
    }

    const orderIds = orders.map(o => o._id as Types.ObjectId);

    // Compute totals from order items
    const items = await OrderItem.find({
      orderId: { $in: orderIds },
      tenantId,
      isDeleted: false
    }).lean();

    const subtotal = items.reduce((sum, i) => sum + i.totalPrice, 0);
    const tax = orders.reduce((sum, o) => sum + (o.tax || 0), 0);
    const discount = options.discount ?? 0;
    const tip = options.tip ?? 0;
    const totalAmount = subtotal + tax - discount + tip;
    const outstandingBalance = totalAmount;

    // Upsert BillSession
    let billSession = await BillSession.findOne({
      sessionId: session._id,
      tenantId,
      isDeleted: false
    });

    const requestedAt = new Date();

    if (!billSession) {
      billSession = await BillSession.create({
        tenantId,
        outletId,
        tableId: session.tableId,
        sessionId: session._id,
        orderIds,
        subtotal,
        tax,
        discount,
        tip,
        totalAmount,
        outstandingBalance,
        status: "REQUESTED",
        splitType: "NONE",
        splits: [],
        requestedAt,
        ...(options.notes && { notes: options.notes })
      });
    } else {
      billSession.orderIds = orderIds;
      billSession.subtotal = subtotal;
      billSession.tax = tax;
      billSession.discount = discount;
      billSession.tip = tip;
      billSession.totalAmount = totalAmount;
      billSession.outstandingBalance = outstandingBalance;
      billSession.status = "REQUESTED";
      billSession.requestedAt = requestedAt;
      if (options.notes) billSession.notes = options.notes;
      await billSession.save();
    }

    // Update Table to BILL_REQUESTED
    await Table.findByIdAndUpdate(session.tableId, {
      operationalStatus: "BILL_REQUESTED"
    });

    // Update QRSession to PAYMENT_PENDING
    await QRSession.findByIdAndUpdate(session._id, {
      status: "PAYMENT_PENDING"
    });

    // Write timeline entry
    await OrderTimeline.create({
      tenantId,
      qrsessionId: session._id,
      status: "BILL_REQUESTED",
      sourceSystem: "SYSTEM",
      notes: `Bill requested. Total: ${totalAmount.toFixed(2)}`,
      audit: {
        ...(options.requestedBy && { triggeredById: options.requestedBy }),
        triggeredByType: "WAITER",
        correlationId: new Types.ObjectId().toString()
      }
    });

    // Publish event
    await EventBusService.publishBillRequested(
      tenantId,
      outletId,
      billSession._id,
      {
        billSessionId: billSession._id.toString(),
        sessionId: session._id.toString(),
        tableId: session.tableId.toString(),
        totalAmount,
        subtotal,
        tax,
        discount,
        tip,
        outstandingBalance,
        requestedAt
      },
      { createdBy: options.requestedBy, sourceSystem: "SYSTEM" }
    );

    return {
      billSessionId: billSession._id.toString(),
      sessionId: session._id.toString(),
      tableId: session.tableId.toString(),
      totalAmount,
      subtotal,
      tax,
      outstandingBalance,
      status: "REQUESTED",
      requestedAt
    };
  }

  /**
   * Split the bill by a given strategy: EQUAL (per guest), BY_SEAT, or CUSTOM.
   */
  static async splitBill(
    tenantId: Types.ObjectId,
    outletId: Types.ObjectId,
    billSessionId: string,
    splitType: SplitType,
    customSplits?: Array<{ seatNumber?: string; customerId?: string; amount: number }>
  ): Promise<ISplitBillResult> {
    const billSession = await BillSession.findOne({
      _id: new Types.ObjectId(billSessionId),
      tenantId,
      isDeleted: false
    });
    if (!billSession) throw new Error(`Bill session ${billSessionId} not found`);
    if (billSession.status === "SETTLED") throw new Error("Bill is already settled");

    const session = await QRSession.findById(billSession.sessionId);
    if (!session) throw new Error("Associated QR session not found");

    let splits: IBillSplitDetail[] = [];

    if (splitType === "EQUAL") {
      const seatCount = session.seats.length || 1;
      const perSeat = parseFloat((billSession.totalAmount / seatCount).toFixed(2));
      // Adjust last split for rounding
      const splitList = session.seats.map((seat, idx) => ({
        seatNumber: seat.seatNumber,
        customerId: seat.customerId ?? null,
        amount: idx === session.seats.length - 1
          ? parseFloat((billSession.totalAmount - perSeat * (seatCount - 1)).toFixed(2))
          : perSeat,
        isPaid: false
      }));
      splits = splitList;
    } else if (splitType === "BY_SEAT") {
      // Group order items by seatNumber
      const orders = await Order.find({
        "diningContext.sessionId": billSession.sessionId,
        tenantId,
        isDeleted: false
      }).lean();
      const orderIds = orders.map(o => o._id as Types.ObjectId);
      const items = await OrderItem.find({ orderId: { $in: orderIds }, tenantId, isDeleted: false }).lean();

      const seatTotals = new Map<string, number>();
      for (const order of orders) {
        const seatNum = order.diningContext?.seatNumber ?? "SHARED";
        const orderItems = items.filter(i => i.orderId.toString() === order._id.toString());
        const orderTotal = orderItems.reduce((sum, i) => sum + i.totalPrice, 0);
        seatTotals.set(seatNum, (seatTotals.get(seatNum) ?? 0) + orderTotal);
      }

      splits = Array.from(seatTotals.entries()).map(([seatNumber, amount]) => ({
        seatNumber,
        customerId: session.seats.find(s => s.seatNumber === seatNumber)?.customerId ?? null,
        amount: parseFloat(amount.toFixed(2)),
        isPaid: false
      }));
    } else if (splitType === "CUSTOM" && customSplits) {
      splits = customSplits.map(s => ({
        ...(s.seatNumber && { seatNumber: s.seatNumber }),
        customerId: s.customerId ? new Types.ObjectId(s.customerId) : null,
        amount: s.amount,
        isPaid: false
      }));
    } else {
      throw new Error(`Invalid splitType "${splitType}" or missing customSplits`);
    }

    billSession.splitType = splitType;
    billSession.splits = splits as any;
    await billSession.save();

    await EventBusService.publishBillSplitCreated(
      tenantId,
      outletId,
      billSession._id,
      {
        billSessionId: billSession._id.toString(),
        sessionId: billSession.sessionId.toString(),
        splitType,
        splits: splits.map(s => ({
          seatNumber: s.seatNumber,
          customerId: s.customerId?.toString() ?? null,
          amount: s.amount,
          isPaid: s.isPaid
        })),
        totalAmount: billSession.totalAmount
      },
      { createdBy: undefined, sourceSystem: "SYSTEM" }
    );

    return {
      billSessionId: billSession._id.toString(),
      splitType,
      splits: splits.map(s => ({
        ...(s.seatNumber !== undefined && { seatNumber: s.seatNumber }),
        customerId: s.customerId?.toString() ?? null,
        amount: s.amount,
        isPaid: s.isPaid
      })),
      totalAmount: billSession.totalAmount
    };
  }

  /**
   * Mark the bill (or a split portion) as paid.
   * When all splits are paid (or no splits), mark billSession as SETTLED.
   */
  static async settleBill(
    tenantId: Types.ObjectId,
    outletId: Types.ObjectId,
    billSessionId: string,
    options: {
      seatNumber?: string;  // if settling a specific seat
      paymentId?: string;
      settledBy?: Types.ObjectId;
    } = {}
  ): Promise<ISettleBillResult> {
    const billSession = await BillSession.findOne({
      _id: new Types.ObjectId(billSessionId),
      tenantId,
      isDeleted: false
    });
    if (!billSession) throw new Error(`Bill session ${billSessionId} not found`);
    if (billSession.status === "SETTLED") throw new Error("Bill is already settled");

    const settledAt = new Date();

    if (options.seatNumber && billSession.splits.length > 0) {
      // Settle a specific seat's portion
      const split = billSession.splits.find(s => s.seatNumber === options.seatNumber);
      if (!split) throw new Error(`No split found for seat ${options.seatNumber}`);
      split.isPaid = true;
      if (options.paymentId) split.paymentId = new Types.ObjectId(options.paymentId);

      const paidTotal = billSession.splits.reduce((sum, s) => sum + (s.isPaid ? s.amount : 0), 0);
      billSession.outstandingBalance = parseFloat(Math.max(0, billSession.totalAmount - paidTotal).toFixed(2));

      const allPaid = billSession.splits.every(s => s.isPaid);
      billSession.status = allPaid ? "SETTLED" : "PARTIAL_PAYMENT";
      if (allPaid) billSession.settledAt = settledAt;
    } else {
      // Full settlement
      billSession.outstandingBalance = 0;
      billSession.status = "SETTLED";
      billSession.settledAt = settledAt;
      billSession.splits.forEach(s => { s.isPaid = true; });
    }

    await billSession.save();

    // If fully settled, update table to CLEANING, session to CLOSED
    if (billSession.status === "SETTLED") {
      await QRSession.findByIdAndUpdate(billSession.sessionId, { status: "PAID" });
      await Table.findByIdAndUpdate(billSession.tableId, {
        operationalStatus: "CLEANING",
        lastSessionId: billSession.sessionId,
        $unset: { activeSessionId: "" }
      });

      await OrderTimeline.create({
        tenantId,
        qrsessionId: billSession.sessionId,
        status: "BILL_SETTLED",
        sourceSystem: "SYSTEM",
        notes: `Bill fully settled. Total: ${billSession.totalAmount.toFixed(2)}`,
        audit: {
          ...(options.settledBy && { triggeredById: options.settledBy }),
          triggeredByType: "WAITER",
          correlationId: new Types.ObjectId().toString()
        }
      });
    }

    await EventBusService.publishBillSettled(
      tenantId,
      outletId,
      billSession._id,
      {
        billSessionId: billSession._id.toString(),
        sessionId: billSession.sessionId.toString(),
        tableId: billSession.tableId.toString(),
        totalAmount: billSession.totalAmount,
        outstandingBalance: billSession.outstandingBalance,
        status: billSession.status,
        settledAt: billSession.status === "SETTLED" ? settledAt : undefined
      },
      { createdBy: options.settledBy, sourceSystem: "SYSTEM" }
    );

    return {
      billSessionId: billSession._id.toString(),
      totalSettled: billSession.totalAmount - billSession.outstandingBalance,
      outstandingBalance: billSession.outstandingBalance,
      status: billSession.status,
      settledAt
    };
  }

  /**
   * Fetch the full bill for a QR session including splits and order breakdown.
   */
  static async getSessionBill(
    tenantId: Types.ObjectId,
    sessionId: string
  ): Promise<{
    billSession: any;
    orders: any[];
    items: any[];
  }> {
    let billSession = await BillSession.findOne({
      sessionId: new Types.ObjectId(sessionId),
      tenantId,
      isDeleted: false
    }).lean();

    if (!billSession) {
      // Lazily create BillSession
      const session = await QRSession.findOne({
        _id: new Types.ObjectId(sessionId),
        tenantId,
        isDeleted: false
      });
      if (!session) {
        throw new Error(`QR Session ${sessionId} not found`);
      }

      // Fetch all active orders for this session
      const orders = await Order.find({
        "diningContext.sessionId": session._id,
        tenantId,
        isDeleted: false
      }).lean();

      const orderIds = orders.map(o => o._id as Types.ObjectId);

      // Compute totals from order items
      const items = await OrderItem.find({
        orderId: { $in: orderIds },
        tenantId,
        isDeleted: false
      }).lean();

      const subtotal = items.reduce((sum, i) => sum + i.totalPrice, 0);
      const tax = orders.reduce((sum, o) => sum + (o.tax || 0), 0);
      const totalAmount = subtotal + tax;

      const newDoc = await BillSession.create({
        tenantId,
        outletId: session.outletId,
        tableId: session.tableId,
        sessionId: session._id,
        orderIds,
        subtotal,
        tax,
        discount: 0,
        tip: 0,
        totalAmount,
        outstandingBalance: totalAmount,
        status: "OPEN",
        splitType: "NONE",
        splits: [],
        requestedAt: new Date()
      });

      billSession = newDoc.toObject() as any;
    }

    const orders = await Order.find({
      "diningContext.sessionId": new Types.ObjectId(sessionId),
      tenantId,
      isDeleted: false
    }).lean();

    const orderIds = orders.map(o => o._id as Types.ObjectId);
    const items = await OrderItem.find({
      orderId: { $in: orderIds },
      tenantId,
      isDeleted: false
    }).lean();

    return { billSession, orders, items };
  }
}
