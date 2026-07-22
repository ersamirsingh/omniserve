import { Types } from "mongoose";
import { SubscriptionRepository } from "./subscription.repository.js";
import {
  SubscriptionStatus,
  BillingCycle,
  PaymentProvider,
  InvoiceStatus,
  SubscriptionPlanSlug
} from "./subscription.enum.js";
import { StripeGateway } from "../payment/gateways/stripe.gateway.js";
import { RazorpayGateway } from "../payment/gateways/razorpay.gateway.js";
import { ManualGateway } from "../payment/gateways/manual.gateway.js";
import { PaymentGateway } from "../payment/payment-gateway.interface.js";
import RestaurantSubscriptionModel, { IRestaurantSubscriptionDocument } from "../../models/subscription.model.js";
import SubscriptionPlanModel, { ISubscriptionPlanDocument } from "../../models/subscriptionPlan.model.js";
import Restaurant from "../../models/restaurant.model.js";
import { CouponService } from "../coupon/coupon.service.js";

export class SubscriptionService {
  private static getGateway(provider: PaymentProvider): PaymentGateway {
    switch (provider) {
      case PaymentProvider.STRIPE:
        return new StripeGateway();
      case PaymentProvider.RAZORPAY:
        return new RazorpayGateway();
      case PaymentProvider.MANUAL:
      default:
        return new ManualGateway();
    }
  }

  static async seedDefaultPlans(): Promise<void> {
    const defaultPlans = [
      {
        name: "Free Trial Plan",
        slug: SubscriptionPlanSlug.FREE,
        description: "1 Outlet, 5 Employees, 100 Orders/mo, QR ordering, basic support.",
        monthlyPrice: 0,
        yearlyPrice: 0,
        currency: "INR",
        trialDays: 14,
        features: {
          inventory: false,
          crm: false,
          analytics: false,
          finance: false,
          kitchenDisplay: false,
          waiterApp: false,
          qrOrdering: true,
          reports: false,
          apiAccess: false,
          whiteLabel: false,
        },
        limits: {
          outlets: 1,
          employees: 5,
          monthlyOrders: 100,
          menuItems: 100,
          storageGB: 1,
        },
        isPopular: false,
      },
      {
        name: "Pro Plan",
        slug: SubscriptionPlanSlug.PRO,
        description: "2 Outlets, 15 Employees, Unlimited QR Orders, CRM, Analytics, Inventory, KDS.",
        monthlyPrice: 999,
        yearlyPrice: 9990,
        currency: "INR",
        trialDays: 0,
        features: {
          inventory: true,
          crm: true,
          analytics: true,
          finance: false,
          kitchenDisplay: true,
          waiterApp: true,
          qrOrdering: true,
          reports: false,
          apiAccess: false,
          whiteLabel: false,
        },
        limits: {
          outlets: 2,
          employees: 15,
          monthlyOrders: 1000000,
          menuItems: 500,
          storageGB: 5,
        },
        isPopular: true,
      },
      {
        name: "Super Plan",
        slug: SubscriptionPlanSlug.SUPER,
        description: "105 Outlets, Unlimited Employees/Orders, Dedicated Account Manager, API Access, White-Label.",
        monthlyPrice: 2999,
        yearlyPrice: 29990,
        currency: "INR",
        trialDays: 0,
        features: {
          inventory: true,
          crm: true,
          analytics: true,
          finance: true,
          kitchenDisplay: true,
          waiterApp: true,
          qrOrdering: true,
          reports: true,
          apiAccess: true,
          whiteLabel: true,
        },
        limits: {
          outlets: 105,
          employees: 10000,
          monthlyOrders: 10000000,
          menuItems: 10000,
          storageGB: 100,
        },
        isPopular: false,
      },
    ];

    for (const planData of defaultPlans) {
      const existing = await SubscriptionPlanModel.collection.findOne({ slug: planData.slug });
      if (!existing) {
        await SubscriptionRepository.createPlan(planData as any);
      } else {
        await SubscriptionPlanModel.updateOne(
          { _id: existing._id },
          { $set: { ...planData, isDeleted: false, isActive: true } }
        );
      }
    }
  }

