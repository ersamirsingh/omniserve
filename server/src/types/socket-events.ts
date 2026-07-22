export enum RealtimeEvent {
  TABLE_OCCUPIED = "TABLE_OCCUPIED",
  TABLE_AVAILABLE = "TABLE_AVAILABLE",
  TABLE_RESERVED = "TABLE_RESERVED",
  TABLE_STATUS_CHANGED = "TABLE_STATUS_CHANGED",
  TABLE_TRANSFERRED = "TABLE_TRANSFERRED",
  TABLE_MERGED = "TABLE_MERGED",
  TABLE_UNMERGED = "TABLE_UNMERGED",
  TABLE_CLEANING_STARTED = "TABLE_CLEANING_STARTED",
  TABLE_CLEANING_COMPLETED = "TABLE_CLEANING_COMPLETED",
  DINING_AREA_CREATED = "DINING_AREA_CREATED",
  DINING_AREA_UPDATED = "DINING_AREA_UPDATED",
  DINING_AREA_ARCHIVED = "DINING_AREA_ARCHIVED",

  WAITER_TASK_CREATED = "WAITER_TASK_CREATED",
  WAITER_TASK_ASSIGNED = "WAITER_TASK_ASSIGNED",
  WAITER_TASK_ACKNOWLEDGED = "WAITER_TASK_ACKNOWLEDGED",
  WAITER_TASK_IN_PROGRESS = "WAITER_TASK_IN_PROGRESS",
  WAITER_TASK_COMPLETED = "WAITER_TASK_COMPLETED",
  WAITER_TASK_CANCELLED = "WAITER_TASK_CANCELLED",
  WAITER_TASK_ESCALATED = "WAITER_TASK_ESCALATED",

  ITEM_FIRE_REQUESTED = "ITEM_FIRE_REQUESTED",
  ORDER_CREATED = "ORDER_CREATED",
  ORDER_STATUS_CHANGED = "ORDER_STATUS_CHANGED",

  QR_ASSISTANCE_REQUESTED = "QR_ASSISTANCE_REQUESTED",

  CART_CREATED = "CART_CREATED",
  CART_UPDATED = "CART_UPDATED",
  CHECKOUT_STARTED = "CHECKOUT_STARTED",
  INVENTORY_CHANGED = "INVENTORY_CHANGED",
  MENU_CHANGED = "MENU_CHANGED",

  SEAT_MOVED = "SEAT_MOVED",
  SEAT_SWAPPED = "SEAT_SWAPPED",
  WAITER_CHANGED = "WAITER_CHANGED",
  SESSION_CLOSED = "SESSION_CLOSED",
  SEAT_ADDED = "SEAT_ADDED",
  SEAT_REMOVED = "SEAT_REMOVED",
  GUEST_COUNT_CHANGED = "GUEST_COUNT_CHANGED",

  ITEM_FIRED = "ITEM_FIRED",
  ITEM_HELD = "ITEM_HELD",
  COURSE_FIRED = "COURSE_FIRED",

  BILL_REQUESTED = "BILL_REQUESTED",
  BILL_SPLIT_CREATED = "BILL_SPLIT_CREATED",
  BILL_SETTLED = "BILL_SETTLED",

  RESERVATION_CONFIRMED = "RESERVATION_CONFIRMED",
  RESERVATION_SEATED = "RESERVATION_SEATED",
  RESERVATION_CANCELLED = "RESERVATION_CANCELLED",

  OUTLET_STATUS_CHANGED = "OUTLET_STATUS_CHANGED"
}

export interface ITableStatusPayload {
  tableId: string;
  tableNumber: string;
  status: string;
  updatedAt: Date;
}

export interface ITableTransferredPayload {
  fromTableId: string;
  toTableId: string;
  sessionId: string;
}

export interface ITableMergedPayload {
  primaryTableId: string;
  secondaryTableIds: string[];
  sessionId: string;
}

export interface IWaiterTaskPayload {
  taskId: string;
  taskType: string;
  priority: string;
  tableId: string;
  sessionId: string;
  createdAt: Date;
}

export interface IWaiterTaskAckPayload {
  taskId: string;
  waiterId: string;
  acknowledgedAt: Date;
}

export interface IWaiterTaskCompletePayload {
  taskId: string;
  completedAt: Date;
  durationMs: number;
}

export interface IItemFirePayload {
  orderId: string;
  itemId: string;
  course: string;
  firedAt: Date;
}

export interface IOrderPayload {
  orderId: string;
  orderNumber: string;
  status: string;
  sessionId?: string;
  totalAmount: number;
}

export interface IAssistancePayload {
  tenantId: string;
  outletId: string;
  tableId: string;
  sessionId: string;
  assistanceType: string;
  seatNumber?: string | null;
  createdAt: Date;
}

export interface IWaiterTaskEscalatedPayload {
  taskId: string;
  taskType: string;
  escalatedAt: Date;
  priority: string;
  tableId: string;
  sessionId: string;
}

export interface IWaiterTaskAssignPayload {
  taskId: string;
  waiterId: string;
  assignedAt: Date;
}

export interface IWaiterTaskInProgressPayload {
  taskId: string;
  inProgressAt: Date;
}

export interface IWaiterTaskCancelPayload {
  taskId: string;
  cancelledAt: Date;
  reason?: string;
}

export interface IItemFiredPayload {
  itemId: string;
  orderId: string;
  sessionId?: string;
  tableId?: string;
  itemName: string;
  course: string;
  kdsStation?: string | null;
  firedAt: Date;
  firedBy?: string;
}

export interface IItemHeldPayload {
  itemId: string;
  orderId: string;
  sessionId?: string;
  tableId?: string;
  itemName: string;
  course: string;
  heldBy?: string;
}

export interface ICourseFiredPayload {
  orderId: string;
  sessionId?: string;
  tableId?: string;
  course: string;
  itemIds: string[];
  firedAt: Date;
  firedBy?: string;
}
