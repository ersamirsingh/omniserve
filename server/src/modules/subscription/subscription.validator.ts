import { z } from "zod";
import { BillingCycle, PaymentProvider } from "./subscription.enum.js";

export const featuresSchema = z.object({
  inventory: z.boolean().default(false),
  crm: z.boolean().default(false),
  analytics: z.boolean().default(false),
  finance: z.boolean().default(false),
  kitchenDisplay: z.boolean().default(false),
  waiterApp: z.boolean().default(false),
  qrOrdering: z.boolean().default(false),
  reports: z.boolean().default(false),
  apiAccess: z.boolean().default(false),
  whiteLabel: z.boolean().default(false),
});

export const limitsSchema = z.object({
  outlets: z.number().int().min(1).default(1),
  employees: z.number().int().min(1).default(5),
  monthlyOrders: z.number().int().min(0).default(100),
  menuItems: z.number().int().min(0).default(100),
  storageGB: z.number().min(0).default(1),
});

export const createPlanSchema = z.object({
  name: z.string().min(1, "Plan name is required"),
  slug: z.string().min(1, "Plan slug is required").toLowerCase(),
  description: z.string().default(""),
  monthlyPrice: z.number().nonnegative("Monthly price must be 0 or higher"),
  yearlyPrice: z.number().nonnegative("Yearly price must be 0 or higher"),
  currency: z.string().length(3).toUpperCase().default("INR"),
  trialDays: z.number().int().nonnegative().default(14),
  features: featuresSchema,
  limits: limitsSchema,
  isPopular: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const updatePlanSchema = createPlanSchema.partial();

export const subscribeSchema = z.object({
  planId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Mongo ObjectId"),
  billingCycle: z.nativeEnum(BillingCycle).default(BillingCycle.MONTHLY),
  paymentProvider: z.nativeEnum(PaymentProvider).default(PaymentProvider.MANUAL),
});

export const processPaymentSchema = z.object({
  paymentMethod: z.string().min(1, "Payment method is required"),
  paymentReference: z.string().min(1, "Payment reference is required"),
});
