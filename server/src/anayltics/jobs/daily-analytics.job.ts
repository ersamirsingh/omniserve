// src/modules/analytics/jobs/daily-analytics.job.ts

import Order from "../../models/order.model.js";
import AnalyticsDaily from "../models/analytics-daily.model.js";

export async function generateDailyAnalytics(
  tenantId: string,
  outletId: string,
  reportDate: Date
) {
  const start = new Date(reportDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(reportDate);
  end.setHours(23, 59, 59, 999);

  const result = await Order.aggregate([
    {
      $match: {
        tenantId,
        outletId,
        createdAt: {
          $gte: start,
          $lte: end,
        },
      },
    },
    {
      $group: {
        _id: null,

        totalOrders: {
          $sum: 1,
        },

        totalRevenue: {
          $sum: "$finalAmount",
        },

        totalDiscount: {
          $sum: "$discountAmount",
        },

        totalTax: {
          $sum: "$taxAmount",
        },

        completedOrders: {
          $sum: {
            $cond: [
              { $eq: ["$status", "COMPLETED"] },
              1,
              0,
            ],
          },
        },

        cancelledOrders: {
          $sum: {
            $cond: [
              { $eq: ["$status", "CANCELLED"] },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  const stats = result[0];

  if (!stats) return;

  await AnalyticsDaily.findOneAndUpdate(
    {
      tenantId,
      outletId,
      reportDate,
    },
    {
      totalOrders: stats.totalOrders,
      totalRevenue: stats.totalRevenue,
      totalDiscount: stats.totalDiscount,
      totalTax: stats.totalTax,

      completedOrders: stats.completedOrders,
      cancelledOrders: stats.cancelledOrders,

      averageOrderValue:
        stats.totalOrders > 0
          ? stats.totalRevenue /
            stats.totalOrders
          : 0,
    },
    {
      upsert: true,
      new: true,
    }
  );
}