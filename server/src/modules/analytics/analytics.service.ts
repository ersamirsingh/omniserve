import { Types } from 'mongoose';
import AnalyticsDaily, { IAnalyticsDaily } from "../../models/analyticsDaily.model.js";
import Restaurant from "../../models/restaurant.model.js";
import Subscription from "../../models/subscription.model.js";
import User from "../../models/user.model.js";
import Outlet from "../../models/outlet.model.js";
import MenuItem from "../../models/menuItem.model.js";
import Order from "../../models/order.model.js";
import { OrderStatus, SubscriptionStatus, UserStatus } from "../../models/enums.js";

export interface IDailyAnalyticsSnapshot {
  reportDate: Date;
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  cancelledOrders: number;
  newCustomers: number;
  repeatCustomers: number;
  outletCount: number;
}

export class AnalyticsService {
  private static normalizeOutletIds(outletId?: string, outletIds?: string[]): Types.ObjectId[] | null {
    if (outletId) return [new Types.ObjectId(outletId)];
    if (outletIds !== undefined) {
      return outletIds.map((id) => new Types.ObjectId(id));
    }
    return null;
  }

  private static buildOrderMatch(
    tenantId: string,
    filters: { outletId?: string; outletIds?: string[]; from?: string; to?: string },
    includeCancelled = true
  ) {
    const outletObjectIds = this.normalizeOutletIds(filters.outletId, filters.outletIds);
    const match: Record<string, any> = {
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    };

    if (outletObjectIds) {
      match.outletId = { $in: outletObjectIds };
    }

    if (!includeCancelled) {
      match.orderStatus = { $ne: OrderStatus.CANCELLED };
    }

    if (filters.from || filters.to) {
      match.createdAt = {};
      if (filters.from) {
        const fromDate = new Date(filters.from);
        fromDate.setUTCHours(0, 0, 0, 0);
        match.createdAt.$gte = fromDate;
      }
      if (filters.to) {
        const toDate = new Date(filters.to);
        toDate.setUTCHours(23, 59, 59, 999);
        match.createdAt.$lte = toDate;
      }
    }

    return match;
  }

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

    const query = {
      tenantId: new Types.ObjectId(tenantId),
      outletId: new Types.ObjectId(outletId),
      reportDate,
      isDeleted: false,
    };
    const increments: Record<string, number> = {};

    if (metrics.totalOrders !== undefined) increments.totalOrders = metrics.totalOrders;
    if (metrics.totalRevenue !== undefined) increments.totalRevenue = metrics.totalRevenue;
    if (metrics.cancelledOrders !== undefined) increments.cancelledOrders = metrics.cancelledOrders;
    if (metrics.newCustomers !== undefined) increments.newCustomers = metrics.newCustomers;
    if (metrics.repeatCustomers !== undefined) increments.repeatCustomers = metrics.repeatCustomers;

    const record = await AnalyticsDaily.findOneAndUpdate(
      query,
      {
        ...(Object.keys(increments).length > 0 ? { $inc: increments } : {}),
        $setOnInsert: {
          tenantId: query.tenantId,
          outletId: query.outletId,
          reportDate,
          totalOrders: 0,
          totalRevenue: 0,
          cancelledOrders: 0,
          newCustomers: 0,
          repeatCustomers: 0,
          createdBy: userId ? new Types.ObjectId(userId) : null,
          isDeleted: false,
        },
        $set: {
          updatedBy: userId ? new Types.ObjectId(userId) : null,
        },
      },
      { new: true, upsert: true }
    );

    if (!record) {
      throw new Error('Failed to upsert analytics record.');
    }

