// src/modules/analytics/services/analytics.service.ts

import { AnalyticsRepository } from "../repositories/analytics.repository.js";

export class AnalyticsService {
  private analyticsRepository: AnalyticsRepository;

  constructor() {
    this.analyticsRepository = new AnalyticsRepository();
  }

  async getDashboardSummary(
    tenantId: string,
    outletId?: string
  ) {
    const summary =
      await this.analyticsRepository.getDashboardSummary(
        tenantId,
        outletId
      );

    return {
      totalRevenue: summary.totalRevenue || 0,
      totalOrders: summary.totalOrders || 0,
      totalCustomers: summary.totalCustomers || 0,
      grossProfit: summary.grossProfit || 0,

      averageOrderValue:
        summary.totalOrders > 0
          ? Number(
              (
                summary.totalRevenue /
                summary.totalOrders
              ).toFixed(2)
            )
          : 0,
    };
  }

  async getRevenueTrend(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    outletId?: string
  ) {
    const trend =
      await this.analyticsRepository.getRevenueTrend(
        tenantId,
        startDate,
        endDate,
        outletId
      );

    return trend.map((item) => ({
      date: item.reportDate,
      revenue: item.totalRevenue,
      orders: item.totalOrders,
      averageOrderValue: item.averageOrderValue,
    }));
  }

  async getTopSellingItems(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    limit = 10
  ) {
    return this.analyticsRepository.getTopSellingItems(
      tenantId,
      startDate,
      endDate,
      limit
    );
  }

  async getPeakHours(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    outletId?: string
  ) {
    const hours =
      await this.analyticsRepository.getPeakHours(
        tenantId,
        startDate,
        endDate,
        outletId
      );

    return hours.map((hour) => ({
      hour: hour._id,
      totalOrders: hour.totalOrders,
      totalRevenue: hour.totalRevenue,
    }));
  }

  async getCustomerRetention(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ) {
    const retention =
      await this.analyticsRepository.getCustomerRetention(
        tenantId,
        startDate,
        endDate
      );

    return {
      totalCustomers:
        retention.totalCustomers || 0,

      newCustomers:
        retention.newCustomers || 0,

      repeatCustomers:
        retention.repeatCustomers || 0,

      retentionRate:
        retention.averageRetention || 0,
    };
  }

  async getOutletComparison(
    tenantId: string
  ) {
    return this.analyticsRepository.getOutletComparison(
      tenantId
    );
  }

  async getRevenueGrowth(
    tenantId: string,
    currentStart: Date,
    currentEnd: Date,
    previousStart: Date,
    previousEnd: Date,
    outletId?: string
  ) {
    const current =
      await this.analyticsRepository.getRevenueTrend(
        tenantId,
        currentStart,
        currentEnd,
        outletId
      );

    const previous =
      await this.analyticsRepository.getRevenueTrend(
        tenantId,
        previousStart,
        previousEnd,
        outletId
      );

    const currentRevenue = current.reduce(
      (sum, item) => sum + item.totalRevenue,
      0
    );

    const previousRevenue = previous.reduce(
      (sum, item) => sum + item.totalRevenue,
      0
    );

    if (previousRevenue === 0) {
      return 100;
    }

    return Number(
      (
        ((currentRevenue - previousRevenue) /
          previousRevenue) *
        100
      ).toFixed(2)
    );
  }
}