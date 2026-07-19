/* ── Role hierarchy & display ── */
export const USER_ROLES = {
  SYSTEM_ADMIN: 'SYSTEM_ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
  RESTAURANT_OWNER: 'RESTAURANT_OWNER',
  OUTLET_MANAGER: 'OUTLET_MANAGER',
  STAFF: 'STAFF',
};

export const ROLE_LABELS = {
  SYSTEM_ADMIN: 'System Admin',
  SUPER_ADMIN: 'Super Admin',
  RESTAURANT_OWNER: 'Restaurant Owner',
  OUTLET_MANAGER: 'Outlet Manager',
  STAFF: 'Staff',
};

export const ROLE_BADGE_VARIANT = {
  SYSTEM_ADMIN: 'primary',
  SUPER_ADMIN: 'info',
  RESTAURANT_OWNER: 'success',
  OUTLET_MANAGER: 'warning',
  STAFF: 'neutral',
};

/* ── Order status ── */
export const ORDER_STATUS = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  PREPARING: 'PREPARING',
  READY: 'READY',
  PICKED_UP: 'PICKED_UP',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  SERVED: 'SERVED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

export const ORDER_STATUS_VARIANT = {
  PENDING: 'warning',
  ACCEPTED: 'info',
  PREPARING: 'info',
  READY: 'success',
  PICKED_UP: 'success',
  OUT_FOR_DELIVERY: 'info',
  DELIVERED: 'success',
  SERVED: 'success',
  COMPLETED: 'success',
  CANCELLED: 'danger',
};

export const ORDER_STATUS_LABELS = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  PREPARING: 'Preparing',
  READY: 'Ready',
  PICKED_UP: 'Picked Up',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  SERVED: 'Served',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

/* ── Payment ── */
export const PAYMENT_STATUS_VARIANT = {
  PENDING: 'warning',
  SUCCESS: 'success',
  FAILED: 'danger',
  REFUNDED: 'info',
};

export const PAYMENT_METHODS = ['CASH', 'CARD', 'UPI', 'WALLET', 'NET_BANKING', 'COD'];

/* ── Subscription ── */
export const SUBSCRIPTION_PLANS = ['FREE', 'PRO', 'SUPER'];

export const SUBSCRIPTION_STATUS_VARIANT = {
  ACTIVE: 'success',
  INACTIVE: 'neutral',
  CANCELLED: 'danger',
};

/* ── User status ── */
export const USER_STATUS_VARIANT = {
  ACTIVE: 'success',
  INACTIVE: 'neutral',
  BLOCKED: 'danger',
};

/* ── Notification types ── */
export const NOTIFICATION_TYPE_VARIANT = {
  ORDER_PLACED: 'info',
  ORDER_ACCEPTED: 'info',
  ORDER_PREPARING: 'warning',
  ORDER_READY: 'success',
  ORDER_DELIVERED: 'success',
  ORDER_CANCELLED: 'danger',
  PAYMENT_SUCCESS: 'success',
  PAYMENT_FAILED: 'danger',
  LOW_INVENTORY: 'warning',
  SYSTEM: 'neutral',
  GENERAL: 'neutral',
};

/* ── Order sources ── */
export const ORDER_SOURCES = ['DINE_IN', 'TAKEAWAY', 'DELIVERY', 'ONLINE'];
