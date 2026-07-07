import { Types } from "mongoose";
import {
  SubscriptionStatus,
  BillingCycle,
  PaymentProvider,
  InvoiceStatus
} from "./subscription.enum.js";

export interface ISubscriptionFeatures {
  inventory: boolean;
  crm: boolean;
  analytics: boolean;
  finance: boolean;
  kitchenDisplay: boolean;
  waiterApp: boolean;
  qrOrdering: boolean;
  reports: boolean;
  apiAccess: boolean;
  whiteLabel: boolean;
}

export interface ISubscriptionLimits {
  outlets: number;
  employees: number;
  monthlyOrders: number;
  menuItems: number;
  storageGB: number;
}

export interface ISubscriptionPlan {
  name: string;
  slug: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  trialDays: number;
  features: ISubscriptionFeatures;
  limits: ISubscriptionLimits;
  isPopular: boolean;
  isActive: boolean;
  isDeleted?: boolean;
}

export interface IRestaurantSubscription {
  tenantId: Types.ObjectId;
  restaurantId: Types.ObjectId;
  planId: Types.ObjectId;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  startDate: Date;
  endDate: Date;
  nextBillingDate: Date;
  cancelAtPeriodEnd: boolean;
  trialEndsAt: Date | null;
  graceEndsAt: Date | null;
  renewalEnabled: boolean;
  paymentProvider: PaymentProvider;
  paymentCustomerId?: string;
  paymentSubscriptionId?: string;
  invoiceIds: Types.ObjectId[];
  createdBy: Types.ObjectId | null;
  isDeleted?: boolean;
}

export interface IInvoice {
  tenantId: Types.ObjectId;
  subscriptionId: Types.ObjectId;
  invoiceNumber: string;
  amount: number;
  currency: string;
  tax: number;
  discount: number;
  total: number;
  status: InvoiceStatus;
  paymentMethod?: string;
  paymentReference?: string;
  invoiceUrl?: string;
  paidAt?: Date | null;
  isDeleted?: boolean;
}

export interface ISubscriptionUsage {
  tenantId: Types.ObjectId;
  month: number;
  year: number;
  ordersUsed: number;
  employeesUsed: number;
  outletsUsed: number;
  storageUsed: number;
  apiCalls: number;
}