  static async onboardTenant(
    tenantId: string | Types.ObjectId,
    restaurantId: string | Types.ObjectId,
    createdByUserId?: string | Types.ObjectId
  ): Promise<IRestaurantSubscriptionDocument> {
    await this.seedDefaultPlans();

    const freePlan = await SubscriptionRepository.findPlanBySlug(SubscriptionPlanSlug.FREE);
    if (!freePlan) {
      throw new Error("Default Free Plan not configured in database.");
    }

    const startDate = new Date();
    const trialDays = freePlan.trialDays || 14;
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + trialDays);

    const subscription = await SubscriptionRepository.createSubscription({
      tenantId: new Types.ObjectId(tenantId),
      restaurantId: new Types.ObjectId(restaurantId),
      planId: freePlan._id as Types.ObjectId,
      status: SubscriptionStatus.TRIAL,
      billingCycle: BillingCycle.MONTHLY,
      startDate,
      endDate,
      nextBillingDate: endDate,
      cancelAtPeriodEnd: false,
      trialEndsAt: endDate,
      graceEndsAt: null,
      renewalEnabled: true,
      paymentProvider: PaymentProvider.MANUAL,
      createdBy: createdByUserId ? new Types.ObjectId(createdByUserId) : null,
    });

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    await SubscriptionRepository.incrementUsage(tenantId, currentMonth, currentYear, {
      ordersUsed: 0,
      employeesUsed: 0,
      outletsUsed: 0,
      storageUsed: 0,
      apiCalls: 0,
    });

    await SubscriptionRepository.createInvoice({
      tenantId: new Types.ObjectId(tenantId),
      subscriptionId: subscription._id as Types.ObjectId,
      invoiceNumber: `INV-TRIAL-${Date.now()}`,
      amount: 0,
      currency: "INR",
      tax: 0,
      discount: 0,
      total: 0,
      status: InvoiceStatus.PAID,
      paymentMethod: "MOCK",
      paymentReference: "TRIAL",
      paidAt: startDate,
    });

