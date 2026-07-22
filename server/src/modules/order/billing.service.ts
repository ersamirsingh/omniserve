import { Types } from "mongoose";
import BillSession, { IBillSplitDetail } from "../../models/billsession.model.js";
import Order from "../../models/order.model.js";
import OrderItem from "../../models/orderItem.model.js";
import QRSession from "../../models/qrsession.model.js";
import Table from "../../models/table.model.js";
import OrderTimeline from "../../models/ordertimeline.model.js";
import Payment from "../../models/payment.model.js";
import { PaymentMethod, PaymentStatus } from "../../models/enums.js";
import { EventBusService } from "../../events/eventBus.js";
import { RealtimeService } from "../../sockets/realtime.service.js";

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

    const orders = await Order.find({
      "diningContext.sessionId": session._id,
      tenantId,
      isDeleted: false
    }).lean();

    if (orders.length === 0) {
      throw new Error("No orders found for this session to generate a bill");
    }

    const orderIds = orders.map(o => o._id as Types.ObjectId);

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

    await Table.findByIdAndUpdate(session.tableId, {
      operationalStatus: "BILL_REQUESTED"
    });

    await QRSession.findByIdAndUpdate(session._id, {
      status: "PAYMENT_PENDING"
    });

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

  static async splitBill(
    tenantId: Types.ObjectId,
    outletId: Types.ObjectId,
    billSessionId: string,
    splitType: SplitType,
    customSplits?: Array<{ seatNumber?: string; customerId?: string; amount: number }>
  ): Promise<ISplitBillResult> {
    const billSession = await BillSession.findOneAndUpdate(
      {
        _id: new Types.ObjectId(billSessionId),
        tenantId,
        status: { $ne: "SETTLED" },
        isDeleted: false
      },
      { $set: { updatedAt: new Date() } },
      { new: true }
    );
    if (!billSession) {
      const existing = await BillSession.findOne({ _id: new Types.ObjectId(billSessionId), tenantId });
      if (!existing) throw new Error(`Bill session ${billSessionId} not found`);
      throw new Error("Bill is already settled");
    }

    const session = await QRSession.findById(billSession.sessionId);
    if (!session) throw new Error("Associated QR session not found");

    let splits: IBillSplitDetail[] = [];

    if (splitType === "NONE") {
      splits = [];
    } else if (splitType === "EQUAL") {
      const seatCount = session.seats.length || 1;
      const perSeat = parseFloat((billSession.totalAmount / seatCount).toFixed(2));

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

        const orderItems = items.filter(i => i.orderId.toString() === order._id.toString() && i.status !== "CANCELLED");
        const orderTotal = orderItems.reduce((sum, i) => sum + i.totalPrice, 0);
        seatTotals.set(seatNum, (seatTotals.get(seatNum) ?? 0) + orderTotal);
      }

      const totalSubtotal = Array.from(seatTotals.values()).reduce((sum, amt) => sum + amt, 0) || 1;
      const totalTaxAndFees = billSession.totalAmount - totalSubtotal;

      const seatList = Array.from(seatTotals.entries());
      const tempSplits = seatList.map(([seatNumber, subtotalAmt]) => {
        const ratio = subtotalAmt / totalSubtotal;
        const amount = subtotalAmt + ratio * totalTaxAndFees;
        return {
          seatNumber,
          customerId: session.seats.find(s => s.seatNumber === seatNumber)?.customerId ?? null,
          amount: parseFloat(amount.toFixed(2)),
          isPaid: false
        };
      });

      if (tempSplits.length > 0) {
        const sumOfOthers = tempSplits.slice(0, -1).reduce((sum, s) => sum + s.amount, 0);
        const lastSplit = tempSplits[tempSplits.length - 1];
        if (lastSplit) {
          lastSplit.amount = parseFloat((billSession.totalAmount - sumOfOthers).toFixed(2));
        }
      }
      splits = tempSplits;
    } else if (splitType === "CUSTOM" && customSplits) {
      const sum = customSplits.reduce((acc, s) => acc + s.amount, 0);
      if (Math.abs(sum - billSession.totalAmount) > 1.0) {
        throw new Error(`Total split amount (₹${sum.toFixed(2)}) must equal total bill amount (₹${billSession.totalAmount.toFixed(2)})`);
      }
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

  static async settleBill(
    tenantId: Types.ObjectId,
    outletId: Types.ObjectId,
    billSessionId: string,
    options: {
      seatNumber?: string;
      paymentId?: string;
      paymentMethod?: PaymentMethod;
      settledBy?: Types.ObjectId;
    } = {}
  ): Promise<ISettleBillResult> {
    const billSession = await BillSession.findOneAndUpdate(
      {
        _id: new Types.ObjectId(billSessionId),
        tenantId,
        status: { $ne: "SETTLED" },
        isDeleted: false
      },
      { $set: { updatedAt: new Date() } },
      { new: true }
    );
    if (!billSession) {
      const existing = await BillSession.findOne({ _id: new Types.ObjectId(billSessionId), tenantId });
      if (!existing) throw new Error(`Bill session ${billSessionId} not found`);
      throw new Error("Bill is already settled");
    }

    const settledAt = new Date();

    if (options.seatNumber && billSession.splits.length > 0) {

      const split = billSession.splits.find(s => s.seatNumber === options.seatNumber);
      if (!split) throw new Error(`No split found for seat ${options.seatNumber}`);
      split.isPaid = true;

      const txnId = options.paymentId || `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const payment = await Payment.create({
        tenantId,
        orderId: billSession.orderIds[0],
        transactionId: txnId,
        paymentMethod: options.paymentMethod || PaymentMethod.CASH,
        amount: split.amount,
        currency: 'INR',
        status: PaymentStatus.SUCCESS
      });
      split.paymentId = payment._id as Types.ObjectId;

      const paidTotal = billSession.splits.reduce((sum, s) => sum + (s.isPaid ? s.amount : 0), 0);
      billSession.outstandingBalance = parseFloat(Math.max(0, billSession.totalAmount - paidTotal).toFixed(2));

      const allPaid = billSession.splits.every(s => s.isPaid);
      billSession.status = allPaid ? "SETTLED" : "PARTIAL_PAYMENT";
      if (allPaid) billSession.settledAt = settledAt;
    } else {

      billSession.outstandingBalance = 0;
      billSession.status = "SETTLED";
      billSession.settledAt = settledAt;
      billSession.splits.forEach(s => { s.isPaid = true; });

      for (const orderId of billSession.orderIds) {
        const order = await Order.findById(orderId);
        if (order && order.paymentStatus !== PaymentStatus.SUCCESS) {
          const txnId = options.paymentId || `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
          await Payment.create({
            tenantId,
            orderId: order._id,
            transactionId: txnId,
            paymentMethod: options.paymentMethod || PaymentMethod.CASH,
            amount: order.totalAmount,
            currency: 'INR',
            status: PaymentStatus.SUCCESS
          });
          order.paymentStatus = PaymentStatus.SUCCESS;
          await order.save();
        }
      }
    }

    await billSession.save();

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

      const session = await QRSession.findOne({
        _id: new Types.ObjectId(sessionId),
        tenantId,
        isDeleted: false
      });
      if (!session) {
        throw new Error(`QR Session ${sessionId} not found`);
      }

      const orders = await Order.find({
        "diningContext.sessionId": session._id,
        tenantId,
        isDeleted: false
      }).lean();

      const orderIds = orders.map(o => o._id as Types.ObjectId);

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

  static async recalculateBillSession(
    tenantId: Types.ObjectId | string,
    sessionId: Types.ObjectId | string
  ): Promise<any> {
    const tenantObjId = new Types.ObjectId(tenantId);
    const sessionObjId = new Types.ObjectId(sessionId);

    const orders = await Order.find({
      "diningContext.sessionId": sessionObjId,
      tenantId: tenantObjId,
      orderStatus: { $ne: "CANCELLED" as any },
      isDeleted: false
    });

    const orderIds = orders.map(o => o._id);

    const items = await OrderItem.find({
      orderId: { $in: orderIds as any },
      tenantId: tenantObjId,
      status: { $ne: "CANCELLED" as any },
      isDeleted: false
    });

    const subtotal = items.reduce((sum, i) => sum + i.totalPrice, 0);

    const tax = orders.reduce((sum, o) => {
      const activeOrderItems = items.filter(item => item.orderId.toString() === o._id.toString());
      const orderSubtotal = activeOrderItems.reduce((s, item) => s + item.totalPrice, 0);
      const calculatedTax = parseFloat((orderSubtotal * 0.05).toFixed(2));
      return sum + calculatedTax;
    }, 0);

    const billSession = await BillSession.findOne({
      sessionId: sessionObjId,
      tenantId: tenantObjId,
      isDeleted: false
    });

    if (!billSession) return null;

    const tip = billSession.tip || 0;
    const discount = billSession.discount || 0;

    const totalAmount = subtotal + tax + tip - discount + (subtotal > 0 ? 15 : 0);

    billSession.subtotal = parseFloat(subtotal.toFixed(2));
    billSession.tax = parseFloat(tax.toFixed(2));
    billSession.totalAmount = parseFloat(totalAmount.toFixed(2));

    const paidAmount = (billSession.splits || [])
      .filter(s => s.isPaid)
      .reduce((sum, s) => sum + s.amount, 0);
    billSession.outstandingBalance = parseFloat(Math.max(0, totalAmount - paidAmount).toFixed(2));

    if (billSession.splits && billSession.splits.length > 0 && billSession.splitType !== "NONE") {
      const qrsession = await QRSession.findById(sessionObjId);
      if (qrsession) {
        if (billSession.splitType === "EQUAL") {
          const seatCount = qrsession.seats.length || 1;
          const perSeat = parseFloat((billSession.totalAmount / seatCount).toFixed(2));
          billSession.splits = qrsession.seats.map((seat, idx) => ({
            seatNumber: seat.seatNumber,
            customerId: seat.customerId ?? null,
            amount: idx === qrsession.seats.length - 1
              ? parseFloat((billSession.totalAmount - perSeat * (seatCount - 1)).toFixed(2))
              : perSeat,
            isPaid: (billSession.splits.find(s => s.seatNumber === seat.seatNumber)?.isPaid) || false
          })) as any;
        } else if (billSession.splitType === "BY_SEAT") {
          const seatTotals = new Map<string, number>();
          for (const order of orders) {
            const seatNum = order.diningContext?.seatNumber ?? "SHARED";
            const orderItems = items.filter(i => i.orderId.toString() === order._id.toString());
            const orderTotal = orderItems.reduce((sum, i) => sum + i.totalPrice, 0);
            seatTotals.set(seatNum, (seatTotals.get(seatNum) ?? 0) + orderTotal);
          }
          const totalSub = Array.from(seatTotals.values()).reduce((sum, amt) => sum + amt, 0) || 1;
          const totalFees = billSession.totalAmount - totalSub;
          const seatList = Array.from(seatTotals.entries());
          const newSplits = seatList.map(([seatNumber, subAmt]) => {
            const ratio = subAmt / totalSub;
            const amount = subAmt + ratio * totalFees;
            const wasPaid = (billSession.splits.find(s => s.seatNumber === seatNumber)?.isPaid) || false;
            return {
              seatNumber,
              customerId: qrsession.seats.find(s => s.seatNumber === seatNumber)?.customerId ?? null,
              amount: parseFloat(amount.toFixed(2)),
              isPaid: wasPaid
            };
          });
          if (newSplits.length > 0) {
            const sumOfOthers = newSplits.slice(0, -1).reduce((sum, s) => sum + s.amount, 0);
            const lastSplit = newSplits[newSplits.length - 1];
            if (lastSplit) {
              lastSplit.amount = parseFloat((billSession.totalAmount - sumOfOthers).toFixed(2));
            }
          }
          billSession.splits = newSplits as any;
        }
      }
    }

    await billSession.save();

    const socketPayload = {
      billSessionId: billSession._id.toString(),
      sessionId: sessionObjId.toString(),
      totalAmount: billSession.totalAmount,
      subtotal: billSession.subtotal,
      tax: billSession.tax,
      outstandingBalance: billSession.outstandingBalance,
      splits: billSession.splits,
      status: billSession.status
    };

    RealtimeService.sendToSession(sessionObjId.toString(), "BILL_REQUESTED" as any, socketPayload);
    RealtimeService.sendToOutlet(tenantObjId.toString(), billSession.outletId.toString(), "BILL_REQUESTED" as any, socketPayload);

    return billSession;
  }
}
