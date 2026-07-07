import { Types } from "mongoose";
import SubscriptionPlanModel, { ISubscriptionPlanDocument } from "../../models/subscriptionPlan.model.js";
import RestaurantSubscriptionModel, { IRestaurantSubscriptionDocument } from "../../models/subscription.model.js";
import InvoiceModel, { IInvoiceDocument } from "../../models/invoice.model.js";
import SubscriptionUsageModel, { ISubscriptionUsageDocument } from "../../models/subscriptionUsage.model.js";

export class SubscriptionRepository {
  // --- Plan Repositories ---
  static async findPlanById(planId: string | Types.ObjectId): Promise<ISubscriptionPlanDocument | null> {
    return await SubscriptionPlanModel.findOne({ _id: new Types.ObjectId(planId), isDeleted: false });
  }

  static async findPlanBySlug(slug: string): Promise<ISubscriptionPlanDocument | null> {
    return await SubscriptionPlanModel.findOne({ slug: slug.toLowerCase(), isDeleted: false });
  }

  static async listPlans(includeInactive = false): Promise<ISubscriptionPlanDocument[]> {
    const filter: any = { isDeleted: false };
    if (!includeInactive) {
      filter.isActive = true;
    }
    return await SubscriptionPlanModel.find(filter).sort({ monthlyPrice: 1 });
  }

  static async createPlan(data: Partial<ISubscriptionPlanDocument>): Promise<ISubscriptionPlanDocument> {
    const plan = new SubscriptionPlanModel(data);
    return await plan.save();
  }

  static async updatePlan(
    planId: string | Types.ObjectId,
    data: Partial<ISubscriptionPlanDocument>
  ): Promise<ISubscriptionPlanDocument | null> {
    return await SubscriptionPlanModel.findOneAndUpdate(
      { _id: new Types.ObjectId(planId), isDeleted: false },
      { $set: data },
      { new: true }
    );
  }

  static async deletePlan(planId: string | Types.ObjectId): Promise<ISubscriptionPlanDocument | null> {
    return await SubscriptionPlanModel.findOneAndUpdate(
      { _id: new Types.ObjectId(planId), isDeleted: false },
      { $set: { isDeleted: true } },
      { new: true }
    );
  }

  // --- Subscription Repositories ---
  static async findSubscriptionByTenant(
    tenantId: string | Types.ObjectId
  ): Promise<IRestaurantSubscriptionDocument | null> {
    return await RestaurantSubscriptionModel.findOne({
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    }).populate("planId");
  }

  static async findSubscriptionById(
    subId: string | Types.ObjectId
  ): Promise<IRestaurantSubscriptionDocument | null> {
    return await RestaurantSubscriptionModel.findOne({
      _id: new Types.ObjectId(subId),
      isDeleted: false,
    }).populate("planId");
  }

  static async createSubscription(
    data: Partial<IRestaurantSubscriptionDocument>
  ): Promise<IRestaurantSubscriptionDocument> {
    const subscription = new RestaurantSubscriptionModel(data);
    return await subscription.save();
  }

  static async updateSubscription(
    subId: string | Types.ObjectId,
    data: Partial<IRestaurantSubscriptionDocument>
  ): Promise<IRestaurantSubscriptionDocument | null> {
    return await RestaurantSubscriptionModel.findOneAndUpdate(
      { _id: new Types.ObjectId(subId), isDeleted: false },
      { $set: data },
      { new: true }
    ).populate("planId");
  }

  // --- Invoice Repositories ---
  static async findInvoiceById(invoiceId: string | Types.ObjectId): Promise<IInvoiceDocument | null> {
    return await InvoiceModel.findOne({ _id: new Types.ObjectId(invoiceId), isDeleted: false });
  }

  static async listInvoicesByTenant(
    tenantId: string | Types.ObjectId,
    limit = 20,
    skip = 0
  ): Promise<{ invoices: IInvoiceDocument[]; total: number }> {
    const filter = { tenantId: new Types.ObjectId(tenantId), isDeleted: false };
    const invoices = await InvoiceModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);
    const total = await InvoiceModel.countDocuments(filter);
    return { invoices, total };
  }

  static async listAllInvoices(
    limit = 20,
    skip = 0
  ): Promise<{ invoices: IInvoiceDocument[]; total: number }> {
    const filter = { isDeleted: false };
    const invoices = await InvoiceModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);
    const total = await InvoiceModel.countDocuments(filter);
    return { invoices, total };
  }

  static async createInvoice(data: Partial<IInvoiceDocument>): Promise<IInvoiceDocument> {
    const invoice = new InvoiceModel(data);
    return await invoice.save();
  }

  static async updateInvoice(
    invoiceId: string | Types.ObjectId,
    data: Partial<IInvoiceDocument>
  ): Promise<IInvoiceDocument | null> {
    return await InvoiceModel.findOneAndUpdate(
      { _id: new Types.ObjectId(invoiceId), isDeleted: false },
      { $set: data },
      { new: true }
    );
  }

  // --- Usage Repositories ---
  static async findUsage(
    tenantId: string | Types.ObjectId,
    month: number,
    year: number
  ): Promise<ISubscriptionUsageDocument | null> {
    return await SubscriptionUsageModel.findOne({
      tenantId: new Types.ObjectId(tenantId),
      month,
      year,
    });
  }

  static async incrementUsage(
    tenantId: string | Types.ObjectId,
    month: number,
    year: number,
    increments: {
      ordersUsed?: number;
      employeesUsed?: number;
      outletsUsed?: number;
      storageUsed?: number;
      apiCalls?: number;
    }
  ): Promise<ISubscriptionUsageDocument> {
    const updateObj: any = {};
    for (const [key, val] of Object.entries(increments)) {
      if (val !== undefined) {
        updateObj[key] = val;
      }
    }

    return (await SubscriptionUsageModel.findOneAndUpdate(
      {
        tenantId: new Types.ObjectId(tenantId),
        month,
        year,
      },
      {
        $inc: updateObj,
      },
      {
        upsert: true,
        new: true,
      }
    ))!;
  }

  static async listSubscriptions(
    filter: any = {},
    limit = 50,
    skip = 0
  ): Promise<{ subscriptions: IRestaurantSubscriptionDocument[]; total: number }> {
    const query = { ...filter, isDeleted: false };
    const subscriptions = await RestaurantSubscriptionModel.find(query)
      .populate("planId")
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);
    const total = await RestaurantSubscriptionModel.countDocuments(query);
    return { subscriptions, total };
  }
}
