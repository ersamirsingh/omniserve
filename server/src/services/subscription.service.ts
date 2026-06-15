import mongoose, { Types } from 'mongoose';
import Subscription, { ISubscription } from '../models/subscription.model.js';
import { SubscriptionPlan, SubscriptionStatus } from '../enums/enums.js';

export class SubscriptionService {
  /**
   * Create a new subscription for a tenant (cancels other active subscriptions)
   */
  static async createSubscription(
    tenantId: string,
    plan: SubscriptionPlan,
    amount: number,
    startDate: Date,
    endDate: Date | null,
    createdBy?: string
  ): Promise<ISubscription> {
    const tenantObjectId = new Types.ObjectId(tenantId);
    const userObjectId = createdBy ? new Types.ObjectId(createdBy) : null;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Deactivate all previous active subscriptions for this tenant
      await Subscription.updateMany(
        {
          tenantId: tenantObjectId,
          status: SubscriptionStatus.ACTIVE,
          isDeleted: false,
        },
        {
          status: SubscriptionStatus.INACTIVE,
          updatedBy: userObjectId,
        },
        { session }
      );

      const subscription = new Subscription({
        tenantId: tenantObjectId,
        plan,
        amount,
        startDate,
        endDate,
        status: SubscriptionStatus.ACTIVE,
        createdBy: userObjectId,
        isDeleted: false,
      });

      const saved = await subscription.save({ session });
      await session.commitTransaction();
      return saved;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Get current subscription for a tenant (new spec format)
   */
  static async getCurrentSubscription(tenantId: string): Promise<ISubscription | null> {
    const now = new Date();

    return await Subscription.findOne({
      tenantId: new Types.ObjectId(tenantId),
      status: SubscriptionStatus.ACTIVE,
      startDate: { $lte: now },
      $or: [
        { endDate: { $gte: now } },
        { endDate: null }
      ],
      isDeleted: false,
    });
  }

  /**
   * Get all subscriptions for a tenant (including inactive/expired)
   */
  static async getSubscriptionsByTenantId(
    tenantId: string,
    limit: number = 10,
    skip: number = 0
  ): Promise<{ subscriptions: ISubscription[]; total: number }> {
    const tenantObjectId = new Types.ObjectId(tenantId);

    const subscriptions = await Subscription.find({
      tenantId: tenantObjectId,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Subscription.countDocuments({
      tenantId: tenantObjectId,
      isDeleted: false,
    });

    return { subscriptions, total };
  }

  /**
   * Get subscription by ID (tenant isolated)
   */
  static async getSubscriptionById(subscriptionId: string, tenantId: string): Promise<ISubscription | null> {
    return await Subscription.findOne({
      _id: new Types.ObjectId(subscriptionId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });
  }

  /**
   * Check if subscription is active and not expired (tenant isolated)
   */
  static async isSubscriptionActive(subscriptionId: string): Promise<boolean> {
    const subscription = await Subscription.findById(subscriptionId);

    if (!subscription) return false;

    const now = new Date();
    return (
      subscription.status === SubscriptionStatus.ACTIVE &&
      subscription.startDate <= now &&
      (subscription.endDate === null || subscription.endDate >= now)
    );
  }

  /**
   * Update subscription status (tenant isolated)
   */
  static async updateSubscriptionStatus(
    subscriptionId: string,
    tenantId: string,
    status: SubscriptionStatus,
    updatedBy?: string
  ): Promise<ISubscription | null> {
    return await Subscription.findOneAndUpdate(
      {
        _id: new Types.ObjectId(subscriptionId),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      },
      {
        status,
        updatedBy: updatedBy ? new Types.ObjectId(updatedBy) : undefined,
      },
      { new: true }
    );
  }

  /**
   * Cancel subscription - Set status = CANCELLED (new spec, does not soft delete)
   */
  static async cancelSubscription(
    subscriptionId: string,
    tenantId: string,
    updatedBy?: string
  ): Promise<ISubscription | null> {
    return await Subscription.findOneAndUpdate(
      {
        _id: new Types.ObjectId(subscriptionId),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      },
      {
        status: SubscriptionStatus.CANCELLED,
        updatedBy: updatedBy ? new Types.ObjectId(updatedBy) : undefined,
      },
      { new: true }
    );
  }

}
