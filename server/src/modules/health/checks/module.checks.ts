import mongoose, { Model, Types } from 'mongoose';
import {
  User,
  Tenant,
  Subscription,
  Restaurant,
  Outlet,
  Category,
  MenuItem,
  Variant,
  Addon,
  Inventory,
  Customer,
  Order,
  OrderItem,
  Payment,
  Notification,
  AuditLog,
  WebhookLog,
  SystemAdminInvite,
  SubscriptionPlan,
  SubscriptionUsage,
} from '../../../models/index.js';

export const makeModelChecker = (
  Model: Model<any>,
  modelName: string,
  sampleDocForDeepCheck?: any
) => {
  return async (deep = false): Promise<{ status: string; responseTimeMs: number; details?: string }> => {
    const start = Date.now();
    let insertedDocId: Types.ObjectId | null = null;
    try {
      if (deep && sampleDocForDeepCheck) {

        const doc = new Model({
          ...sampleDocForDeepCheck,
          __healthCheck: true,
        });
        await doc.save();
        insertedDocId = doc._id;

        await Model.deleteOne({ _id: insertedDocId });
        insertedDocId = null;
      } else {

        await Model.findOne().select('_id').lean();
      }

      const duration = Date.now() - start;
      return {
        status: 'ok',
        responseTimeMs: duration,
        details: deep && sampleDocForDeepCheck ? 'Read/Write check succeeded' : 'Read check succeeded',
      };
    } catch (error: any) {

      if (insertedDocId) {
        try {
          await Model.deleteOne({ _id: insertedDocId });
        } catch (cleanupErr) {
          console.error(`Failed to clean up health check doc in ${modelName}:`, cleanupErr);
        }
      }
      return {
        status: 'down',
        responseTimeMs: Date.now() - start,
        details: error.message || 'Check failed',
      };
    }
  };
};

const sampleTenantDoc = {
  name: 'Health Check Tenant',
  slug: `health-check-${Math.random().toString(36).substring(2, 10)}`,
  ownerId: new Types.ObjectId(),
};

const sampleCategoryDoc = {
  tenantId: new Types.ObjectId(),
  name: 'Health Check Category',
};

const sampleSubscriptionPlanDoc = {
  name: 'Health Check Plan',
  slug: `health-plan-${Math.random().toString(36).substring(2, 10)}`,
  monthlyPrice: 0,
  yearlyPrice: 0,
  features: {},
  limits: {},
};

export const modelCheckers = {
  tenant: makeModelChecker(Tenant, 'Tenant', sampleTenantDoc),
  category: makeModelChecker(Category, 'Category', sampleCategoryDoc),
  subscriptionPlan: makeModelChecker(SubscriptionPlan, 'SubscriptionPlan', sampleSubscriptionPlanDoc),

  user: makeModelChecker(User, 'User'),
  restaurant: makeModelChecker(Restaurant, 'Restaurant'),
  outlet: makeModelChecker(Outlet, 'Outlet'),
  menuItem: makeModelChecker(MenuItem, 'MenuItem'),
  variant: makeModelChecker(Variant, 'Variant'),
  addon: makeModelChecker(Addon, 'Addon'),
  inventory: makeModelChecker(Inventory, 'Inventory'),
  customer: makeModelChecker(Customer, 'Customer'),
  order: makeModelChecker(Order, 'Order'),
  orderItem: makeModelChecker(OrderItem, 'OrderItem'),
  payment: makeModelChecker(Payment, 'Payment'),
  notification: makeModelChecker(Notification, 'Notification'),
  auditLog: makeModelChecker(AuditLog, 'AuditLog'),
  webhookLog: makeModelChecker(WebhookLog, 'WebhookLog'),
  subscription: makeModelChecker(Subscription, 'Subscription'),
  subscriptionUsage: makeModelChecker(SubscriptionUsage, 'SubscriptionUsage'),
  systemAdminInvite: makeModelChecker(SystemAdminInvite, 'SystemAdminInvite'),
};
