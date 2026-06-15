export const UserRole = {
  SUPER_ADMIN: "SUPER_ADMIN",
  RESTAURANT_OWNER: "RESTAURANT_OWNER",
  OUTLET_MANAGER: "OUTLET_MANAGER",
  STAFF: "STAFF",
};

export const UserStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  BLOCKED: "BLOCKED",
};

export const OrderStatus = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  PREPARING: "PREPARING",
  READY: "READY",
  PICKED_UP: "PICKED_UP",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
};

export const PaymentStatus = {
  PENDING: "PENDING",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
};

export const SubscriptionPlan = {
  FREE: "FREE",
  STARTER: "STARTER",
  PRO: "PRO",
  ENTERPRISE: "ENTERPRISE",
};

export const SubscriptionStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  CANCELLED: "CANCELLED",
};

export const OrderSource = {
  DINE_IN: "DINE_IN",
  TAKEAWAY: "TAKEAWAY",
  DELIVERY: "DELIVERY",
  ONLINE: "ONLINE",
};

export const POLLING_INTERVALS = {
  ORDERS: 15000,       // 15 seconds
  NOTIFICATIONS: 30000, // 30 seconds
};

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
