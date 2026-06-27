/**
 * Table Status State Machine
 * 14 production states covering the full dine-in lifecycle
 */
export enum TableStatus {
  AVAILABLE    = 'AVAILABLE',
  RESERVED     = 'RESERVED',
  OCCUPIED     = 'OCCUPIED',
  ORDERING     = 'ORDERING',
  PREPARING    = 'PREPARING',
  READY        = 'READY',
  SERVING      = 'SERVING',
  SERVED       = 'SERVED',
  BILL_REQUESTED  = 'BILL_REQUESTED',
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  CLEANING     = 'CLEANING',
  CLOSED       = 'CLOSED',
  BLOCKED      = 'BLOCKED',
  MAINTENANCE  = 'MAINTENANCE',
}

/**
 * Valid state transitions for the table status machine
 */
export const TABLE_STATE_TRANSITIONS: Record<TableStatus, TableStatus[]> = {
  [TableStatus.AVAILABLE]:       [TableStatus.RESERVED, TableStatus.OCCUPIED, TableStatus.BLOCKED, TableStatus.MAINTENANCE],
  [TableStatus.RESERVED]:        [TableStatus.OCCUPIED, TableStatus.AVAILABLE, TableStatus.BLOCKED],
  [TableStatus.OCCUPIED]:        [TableStatus.ORDERING, TableStatus.BILL_REQUESTED, TableStatus.BLOCKED],
  [TableStatus.ORDERING]:        [TableStatus.PREPARING, TableStatus.BILL_REQUESTED, TableStatus.OCCUPIED],
  [TableStatus.PREPARING]:       [TableStatus.READY, TableStatus.SERVING],
  [TableStatus.READY]:           [TableStatus.SERVING, TableStatus.SERVED],
  [TableStatus.SERVING]:         [TableStatus.SERVED, TableStatus.ORDERING],
  [TableStatus.SERVED]:          [TableStatus.BILL_REQUESTED, TableStatus.ORDERING],
  [TableStatus.BILL_REQUESTED]:  [TableStatus.PAYMENT_PENDING, TableStatus.SERVED],
  [TableStatus.PAYMENT_PENDING]: [TableStatus.CLOSED, TableStatus.BILL_REQUESTED],
  [TableStatus.CLOSED]:          [TableStatus.CLEANING, TableStatus.AVAILABLE],
  [TableStatus.CLEANING]:        [TableStatus.AVAILABLE],
  [TableStatus.BLOCKED]:         [TableStatus.AVAILABLE, TableStatus.MAINTENANCE],
  [TableStatus.MAINTENANCE]:     [TableStatus.AVAILABLE, TableStatus.BLOCKED],
};

/** Colors for floor map visualization */
export const TABLE_STATUS_COLORS: Record<TableStatus, string> = {
  [TableStatus.AVAILABLE]:       '#22c55e', // green-500
  [TableStatus.RESERVED]:        '#eab308', // yellow-500
  [TableStatus.OCCUPIED]:        '#ef4444', // red-500
  [TableStatus.ORDERING]:        '#f97316', // orange-500
  [TableStatus.PREPARING]:       '#8b5cf6', // violet-500
  [TableStatus.READY]:           '#06b6d4', // cyan-500
  [TableStatus.SERVING]:         '#3b82f6', // blue-500
  [TableStatus.SERVED]:          '#10b981', // emerald-500
  [TableStatus.BILL_REQUESTED]:  '#f59e0b', // amber-500
  [TableStatus.PAYMENT_PENDING]: '#ec4899', // pink-500
  [TableStatus.CLEANING]:        '#60a5fa', // blue-400
  [TableStatus.CLOSED]:          '#6b7280', // gray-500
  [TableStatus.BLOCKED]:         '#374151', // gray-700
  [TableStatus.MAINTENANCE]:     '#9ca3af', // gray-400
};

/** Section types */
export enum SectionType {
  INDOOR       = 'INDOOR',
  OUTDOOR      = 'OUTDOOR',
  VIP          = 'VIP',
  PRIVATE_ROOM = 'PRIVATE_ROOM',
  TERRACE      = 'TERRACE',
  BAR          = 'BAR',
  ROOFTOP      = 'ROOFTOP',
}