    const orders = record.totalOrders;
    const revenue = record.totalRevenue;
    record.averageOrderValue = orders > 0 ? Number((revenue / orders).toFixed(2)) : 0;
    return record.save();
  }

  /**
   * Retrieve list of daily analytics records (tenant isolated)
   * Sorted by reportDate ascending
   */
  static async getDailyStats(
    tenantId: string,
    filters: { outletId?: string; outletIds?: string[]; from?: string; to?: string }
  ): Promise<IDailyAnalyticsSnapshot[]> {
    const allOrdersMatch = this.buildOrderMatch(tenantId, filters, true);
    const activeOrdersMatch = this.buildOrderMatch(tenantId, filters, false);

    const [dailyRows, dailyDistinctCustomers, firstOrderDays] = await Promise.all([
      Order.aggregate([
        { $match: allOrdersMatch },
        {
          $group: {
            _id: {
              day: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$createdAt',
                },
              },
            },
            totalOrders: {
              $sum: {
                $cond: [{ $ne: ['$orderStatus', OrderStatus.CANCELLED] }, 1, 0],
              },
            },
            totalRevenue: {
              $sum: {
                $cond: [{ $ne: ['$orderStatus', OrderStatus.CANCELLED] }, '$totalAmount', 0],
              },
            },
            cancelledOrders: {
              $sum: {
                $cond: [{ $eq: ['$orderStatus', OrderStatus.CANCELLED] }, 1, 0],
              },
            },
            outlets: { $addToSet: '$outletId' },
          },
        },
        { $sort: { '_id.day': 1 } },
      ]),
      Order.aggregate([
        { $match: activeOrdersMatch },
        {
          $group: {
            _id: {
              day: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$createdAt',
                },
              },
              customerId: '$customerId',
            },
          },
        },
        {
          $group: {
            _id: '$_id.day',
            distinctCustomers: { $sum: 1 },
          },
        },
      ]),
      Order.aggregate([
        { $match: activeOrdersMatch },
        {
          $group: {
            _id: '$customerId',
            firstOrderDate: { $min: '$createdAt' },
          },
        },
        {
          $group: {
            _id: {
              day: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$firstOrderDate',
                },
              },
            },
            newCustomers: { $sum: 1 },
          },
        },
      ]),
    ]);

    const distinctCustomersByDay = new Map<string, number>(
      dailyDistinctCustomers.map((row) => [row._id, row.distinctCustomers])
    );
    const newCustomersByDay = new Map<string, number>(
      firstOrderDays.map((row) => [row._id.day, row.newCustomers])
    );

    return dailyRows.map((row) => {
      const day = row._id.day;
      const totalOrders = row.totalOrders || 0;
      const totalRevenue = row.totalRevenue || 0;
      const newCustomers = newCustomersByDay.get(day) || 0;
      const distinctCustomers = distinctCustomersByDay.get(day) || 0;

      return {
        reportDate: new Date(`${day}T00:00:00.000Z`),
        totalOrders,
        totalRevenue,
        averageOrderValue: totalOrders > 0 ? Number((totalRevenue / totalOrders).toFixed(2)) : 0,
        cancelledOrders: row.cancelledOrders || 0,
        newCustomers,
        repeatCustomers: Math.max(0, distinctCustomers - newCustomers),
        outletCount: row.outlets?.length || 0,
      };
    });
  }

  /**
   * Aggregate statistics for the tenant
   */
  static async getSummaryStats(tenantId: string, outletIds?: string[] | null): Promise<{
    totalRevenue: number;
    totalOrders: number;
    cancelledOrders: number;
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
    const orderFilters: { outletIds?: string[] } = {};
    if (outletIds !== undefined && outletIds !== null) {
      orderFilters.outletIds = outletIds;
    }
    const orderMatch = this.buildOrderMatch(tenantId, orderFilters, true);

    const result = await Order.aggregate([
      {
        $match: orderMatch,
      },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: {
              $cond: [{ $ne: ['$orderStatus', OrderStatus.CANCELLED] }, '$totalAmount', 0],
            },
          },
          totalOrders: {
            $sum: {
              $cond: [{ $ne: ['$orderStatus', OrderStatus.CANCELLED] }, 1, 0],
            },
          },
          cancelledOrders: {
            $sum: {
              $cond: [{ $eq: ['$orderStatus', OrderStatus.CANCELLED] }, 1, 0],
            },
          },
          outlets: { $addToSet: '$outletId' },
        },
      },
    ]);

    let totalRestaurants = 0;
    let activeSubscriptions = 0;
    let totalUsers = 0;
    let activeOutlets = 0;
    let totalMenuItems = 0;

    if (outletIds === null || outletIds === undefined) {
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
            { restaurantId: { $in: uniqueRestIds } },
            { pendingRestaurantId: { $in: uniqueRestIds } },
            { outletId: { $in: outletObjectIds } },
            { outletIds: { $in: outletObjectIds } },
            { pendingOutletId: { $in: outletObjectIds } },
            { pendingOutletIds: { $in: outletObjectIds } },
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
        cancelledOrders: 0,
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

    const { totalRevenue, totalOrders, cancelledOrders, outlets } = result[0];
    const averageOrderValue = totalOrders > 0 ? Number((totalRevenue / totalOrders).toFixed(2)) : 0;

    return {
      totalRevenue,
      totalOrders,
      cancelledOrders,
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
