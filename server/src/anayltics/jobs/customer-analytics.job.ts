// src/modules/analytics/jobs/customer-analytics.job.ts

import Order from "../../models/order.model.js";
import AnalyticsCustomerDaily from "../models/analytics-customer-daily.model.js";

export async function generateCustomerAnalytics(
  tenantId: string,
  reportDate: Date
) {
  const start = new Date(reportDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(reportDate);
  end.setHours(23, 59, 59, 999);

  const orders = await Order.aggregate([
    {
      $match: {
        tenantId,
        createdAt: {
          $gte: start,
          $lte: end,
        },
      },
    },

    {
      $group: {
        _id: "$customerId",

        totalOrders: {
          $sum: 1,
        },

        totalSpent: {
          $sum: "$finalAmount",
        },
      },
    },
  ]);

  const totalCustomers = orders.length;

  const repeatCustomers =
    orders.filter(
      (customer) => customer.totalOrders > 1
    ).length;

  const newCustomers =
    totalCustomers - repeatCustomers;

  const retentionRate =
    totalCustomers > 0
      ? (repeatCustomers /
          totalCustomers) *
        100
      : 0;

  const averageCustomerValue =
    totalCustomers > 0
      ? orders.reduce(
          (sum, c) => sum + c.totalSpent,
          0
        ) / totalCustomers
      : 0;

  await AnalyticsCustomerDaily.findOneAndUpdate(
    {
      tenantId,
      reportDate,
    },
    {
      totalCustomers,
      newCustomers,
      repeatCustomers,

      retentionRate,

      averageCustomerValue,
    },
    {
      upsert: true,
    }
  );
}