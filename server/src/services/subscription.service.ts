import Subscription, { ISubscription } from '../models/subscription.model.js';
import { SubscriptionPlan, UserStatus } from '../enums/enums.js';
import { Types } from 'mongoose';

export class SubscriptionService {
  /**
   * Create a new subscription for a tenant
   */
  static async createSubscription(
    tenantId: string,
    plan: SubscriptionPlan,
    amount: number,
    startDate: Date,
    endDate: Date,
    createdBy?: string
  ): Promise<ISubscription> {
    const subscription = new Subscription({
      tenantId: new Types.ObjectId(tenantId),
      plan,
      amount,
      startDate,
      endDate,
      status: UserStatus.ACTIVE,
      createdBy: createdBy ? new Types.ObjectId(createdBy) : null,
    });

    return await subscription.save();
  }

  /**
   * Get active subscription for a tenant (not expired, status ACTIVE, not deleted)
   */
  static async getActiveSubscription(tenantId: string): Promise<ISubscription | null> {
    const now = new Date();
    
    return await Subscription.findOne({
      tenantId: new Types.ObjectId(tenantId),
      status: UserStatus.ACTIVE,
      startDate: { $lte: now },
      endDate: { $gte: now },
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
    const subscriptions = await Subscription.find({
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Subscription.countDocuments({
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    return { subscriptions, total };
  }

  /**
   * Get subscription by ID
   */
  static async getSubscriptionById(subscriptionId: string): Promise<ISubscription | null> {
    return await Subscription.findById(subscriptionId);
  }

  /**
   * Check if subscription is active and not expired
   */
  static async isSubscriptionActive(subscriptionId: string): Promise<boolean> {
    const subscription = await Subscription.findById(subscriptionId);
    
    if (!subscription) return false;

    const now = new Date();
    return (
      subscription.status === UserStatus.ACTIVE &&
      subscription.startDate <= now &&
      subscription.endDate >= now
    );
  }

  /**
   * Update subscription plan
   */
  static async updateSubscriptionPlan(
    subscriptionId: string,
    newPlan: SubscriptionPlan,
    newAmount: number,
    newEndDate: Date,
    updatedBy?: string
  ): Promise<ISubscription | null> {
    return await Subscription.findByIdAndUpdate(
      subscriptionId,
      {
        plan: newPlan,
        amount: newAmount,
        endDate: newEndDate,
        updatedBy: updatedBy ? new Types.ObjectId(updatedBy) : undefined,
      },
      { new: true }
    );
  }

  /**
   * Update subscription status
   */
  static async updateSubscriptionStatus(
    subscriptionId: string,
    status: UserStatus,
    updatedBy?: string
  ): Promise<ISubscription | null> {
    return await Subscription.findByIdAndUpdate(
      subscriptionId,
      {
        status,
        updatedBy: updatedBy ? new Types.ObjectId(updatedBy) : undefined,
      },
      { new: true }
    );
  }

  /**
   * Get subscription details with plan information
   */
  static async getSubscriptionDetails(
    tenantId: string
  ): Promise<{
    subscription: ISubscription | null;
    isActive: boolean;
    daysRemaining: number | null;
  } | null> {
    const subscription = await this.getActiveSubscription(tenantId);

    if (!subscription) {
      return null;
    }

    const now = new Date();
    const daysRemaining = Math.ceil(
      (subscription.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      subscription,
      isActive: true,
      daysRemaining,
    };
  }

  /**
   * Extend subscription end date
   */
  static async extendSubscription(
    subscriptionId: string,
    newEndDate: Date,
    updatedBy?: string
  ): Promise<ISubscription | null> {
    return await Subscription.findByIdAndUpdate(
      subscriptionId,
      {
        endDate: newEndDate,
        updatedBy: updatedBy ? new Types.ObjectId(updatedBy) : undefined,
      },
      { new: true }
    );
  }

  /**
   * Cancel subscription (soft delete by marking as deleted)
   */
  static async cancelSubscription(
    subscriptionId: string,
    updatedBy?: string
  ): Promise<ISubscription | null> {
    return await Subscription.findByIdAndUpdate(
      subscriptionId,
      {
        isDeleted: true,
        status: UserStatus.INACTIVE,
        updatedBy: updatedBy ? new Types.ObjectId(updatedBy) : undefined,
      },
      { new: true }
    );
  }
}
