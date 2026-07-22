import mongoose, { Types } from 'mongoose';
import Subscription, { ISubscription } from "../../models/subscription.model.js";
import { SubscriptionPlan, SubscriptionStatus } from "../../models/enums.js";

export class SubscriptionService {

  static async createSubscription(
    tenantId: string,
    plan: SubscriptionPlan,
    amount: number,
    startDate: Date,
    endDate: Date,
    createdBy?: string
  ): Promise<ISubscription> {
    const tenantObjectId = new Types.ObjectId(tenantId);
    const userObjectId = createdBy ? new Types.ObjectId(createdBy) : null;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {

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

  static async getCurrentSubscription(tenantId: string): Promise<ISubscription | null> {
    const now = new Date();

    return await Subscription.findOne({
      tenantId: new Types.ObjectId(tenantId),
      status: SubscriptionStatus.ACTIVE,
      startDate: { $lte: now },
      endDate: { $gte: now },
      isDeleted: false,
    });
  }

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

  static async getSubscriptionById(subscriptionId: string, tenantId: string): Promise<ISubscription | null> {
    return await Subscription.findOne({
      _id: new Types.ObjectId(subscriptionId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });
  }

  static async isSubscriptionActive(subscriptionId: string): Promise<boolean> {
    const subscription = await Subscription.findById(subscriptionId);

    if (!subscription) return false;

    const now = new Date();
    return (
      (subscription.status as string) === "ACTIVE" &&
      subscription.startDate <= now &&
      subscription.endDate >= now
    );
  }

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
