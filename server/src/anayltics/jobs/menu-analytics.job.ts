// src/modules/analytics/jobs/menu-analytics.job.ts

import OrderItem from "../../models/order.model.js";
import AnalyticsMenuDaily from "../models/analytics-menu-daily.model.js";

export async function generateMenuAnalytics(
  tenantId: string,
  outletId: string,
  reportDate: Date
) {
  const start = new Date(reportDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(reportDate);
  end.setHours(23, 59, 59, 999);

  const data = await OrderItem.aggregate([
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
        _id: "$menuItemId",

        quantitySold: {
          $sum: "$quantity",
        },

        revenue: {
          $sum: "$totalPrice",
        },
      },
    },
  ]);

  for (const item of data) {
    await AnalyticsMenuDaily.findOneAndUpdate(
      {
        tenantId,
        outletId,
        menuItemId: item._id,
        reportDate,
      },
      {
        quantitySold: item.quantitySold,
        revenue: item.revenue,
      },
      {
        upsert: true,
      }
    );
  }
}