    return subscription;
  }

  static async getOrCreateSubscription(
    tenantId: string | Types.ObjectId,
    userId?: string | Types.ObjectId
  ): Promise<IRestaurantSubscriptionDocument> {
    let subscription = await SubscriptionRepository.findSubscriptionByTenant(tenantId);
    if (!subscription) {
      const restaurant = await Restaurant.findOne({ tenantId: new Types.ObjectId(tenantId) });
      const restaurantId = restaurant ? restaurant._id : new Types.ObjectId();
      subscription = await this.onboardTenant(tenantId, restaurantId, userId);
    }
    return subscription;
  }

  static async changeSubscriptionPlan(
    tenantId: string | Types.ObjectId,
    planId: string | Types.ObjectId,
    billingCycle: BillingCycle,
    provider: PaymentProvider,
    couponCode?: string,
    userId?: string | Types.ObjectId,
    outletId?: string | Types.ObjectId
  ): Promise<IRestaurantSubscriptionDocument> {
    const subscription = await this.getOrCreateSubscription(tenantId, userId);

    const newPlan = await SubscriptionRepository.findPlanById(planId);
    if (!newPlan) {
      throw new Error("Plan not found");
    }

    const gateway = this.getGateway(provider);

    let paymentCustomerId = subscription.paymentCustomerId;
    if (!paymentCustomerId) {
      paymentCustomerId = await gateway.createCustomer(
        tenantId.toString(),
        `billing@tenant-${tenantId}.com`,
        `Tenant ${tenantId}`
      );
    }

    const amount = billingCycle === BillingCycle.MONTHLY ? newPlan.monthlyPrice : newPlan.yearlyPrice;
    let discount = 0;
    if (couponCode) {
      const validation = await CouponService.validateSubscriptionCoupon(couponCode, amount, tenantId.toString());
      if (!validation.isValid) {
        throw new Error(validation.reason || "Invalid coupon code");
      }
      discount = validation.discount;
    }
    const amountAfterDiscount = Math.max(0, amount - discount);
    const tax = Number((amountAfterDiscount * 0.18).toFixed(2));
    const total = Number((amountAfterDiscount + tax).toFixed(2));

    const { paymentSubscriptionId, invoiceUrl } = await gateway.createSubscription(
      tenantId.toString(),
      paymentCustomerId,
      newPlan._id.toString(),
      total,
      billingCycle
    );

    if (subscription.paymentSubscriptionId && subscription.paymentProvider !== PaymentProvider.MANUAL) {
      try {
        const oldGateway = this.getGateway(subscription.paymentProvider);
        await oldGateway.cancelSubscription(subscription.paymentSubscriptionId);
      } catch (err) {
        console.error("Failed to cancel old subscription in gateway:", err);
      }
    }

    const startDate = new Date();
    const endDate = new Date();
    if (billingCycle === BillingCycle.MONTHLY) {
      endDate.setMonth(startDate.getMonth() + 1);
    } else {
      endDate.setFullYear(startDate.getFullYear() + 1);
    }

    const updated = await SubscriptionRepository.updateSubscription(subscription._id, {
      planId: newPlan._id as Types.ObjectId,
      outletId: outletId ? new Types.ObjectId(outletId) : (subscription.outletId ?? null),
      status: SubscriptionStatus.ACTIVE,
      billingCycle,
      startDate,
      endDate,
      nextBillingDate: endDate,
      cancelAtPeriodEnd: false,
      trialEndsAt: null,
      graceEndsAt: null,
      renewalEnabled: true,
      paymentProvider: provider,
      paymentCustomerId,
      paymentSubscriptionId,
      createdBy: userId ? new Types.ObjectId(userId) : subscription.createdBy,
    });

    if (couponCode) {
      await CouponService.redeemSubscriptionCoupon(couponCode, tenantId.toString());
    }

    const invoiceObj: any = {
      tenantId: subscription.tenantId,
      subscriptionId: subscription._id as Types.ObjectId,
      invoiceNumber: `INV-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      amount,
      currency: newPlan.currency,
      tax,
      discount,
      total,
      status: InvoiceStatus.PAID,
      paymentMethod: provider.toUpperCase(),
      paymentReference: paymentSubscriptionId,
      paidAt: new Date(),
    };
    if (invoiceUrl) {
      invoiceObj.invoiceUrl = invoiceUrl;
    }
    const invoice = await SubscriptionRepository.createInvoice(invoiceObj);

    await RestaurantSubscriptionModel.findByIdAndUpdate(subscription._id, {
      $push: { invoiceIds: invoice._id },
    });

    return updated!;
  }

  static async cancelSubscription(tenantId: string | Types.ObjectId): Promise<IRestaurantSubscriptionDocument> {
    const subscription = await this.getOrCreateSubscription(tenantId);

    if (subscription.paymentSubscriptionId && subscription.paymentProvider !== PaymentProvider.MANUAL) {
      const gateway = this.getGateway(subscription.paymentProvider);
      await gateway.cancelSubscription(subscription.paymentSubscriptionId);
    }

    const updated = await SubscriptionRepository.updateSubscription(subscription._id, {
      cancelAtPeriodEnd: true,
      renewalEnabled: false,
    });

    return updated!;
  }

  static async resumeSubscription(tenantId: string | Types.ObjectId): Promise<IRestaurantSubscriptionDocument> {
    const subscription = await this.getOrCreateSubscription(tenantId);

    const updated = await SubscriptionRepository.updateSubscription(subscription._id, {
      cancelAtPeriodEnd: false,
      renewalEnabled: true,
    });

    return updated!;
  }

  static async renewSubscription(
    tenantId: string | Types.ObjectId,
    couponCode?: string,
    userId?: string | Types.ObjectId
  ): Promise<IRestaurantSubscriptionDocument> {
    const subscription = await this.getOrCreateSubscription(tenantId, userId);

    const plan = await SubscriptionRepository.findPlanById(subscription.planId);
    if (!plan) throw new Error("Associated plan not found");

    const startDate = new Date();
    const endDate = new Date();
    if (subscription.billingCycle === BillingCycle.MONTHLY) {
      endDate.setMonth(startDate.getMonth() + 1);
    } else {
      endDate.setFullYear(startDate.getFullYear() + 1);
    }

    const amount = subscription.billingCycle === BillingCycle.MONTHLY ? plan.monthlyPrice : plan.yearlyPrice;
    let discount = 0;
    if (couponCode) {
      const validation = await CouponService.validateSubscriptionCoupon(couponCode, amount, tenantId.toString());
      if (!validation.isValid) {
        throw new Error(validation.reason || "Invalid coupon code");
      }
      discount = validation.discount;
    }
    const amountAfterDiscount = Math.max(0, amount - discount);
    const tax = Number((amountAfterDiscount * 0.18).toFixed(2));
    const total = Number((amountAfterDiscount + tax).toFixed(2));

    const updated = await SubscriptionRepository.updateSubscription(subscription._id, {
      status: SubscriptionStatus.ACTIVE,
      startDate,
      endDate,
      nextBillingDate: endDate,
      trialEndsAt: null,
      graceEndsAt: null,
    });

    if (couponCode) {
      await CouponService.redeemSubscriptionCoupon(couponCode, tenantId.toString());
    }

    const invoice = await SubscriptionRepository.createInvoice({
      tenantId: subscription.tenantId,
      subscriptionId: subscription._id as Types.ObjectId,
      invoiceNumber: `INV-REN-${Date.now()}`,
      amount,
      currency: plan.currency,
      tax,
      discount,
      total,
      status: InvoiceStatus.PAID,
      paymentMethod: subscription.paymentProvider.toUpperCase(),
      paymentReference: `REN-${Date.now()}`,
      paidAt: new Date(),
    });

    await RestaurantSubscriptionModel.findByIdAndUpdate(subscription._id, {
      $push: { invoiceIds: invoice._id },
    });

    return updated!;
  }

  static async processDailyExpirationChecks(): Promise<void> {
    const now = new Date();

    const expiredActive = await RestaurantSubscriptionModel.find({
      status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] },
      endDate: { $lt: now },
      isDeleted: false,
    });

    for (const sub of expiredActive) {
      const gracePeriodDays = 7;
      const graceEndsAt = new Date();
      graceEndsAt.setDate(now.getDate() + gracePeriodDays);

      await SubscriptionRepository.updateSubscription(sub._id, {
        status: SubscriptionStatus.GRACE_PERIOD,
        graceEndsAt,
      });

    }

    const expiredGrace = await RestaurantSubscriptionModel.find({
      status: SubscriptionStatus.GRACE_PERIOD,
      graceEndsAt: { $lt: now },
      isDeleted: false,
    });

    for (const sub of expiredGrace) {
      await SubscriptionRepository.updateSubscription(sub._id, {
        status: SubscriptionStatus.EXPIRED,
      });

    }
  }

  static async processMonthlyUsageResets(): Promise<void> {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const activeSubs = await RestaurantSubscriptionModel.find({
      status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL, SubscriptionStatus.GRACE_PERIOD] },
      isDeleted: false,
    });

    for (const sub of activeSubs) {
      await SubscriptionRepository.incrementUsage(sub.tenantId, currentMonth, currentYear, {
        ordersUsed: 0,
        employeesUsed: 0,
        outletsUsed: 0,
        storageUsed: 0,
        apiCalls: 0,
      });
    }

  }
}
