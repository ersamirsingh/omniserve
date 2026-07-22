import { Types } from "mongoose";
import Shift, { IShift, ShiftName } from "../../models/shift.model.js";
import Order from "../../models/order.model.js";
import BillSession from "../../models/billsession.model.js";
import QRSession from "../../models/qrsession.model.js";
import { OrderStatus } from "../../models/enums.js";

export interface IOpenShiftResult {
  shiftId: string;
  shiftName: ShiftName;
  status: "OPEN";
  openedAt: Date;
  openedBy: string;
}

export interface ICloseShiftResult {
  shiftId: string;
  shiftName: ShiftName;
  status: "CLOSED";
  openedAt: Date;
  closedAt: Date;
  durationMs: number;
  statistics: {
    totalRevenue: number;
    ordersProcessedCount: number;
    turnoverCount: number;
    avgDiningDurationMs: number;
    slaComplianceRate: number;
  };
}

export class ShiftService {

  static async openShift(
    tenantId: Types.ObjectId,
    outletId: Types.ObjectId,
    shiftName: ShiftName,
    openedBy: Types.ObjectId
  ): Promise<IOpenShiftResult> {

    const existing = await Shift.findOne({
      tenantId,
      outletId,
      shiftName,
      status: "OPEN",
      isDeleted: false
    });
    if (existing) {
      throw new Error(`A ${shiftName} shift is already open for this outlet`);
    }

    const openedAt = new Date();
    const shift = await Shift.create({
      tenantId,
      outletId,
      shiftName,
      status: "OPEN",
      openedBy,
      openedAt,
      statistics: {
        totalRevenue: 0,
        ordersProcessedCount: 0,
        turnoverCount: 0,
        avgDiningDurationMs: 0,
        slaComplianceRate: 100
      }
    });

    return {
      shiftId: shift._id.toString(),
      shiftName,
      status: "OPEN",
      openedAt,
      openedBy: openedBy.toString()
    };
  }

  static async closeShift(
    tenantId: Types.ObjectId,
    outletId: Types.ObjectId,
    shiftId: string,
    closedBy: Types.ObjectId,
    handoverNotes?: string
  ): Promise<ICloseShiftResult> {
    const shift = await Shift.findOne({
      _id: new Types.ObjectId(shiftId),
      tenantId,
      outletId,
      status: "OPEN",
      isDeleted: false
    });
    if (!shift) throw new Error(`Open shift ${shiftId} not found`);

    const closedAt = new Date();
    const shiftWindowFrom = shift.openedAt;

    const [ordersAgg] = await Order.aggregate([
      {
        $match: {
          tenantId,
          outletId,
          isDeleted: false,
          orderStatus: { $ne: OrderStatus.CANCELLED },
          createdAt: { $gte: shiftWindowFrom, $lte: closedAt }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" },
          ordersCount: { $sum: 1 }
        }
      }
    ]);

    const sessionsClosedCount = await QRSession.countDocuments({
      tenantId,
      outletId,
      status: { $in: ["CLOSED", "PAID"] },
      updatedAt: { $gte: shiftWindowFrom, $lte: closedAt },
      isDeleted: false
    });

    const [durationAgg] = await QRSession.aggregate([
      {
        $match: {
          tenantId,
          outletId,
          status: { $in: ["CLOSED", "PAID"] },
          updatedAt: { $gte: shiftWindowFrom, $lte: closedAt },
          isDeleted: false
        }
      },
      {
        $project: {
          durationMs: { $subtract: ["$updatedAt", "$createdAt"] }
        }
      },
      {
        $group: {
          _id: null,
          avgMs: { $avg: "$durationMs" }
        }
      }
    ]);

    const totalRevenue = ordersAgg?.totalRevenue ?? 0;
    const ordersProcessedCount = ordersAgg?.ordersCount ?? 0;
    const turnoverCount = sessionsClosedCount;
    const avgDiningDurationMs = Math.round(durationAgg?.avgMs ?? 0);

    const slaComplianceRate = 100;

    const statistics = {
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      ordersProcessedCount,
      turnoverCount,
      avgDiningDurationMs,
      slaComplianceRate
    };

    shift.status = "CLOSED";
    shift.closedBy = closedBy;
    shift.closedAt = closedAt;
    if (handoverNotes) shift.handoverNotes = handoverNotes;
    shift.statistics = statistics;
    await shift.save();

    return {
      shiftId: shift._id.toString(),
      shiftName: shift.shiftName,
      status: "CLOSED",
      openedAt: shift.openedAt,
      closedAt,
      durationMs: closedAt.getTime() - shift.openedAt.getTime(),
      statistics
    };
  }

  static async getCurrentShift(
    tenantId: Types.ObjectId,
    outletId: Types.ObjectId
  ): Promise<IShift | null> {
    return Shift.findOne({ tenantId, outletId, status: "OPEN", isDeleted: false }).lean() as any;
  }

  static async getShiftHistory(
    tenantId: Types.ObjectId,
    outletId: Types.ObjectId,
    limit = 20
  ): Promise<IShift[]> {
    return Shift.find({ tenantId, outletId, isDeleted: false })
      .sort({ openedAt: -1 })
      .limit(limit)
      .lean() as any;
  }
}
