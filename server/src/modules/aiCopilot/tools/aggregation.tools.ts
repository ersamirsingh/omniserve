import mongoose from 'mongoose';
import * as Models from '../../../models/index.js';
import { AnalyticsService } from '../../analytics/analytics.service.js';

export class AggregationTools {

  private static toObjectId(id?: string): mongoose.Types.ObjectId | null {
    if (!id) return null;
    try {
      return new mongoose.Types.ObjectId(id);
    } catch {
      return null;
    }
  }

  static async getRevenueByPeriod(
    tenantId: string,
    outletId?: string,
    startDateStr?: string,
    endDateStr?: string
  ): Promise<any[]> {
    const tId = this.toObjectId(tenantId);
    if (!tId) throw new Error('Invalid tenantId');

    const matchStage: any = {
      tenantId: tId,
      isDeleted: false,
      paymentStatus: 'SUCCESS',
    };

    if (outletId) {
      const oId = this.toObjectId(outletId);
      if (oId) matchStage.outletId = oId;
    }

    if (startDateStr || endDateStr) {
      matchStage.createdAt = {};
      if (startDateStr) matchStage.createdAt.$gte = new Date(startDateStr);
      if (endDateStr) matchStage.createdAt.$lte = new Date(endDateStr);
    }

    const pipeline: any[] = [
      { $match: matchStage },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          totalRevenue: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ];

    return Models.Order.aggregate(pipeline);
  }

  static async getOrderCountAndStatus(
    tenantId: string,
    outletId?: string,
    startDateStr?: string,
    endDateStr?: string
  ): Promise<any[]> {
    const tId = this.toObjectId(tenantId);
    if (!tId) throw new Error('Invalid tenantId');

    const matchStage: any = {
      tenantId: tId,
      isDeleted: false,
    };

    if (outletId) {
      const oId = this.toObjectId(outletId);
      if (oId) matchStage.outletId = oId;
    }

    if (startDateStr || endDateStr) {
      matchStage.createdAt = {};
      if (startDateStr) matchStage.createdAt.$gte = new Date(startDateStr);
      if (endDateStr) matchStage.createdAt.$lte = new Date(endDateStr);
    }

    const pipeline: any[] = [
      { $match: matchStage },
      {
        $group: {
          _id: '$orderStatus',
          count: { $sum: 1 },
          totalValue: { $sum: '$totalAmount' },
          avgValue: { $avg: '$totalAmount' },
        },
      },
    ];

    return Models.Order.aggregate(pipeline);
  }

  static async getPaymentSuccessRate(
    tenantId: string,
    outletId?: string,
    startDateStr?: string,
    endDateStr?: string
  ): Promise<any[]> {
    const tId = this.toObjectId(tenantId);
    if (!tId) throw new Error('Invalid tenantId');

    const matchStage: any = {
      tenantId: tId,
      isDeleted: false,
    };

    if (outletId) {
      const oId = this.toObjectId(outletId);
      if (oId) matchStage.outletId = oId;
    }

    if (startDateStr || endDateStr) {
      matchStage.createdAt = {};
      if (startDateStr) matchStage.createdAt.$gte = new Date(startDateStr);
      if (endDateStr) matchStage.createdAt.$lte = new Date(endDateStr);
    }

    const pipeline: any[] = [
      { $match: matchStage },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
    ];

    return Models.Payment.aggregate(pipeline);
  }

  static async getTopMenuItems(
    tenantId: string,
    outletId?: string,
    startDateStr?: string,
    endDateStr?: string,
    limit = 5
  ): Promise<any[]> {
    const tId = this.toObjectId(tenantId);
    if (!tId) throw new Error('Invalid tenantId');

    const matchStage: any = {
      tenantId: tId,
      isDeleted: false,
    };

    const pipeline: any[] = [{ $match: matchStage }];

    if (outletId) {
      const oId = this.toObjectId(outletId);
      if (oId) {
        pipeline.push(
          {
            $lookup: {
              from: 'orders',
              localField: 'orderId',
              foreignField: '_id',
              as: 'orderInfo',
            },
          },
          { $unwind: '$orderInfo' },
          {
            $match: {
              'orderInfo.outletId': oId,
              'orderInfo.isDeleted': false,
            },
          }
        );
      }
    }

    if (startDateStr || endDateStr) {
      const dateFilter: any = {};
      if (startDateStr) dateFilter.$gte = new Date(startDateStr);
      if (endDateStr) dateFilter.$lte = new Date(endDateStr);
      pipeline.push({
        $match: {
          createdAt: dateFilter,
        },
      });
    }

    pipeline.push(
      {
        $group: {
          _id: '$menuItemId',
          itemName: { $first: '$name' },
          totalQuantity: { $sum: '$quantity' },
          totalRevenue: { $sum: '$totalPrice' },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: limit }
    );

    return Models.OrderItem.aggregate(pipeline);
  }

  static async getLowInventoryAlerts(tenantId: string, outletId?: string): Promise<any[]> {
    const tId = this.toObjectId(tenantId);
    if (!tId) throw new Error('Invalid tenantId');

    const matchStage: any = {
      tenantId: tId,
      isDeleted: false,
      isLowStock: true,
    };

    if (outletId) {
      const oId = this.toObjectId(outletId);
      if (oId) matchStage.outletId = oId;
    }

    const pipeline: any[] = [
      { $match: matchStage },
      {
        $lookup: {
          from: 'menuitems',
          localField: 'menuItemId',
          foreignField: '_id',
          as: 'itemInfo',
        },
      },
      { $unwind: { path: '$itemInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          quantity: 1,
          threshold: 1,
          itemName: { $ifNull: ['$itemInfo.name', 'Unknown Item'] },
          outletId: 1,
        },
      },
    ];

    return Models.Inventory.aggregate(pipeline);
  }

  static async getReviewSentimentTrends(tenantId: string, outletId?: string): Promise<any[]> {
    const tId = this.toObjectId(tenantId);
    if (!tId) throw new Error('Invalid tenantId');

    const matchStage: any = {
      tenantId: tId,
      isDeleted: false,
    };

    if (outletId) {
      const oId = this.toObjectId(outletId);
      if (oId) matchStage.outletId = oId;
    }

    const pipeline: any[] = [
      { $match: matchStage },
      {
        $group: {
          _id: '$sentiment',
          averageRating: { $avg: '$rating' },
          count: { $sum: 1 },
        },
      },
    ];

    return Models.ReviewAnalytics.aggregate(pipeline);
  }

  static async getPeakHours(tenantId: string, outletId?: string): Promise<any[]> {
    const res = await AnalyticsService.getExtendedStats(tenantId, outletId ? [outletId] : null);
    return res.peakHours;
  }

  static async getCustomerRetention(tenantId: string, outletId?: string): Promise<number> {
    const res = await AnalyticsService.getExtendedStats(tenantId, outletId ? [outletId] : null);
    return res.customerRetention;
  }

  static async getTableTurnoverAndReservations(tenantId: string, outletId?: string): Promise<any> {
    const res = await AnalyticsService.getExtendedStats(tenantId, outletId ? [outletId] : null);
    return {
      tableTurnover: res.tableTurnover,
      avgReservationDurationMinutes: res.avgReservationDuration
    };
  }

  static async getOrderVolumeByChannel(tenantId: string, outletId?: string): Promise<any[]> {
    const res = await AnalyticsService.getExtendedStats(tenantId, outletId ? [outletId] : null);
    return res.channelVolume;
  }
}
