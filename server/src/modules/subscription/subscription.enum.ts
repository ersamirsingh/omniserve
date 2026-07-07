export enum SubscriptionPlanSlug {
  FREE = "free",
  PRO = "pro",
  SUPER = "super",
}

export enum SubscriptionStatus {
  ACTIVE = "ACTIVE",
  TRIAL = "TRIAL",
  EXPIRED = "EXPIRED",
  CANCELLED = "CANCELLED",
  GRACE_PERIOD = "GRACE_PERIOD",
  PENDING_PAYMENT = "PENDING_PAYMENT",
}

export enum BillingCycle {
  MONTHLY = "MONTHLY",
  YEARLY = "YEARLY",
}

export enum PaymentProvider {
  STRIPE = "stripe",
  RAZORPAY = "razorpay",
  MANUAL = "manual",
}

export enum InvoiceStatus {
  PENDING = "PENDING",
  PAID = "PAID",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
}
