import { Types } from "mongoose";
import Order from "../../models/order.model.js";
import QRSession from "../../models/qrsession.model.js";
import BillSession from "../../models/billsession.model.js";
import Table from "../../models/table.model.js";
import WaiterTask from "../../models/waitertask.model.js";
import { OrderStatus } from "../../enums/enums.js";

export interface IDiningAnalyticsSummary {
  period: { from: Date; to: Date };
  revenue: {
    total: number;
    fromDineIn: number;
    averagePerTable: number;
    averagePerCover: number;
  };
  covers: {
    total: number;
    perDay: number;
    averagePartySize: number;
  };
  tableTurns: {
    total: number;
    averageTurnTimeMs: number;
    averageTurnTimeMinutes: number;
  };
  kds: {
    averageFireDelayMs: number;
  };
  tasks: {
    total: number;
    escalated: number;
    averageResolutionMs: number;
    slaComplianceRate: number;
  };
  topTables: Array<{
    tableId: string;
    tableNumber: string;
    revenue: number;
    turnCount: number;
  }>;
}

export class DiningAnalyticsService {
  static async getSummary(
    tenantId: Types.ObjectId,
    outletId: Types.ObjectId,
    from: Date,
    to: Date
  ): Promise<IDiningAnalyticsSummary> {
    const tenantOId = new Types.ObjectId(tenantId);
    const outletOId = new Types.ObjectId(outletId);

    // ─── Revenue from dine-in orders ────────────────────────────────────────
    const [revenueAgg] = await Order.aggregate([
      {
        $match: {
          tenantId: tenantOId,
          outletId: outletOId,
          isDeleted: false,
          orderStatus: { $ne: OrderStatus.CANCELLED },
          "diningContext.sessionId": { $exists: true, $ne: null },
          createdAt: { $gte: from, $lte: to }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" },
          orderCount: { $sum: 1 }
        }
      }
    ]);

    const dineInRevenue = revenueAgg?.totalRevenue ?? 0;

    // ─── Table turn statistics from sessions ────────────────────────────────
    const sessionStats = await QRSession.aggregate([
      {
        $match: {
          tenantId: tenantOId,
          outletId: outletOId,
          status: { $in: ["CLOSED", "PAID"] },
          updatedAt: { $gte: from, $lte: to },
          isDeleted: false
        }
      },
      {
        $project: {
          tableId: 1,
          guestCount: 1,
          durationMs: { $subtract: ["$updatedAt", "$createdAt"] }
        }
      },
      {
        $group: {
          _id: null,
          turnCount: { $sum: 1 },
          avgTurnMs: { $avg: "$durationMs" },
          totalCovers: { $sum: "$guestCount" },
          // Collect per-table breakdown
          tableTurns: { $push: { tableId: "$tableId", durationMs: "$durationMs" } }
        }
      }
    ]);

    const turnCount = sessionStats[0]?.turnCount ?? 0;
    const avgTurnMs = Math.round(sessionStats[0]?.avgTurnMs ?? 0);
    const totalCovers = sessionStats[0]?.totalCovers ?? 0;

    // ─── Per-table revenue breakdown ────────────────────────────────────────
    const tableRevenue = await BillSession.aggregate([
      {
        $match: {
          tenantId: tenantOId,
          outletId: outletOId,
          status: "SETTLED",
          settledAt: { $gte: from, $lte: to },
          isDeleted: false
        }
      },
      {
        $group: {
          _id: "$tableId",
          revenue: { $sum: "$totalAmount" },
          turnCount: { $sum: 1 }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 }
    ]);

    // Resolve table numbers for top tables
    const tableIds = tableRevenue.map((r: any) => r._id);
    const tables = await Table.find({ _id: { $in: tableIds }, tenantId: tenantOId }).lean();
    const tableMap = new Map(tables.map(t => [t._id.toString(), t.tableNumber]));

    const topTables = tableRevenue.map((r: any) => ({
      tableId: r._id.toString(),
      tableNumber: tableMap.get(r._id.toString()) ?? "Unknown",
      revenue: parseFloat(r.revenue.toFixed(2)),
      turnCount: r.turnCount
    }));

    // ─── Waiter task SLA stats ───────────────────────────────────────────────
    const [taskStats] = await WaiterTask.aggregate([
      {
        $match: {
          tenantId: tenantOId,
          outletId: outletOId,
          createdAt: { $gte: from, $lte: to }
        }
      },
      {
        $project: {
          isEscalated: { $eq: ["$status", "ESCALATED"] },
          resolvedMs: {
            $cond: [
              { $and: ["$completedAt", "$createdAt"] },
              { $subtract: ["$completedAt", "$createdAt"] },
              null
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          escalated: { $sum: { $cond: ["$isEscalated", 1, 0] } },
          avgResolutionMs: { $avg: "$resolvedMs" }
        }
      }
    ]);

    const totalTasks = taskStats?.total ?? 0;
    const escalatedTasks = taskStats?.escalated ?? 0;
    const avgResolutionMs = Math.round(taskStats?.avgResolutionMs ?? 0);
    const slaComplianceRate = totalTasks > 0
      ? parseFloat(((1 - escalatedTasks / totalTasks) * 100).toFixed(1))
      : 100;

    // ─── Days in period for per-day metrics ─────────────────────────────────
    const daysDiff = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)));
    const avgTableCount = Math.max(1, tables.length);
    const averagePartySize = turnCount > 0 ? parseFloat((totalCovers / turnCount).toFixed(1)) : 0;

    return {
      period: { from, to },
      revenue: {
        total: parseFloat(dineInRevenue.toFixed(2)),
        fromDineIn: parseFloat(dineInRevenue.toFixed(2)),
        averagePerTable: turnCount > 0
          ? parseFloat((dineInRevenue / avgTableCount).toFixed(2))
          : 0,
        averagePerCover: totalCovers > 0
          ? parseFloat((dineInRevenue / totalCovers).toFixed(2))
          : 0
      },
      covers: {
        total: totalCovers,
        perDay: parseFloat((totalCovers / daysDiff).toFixed(1)),
        averagePartySize
      },
      tableTurns: {
        total: turnCount,
        averageTurnTimeMs: avgTurnMs,
        averageTurnTimeMinutes: parseFloat((avgTurnMs / 60000).toFixed(1))
      },
      kds: {
        averageFireDelayMs: 0  // extensible — requires firedAt tracking per item
      },
      tasks: {
        total: totalTasks,
        escalated: escalatedTasks,
        averageResolutionMs: avgResolutionMs,
        slaComplianceRate
      },
      topTables
    };
  }
}
