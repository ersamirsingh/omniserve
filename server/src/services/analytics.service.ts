import mongoose, { Types } from 'mongoose';
import AnalyticsDaily, { IAnalyticsDaily } from '../models/analyticsdaily.model.js';
import Restaurant from '../models/restaurant.model.js';
import Subscription from '../models/subscription.model.js';
import User from '../models/user.model.js';
import Outlet from '../models/outlet.model.js';
import MenuItem from '../models/menuitems.model.js';
import { UserStatus, SubscriptionStatus } from '../enums/enums.js';

export class AnalyticsService {
  /**
   * Upsert metrics for a daily analytics record using compound index: tenantId + outletId + reportDate
   */
  static async upsertDailyMetrics(
    tenantId: string,
    outletId: string,
    reportDateStr: string,
    metrics: {
      totalOrders?: number;
      totalRevenue?: number;
      cancelledOrders?: number;
      newCustomers?: number;
      repeatCustomers?: number;
    },
    userId?: string
  ): Promise<IAnalyticsDaily> {
    const reportDate = new Date(reportDateStr);
    reportDate.setUTCHours(0, 0, 0, 0);

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      let record = await AnalyticsDaily.findOne({
        tenantId: new Types.ObjectId(tenantId),
        outletId: new Types.ObjectId(outletId),
        reportDate,
        isDeleted: false,
      }).session(session);

      if (!record) {
        record = new AnalyticsDaily({
          tenantId: new Types.ObjectId(tenantId),
          outletId: new Types.ObjectId(outletId),
          reportDate,
          totalOrders: metrics.totalOrders || 0,
          totalRevenue: metrics.totalRevenue || 0,
          cancelledOrders: metrics.cancelledOrders || 0,
          newCustomers: metrics.newCustomers || 0,
          repeatCustomers: metrics.repeatCustomers || 0,
          createdBy: userId ? new Types.ObjectId(userId) : null,
          updatedBy: userId ? new Types.ObjectId(userId) : null,
          isDeleted: false,
        });
      } else {
        if (metrics.totalOrders !== undefined) record.totalOrders += metrics.totalOrders;
        if (metrics.totalRevenue !== undefined) record.totalRevenue += metrics.totalRevenue;
        if (metrics.cancelledOrders !== undefined) record.cancelledOrders += metrics.cancelledOrders;
        if (metrics.newCustomers !== undefined) record.newCustomers += metrics.newCustomers;
        if (metrics.repeatCustomers !== undefined) record.repeatCustomers += metrics.repeatCustomers;
        record.updatedBy = userId ? new Types.ObjectId(userId) : null;
      }

      // Recompute average order value
      const orders = record.totalOrders;
      const revenue = record.totalRevenue;
      record.averageOrderValue = orders > 0 ? Number((revenue / orders).toFixed(2)) : 0;

      const savedRecord = await record.save({ session });
      await session.commitTransaction();
      return savedRecord;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Retrieve list of daily analytics records (tenant isolated)
   * Sorted by reportDate ascending
   */
  static async getDailyStats(
    tenantId: string,
    filters: { outletId?: string; outletIds?: string[]; from?: string; to?: string }
  ): Promise<IAnalyticsDaily[]> {
    const query: any = {
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    };

    if (filters.outletId) {
      query.outletId = new Types.ObjectId(filters.outletId);
    } else if (filters.outletIds) {
      query.outletId = { $in: filters.outletIds.map(id => new Types.ObjectId(id)) };
    }

    if (filters.from || filters.to) {
      query.reportDate = {};
      if (filters.from) {
        const fromDate = new Date(filters.from);
        fromDate.setUTCHours(0, 0, 0, 0);
        query.reportDate.$gte = fromDate;
      }
      if (filters.to) {
        const toDate = new Date(filters.to);
        toDate.setUTCHours(23, 59, 59, 999);
        query.reportDate.$lte = toDate;
      }
    }

    return await AnalyticsDaily.find(query).sort({ reportDate: 1 });
  }

  /**
   * Aggregate statistics for the tenant
   */
  static async getSummaryStats(tenantId: string, outletIds?: string[] | null): Promise<{
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    outletCount: number;
    totalRestaurants: number;
    activeSubscriptions: number;
    totalUsers: number;
    activeOutlets: number;
    totalMenuItems: number;
    avgOrderValue: number;
  }> {
    const tenantObjectId = new Types.ObjectId(tenantId);
    const match: any = {
      tenantId: tenantObjectId,
      isDeleted: false,
    };

    if (outletIds) {
      match.outletId = { $in: outletIds.map(id => new Types.ObjectId(id)) };
    }

    const result = await AnalyticsDaily.aggregate([
      {
        $match: match,
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalRevenue' },
          totalOrders: { $sum: '$totalOrders' },
          outlets: { $addToSet: '$outletId' },
        },
      },
    ]);

    let totalRestaurants = 0;
    let activeSubscriptions = 0;
    let totalUsers = 0;
    let activeOutlets = 0;
    let totalMenuItems = 0;

    if (!outletIds) {
      const [
        restaurantsCount,
        subscriptionsCount,
        usersCount,
        outletsCountVal,
        menuItemsCount,
      ] = await Promise.all([
        Restaurant.countDocuments({ tenantId: tenantObjectId, isDeleted: false }),
        Subscription.countDocuments({ tenantId: tenantObjectId, status: SubscriptionStatus.ACTIVE, isDeleted: false }),
        User.countDocuments({ tenantId: tenantObjectId, isDeleted: false }),
        Outlet.countDocuments({ tenantId: tenantObjectId, isDeleted: false, status: UserStatus.ACTIVE }),
        MenuItem.countDocuments({ tenantId: tenantObjectId, isDeleted: false }),
      ]);
      totalRestaurants = restaurantsCount;
      activeSubscriptions = subscriptionsCount;
      totalUsers = usersCount;
      activeOutlets = outletsCountVal;
      totalMenuItems = menuItemsCount;
    } else {
      const outletObjectIds = outletIds.map(id => new Types.ObjectId(id));
      const outletsList = await Outlet.find({ _id: { $in: outletObjectIds }, isDeleted: false }).select('restaurantId');
      const uniqueRestIds = Array.from(new Set(outletsList.map(o => o.restaurantId?.toString()).filter(Boolean))).map(id => new Types.ObjectId(id));

      const [
        restaurantsCount,
        subscriptionsCount,
        usersCount,
        outletsCountVal,
        menuItemsCount,
      ] = await Promise.all([
        Restaurant.countDocuments({ _id: { $in: uniqueRestIds }, isDeleted: false }),
        Subscription.countDocuments({ tenantId: tenantObjectId, status: SubscriptionStatus.ACTIVE, isDeleted: false }),
        User.countDocuments({ 
          tenantId: tenantObjectId, 
          isDeleted: false, 
          $or: [
            { outletId: { $in: outletObjectIds } },
            { outletIds: { $in: outletObjectIds } }
          ]
        }),
        Outlet.countDocuments({ _id: { $in: outletObjectIds }, isDeleted: false, status: UserStatus.ACTIVE }),
        MenuItem.countDocuments({ tenantId: tenantObjectId, outletId: { $in: outletObjectIds }, isDeleted: false }),
      ]);
      totalRestaurants = restaurantsCount;
      activeSubscriptions = subscriptionsCount;
      totalUsers = usersCount;
      activeOutlets = outletsCountVal;
      totalMenuItems = menuItemsCount;
    }

    if (result.length === 0) {
      return {
        totalRevenue: 0,
        totalOrders: 0,
        averageOrderValue: 0,
        outletCount: 0,
        totalRestaurants,
        activeSubscriptions,
        totalUsers,
        activeOutlets,
        totalMenuItems,
        avgOrderValue: 0,
      };
    }

    const { totalRevenue, totalOrders, outlets } = result[0];
    const averageOrderValue = totalOrders > 0 ? Number((totalRevenue / totalOrders).toFixed(2)) : 0;

    return {
      totalRevenue,
      totalOrders,
      averageOrderValue,
      outletCount: outlets.length,
      totalRestaurants,
      activeSubscriptions,
      totalUsers,
      activeOutlets,
      totalMenuItems,
      avgOrderValue: averageOrderValue,
    };
  }
}
