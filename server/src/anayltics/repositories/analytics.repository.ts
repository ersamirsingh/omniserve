import AnalyticsDaily from "../models/analytics-daily.model.js";

import AnalyticsMenuDaily from "../models/analytics-menu-daily.model.js";

import AnalyticsHourly from "../models/analytics-hourly.model.js";

import AnalyticsCustomerDaily from "../models/analytics-customer-daily.model.js";

import AnalyticsOutletSummary from "../models/analytics-outlet-summary.model.js";

export class AnalyticsRepository {
  async getDashboardSummary(
    tenantId: string,
    outletId?: string
  ) {
    const query: any = { tenantId };

    if (outletId) {
      query.outletId = outletId;
    }

    const result = await AnalyticsDaily.aggregate([
      {
        $match: query,
      },
      {
        $group: {
          _id: null,

          totalRevenue: {
            $sum: "$totalRevenue",
          },

          totalOrders: {
            $sum: "$totalOrders",
          },

          totalCustomers: {
            $sum: "$totalCustomers",
          },

          grossProfit: {
            $sum: "$grossProfit",
          },
        },
      },
    ]);

    return result[0] || {};
  }

  async getRevenueTrend(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    outletId?: string
  ) {
    const query: any = {
      tenantId,
      reportDate: {
        $gte: startDate,
        $lte: endDate,
      },
    };

    if (outletId) {
      query.outletId = outletId;
    }

    return AnalyticsDaily.find(query)
      .sort({ reportDate: 1 })
      .lean();
  }

  async getTopSellingItems(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    limit = 10
  ) {
    return AnalyticsMenuDaily.aggregate([
      {
        $match: {
          tenantId,
          reportDate: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },

      {
        $group: {
          _id: "$menuItemId",

          quantitySold: {
            $sum: "$quantitySold",
          },

          revenue: {
            $sum: "$revenue",
          },

          profit: {
            $sum: "$profit",
          },
        },
      },

      {
        $sort: {
          revenue: -1,
        },
      },

      {
        $limit: limit,
      },
    ]);
  }

  async getPeakHours(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    outletId?: string
  ) {
    const query: any = {
      tenantId,
      reportDate: {
        $gte: startDate,
        $lte: endDate,
      },
    };

    if (outletId) {
      query.outletId = outletId;
    }

    return AnalyticsHourly.aggregate([
      {
        $match: query,
      },

      {
        $group: {
          _id: "$hour",

          totalOrders: {
            $sum: "$totalOrders",
          },

          totalRevenue: {
            $sum: "$totalRevenue",
          },
        },
      },

      {
        $sort: {
          _id: 1,
        },
      },
    ]);
  }

  async getCustomerRetention(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ) {
    const result = await AnalyticsCustomerDaily.aggregate([
      {
        $match: {
          tenantId,
          reportDate: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },

      {
        $group: {
          _id: null,

          totalCustomers: {
            $sum: "$totalCustomers",
          },

          newCustomers: {
            $sum: "$newCustomers",
          },

          repeatCustomers: {
            $sum: "$repeatCustomers",
          },

          averageRetention: {
            $avg: "$retentionRate",
          },
        },
      },
    ]);

    return result[0] || {};
  }

  async getOutletComparison(
    tenantId: string
  ) {
    return AnalyticsOutletSummary.find({
      tenantId,
    }).lean();
  }
}