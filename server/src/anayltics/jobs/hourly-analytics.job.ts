// src/modules/analytics/jobs/hourly-analytics.job.ts

import Order from "../../models/order.model.js";
import AnalyticsHourly from "../models/analytics-hourly.model.js";

export async function generateHourlyAnalytics(
  tenantId: string,
  outletId: string,
  reportDate: Date
) {
  const start = new Date(reportDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(reportDate);
  end.setHours(23, 59, 59, 999);

  const data = await Order.aggregate([
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
        _id: {
          $hour: "$createdAt",
        },

        totalOrders: {
          $sum: 1,
        },

        totalRevenue: {
          $sum: "$finalAmount",
        },
      },
    },
  ]);

  for (const row of data) {
    await AnalyticsHourly.findOneAndUpdate(
      {
        tenantId,
        outletId,
        reportDate,
        hour: row._id,
      },
      {
        totalOrders: row.totalOrders,
        totalRevenue: row.totalRevenue,
      },
      {
        upsert: true,
      }
    );
  }
}