/** Table shapes */
export enum TableShape {
  ROUND     = 'ROUND',
  SQUARE    = 'SQUARE',
  RECTANGLE = 'RECTANGLE',
  OVAL      = 'OVAL',
}

/** Seat status */
export enum SeatStatus {
  EMPTY    = 'EMPTY',
  OCCUPIED = 'OCCUPIED',
  ORDERING = 'ORDERING',
  PAID     = 'PAID',
}

/** DineIn Session status */
export enum SessionStatus {
  ACTIVE   = 'ACTIVE',
  ORDERING = 'ORDERING',
  BILLED   = 'BILLED',
  CLOSED   = 'CLOSED',
  ABANDONED= 'ABANDONED',
}

/** DineIn Order status */
export enum DineInOrderStatus {
  DRAFT     = 'DRAFT',
  PLACED    = 'PLACED',
  CONFIRMED = 'CONFIRMED',
  PREPARING = 'PREPARING',
  READY     = 'READY',
  SERVED    = 'SERVED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

/** Kitchen Ticket status */
export enum KitchenTicketStatus {
  PENDING   = 'PENDING',
  ACCEPTED  = 'ACCEPTED',
  PREPARING = 'PREPARING',
  READY     = 'READY',
  SERVED    = 'SERVED',
  CANCELLED = 'CANCELLED',
}

/** Order item status */
export enum OrderItemStatus {
  PENDING   = 'PENDING',
  PREPARING = 'PREPARING',
  READY     = 'READY',
  SERVED    = 'SERVED',
  CANCELLED = 'CANCELLED',
}

/** Payment methods for dine-in */
export enum DineInPaymentMethod {
  CASH        = 'CASH',
  UPI         = 'UPI',
  CARD        = 'CARD',
  WALLET      = 'WALLET',
  ROOM_CHARGE = 'ROOM_CHARGE',
}

/** Split bill types */
export enum SplitType {
  NO_SPLIT    = 'NO_SPLIT',
  EQUAL_SPLIT = 'EQUAL_SPLIT',
  CUSTOM_SPLIT= 'CUSTOM_SPLIT',
  SEAT_WISE   = 'SEAT_WISE',
}

/** Waiter roles / tasks */
export enum WaiterTaskType {
  SERVE    = 'SERVE',
  BILL     = 'BILL',
  ASSIST   = 'ASSIST',
  CLEAN    = 'CLEAN',
  CHECKOUT = 'CHECKOUT',
}

/** Assistance request types */
export enum AssistanceType {
  WATER         = 'WATER',
  CALL_WAITER   = 'CALL_WAITER',
  TISSUE        = 'TISSUE',
  NEED_BILL     = 'NEED_BILL',
  NEED_MANAGER  = 'NEED_MANAGER',
  CUSTOM        = 'CUSTOM',
}

/** Reservation status */
export enum ReservationStatus {
  PENDING   = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  SEATED    = 'SEATED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW   = 'NO_SHOW',
  EXPIRED   = 'EXPIRED',
}

/** DineIn Payment status */
export enum DineInPaymentStatus {
  PENDING   = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED    = 'FAILED',
  REFUNDED  = 'REFUNDED',
}

/** DineIn User roles */
export enum DineInRole {
  SUPER_ADMIN      = 'SUPER_ADMIN',
  RESTAURANT_OWNER = 'RESTAURANT_OWNER',
  OUTLET_MANAGER   = 'OUTLET_MANAGER',
  WAITER           = 'WAITER',
  HOST             = 'HOST',
  KITCHEN_STAFF    = 'KITCHEN_STAFF',
  CASHIER          = 'CASHIER',
  CUSTOMER_GUEST   = 'CUSTOMER_GUEST',
}

/** QR Session status */
export enum QRSessionStatus {
  ACTIVE  = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CLOSED  = 'CLOSED',
}

/** Audit log actions */
export enum AuditAction {
  CREATE  = 'CREATE',
  UPDATE  = 'UPDATE',
  DELETE  = 'DELETE',
  ASSIGN  = 'ASSIGN',
  TRANSFER= 'TRANSFER',
  LOCK    = 'LOCK',
  UNLOCK  = 'UNLOCK',
  MERGE   = 'MERGE',
  SPLIT   = 'SPLIT',
  OPEN    = 'OPEN',
  CLOSE   = 'CLOSE',
  PAYMENT = 'PAYMENT',
}
