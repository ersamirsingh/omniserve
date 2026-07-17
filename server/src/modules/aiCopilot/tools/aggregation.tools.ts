import mongoose from 'mongoose';
import * as Models from '../../../models/index.js';

export class AggregationTools {
  /**
   * Safe helper to convert a string ID to mongoose Types.ObjectId.
   */
  private static toObjectId(id?: string): mongoose.Types.ObjectId | null {
    if (!id) return null;
    try {
      return new mongoose.Types.ObjectId(id);
    } catch {
      return null;
    }
  }

  /**
   * 1. Get Revenue aggregated by period (day, week, month)
   */
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
      paymentStatus: 'SUCCESS', // only count paid orders
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

  /**
   * 2. Get Order count and statistics grouped by status
   */
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

  /**
   * 3. Compute payment success/failure rates
   */
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
          _id: '$status', // Success, Failed, Pending, Refunded
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
    ];

    return Models.Payment.aggregate(pipeline);
  }

  /**
   * 4. Top Menu Items ordered
   */
  static async getTopMenuItems(
    tenantId: string,
    outletId?: string,
    startDateStr?: string,
    endDateStr?: string,
    limit = 5
  ): Promise<any[]> {
    const tId = this.toObjectId(tenantId);
    if (!tId) throw new Error('Invalid tenantId');

    // OrderItems match stage
    const matchStage: any = {
      tenantId: tId,
      isDeleted: false,
    };

    const pipeline: any[] = [{ $match: matchStage }];

    // If outletId is provided, we must lookup Order to filter by outletId
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

  /**
   * 5. Get low inventory alerts mapped with Menu Item name
   */
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

  /**
   * 6. Analyze review sentiment trends
   */
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
          _id: '$sentiment', // Positive, Negative, Neutral
          averageRating: { $avg: '$rating' },
          count: { $sum: 1 },
        },
      },
    ];

    return Models.ReviewAnalytics.aggregate(pipeline);
  }
}
