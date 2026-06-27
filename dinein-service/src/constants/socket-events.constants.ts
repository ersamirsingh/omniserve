/**
 * DineIn Socket.io Event Names
 * All events emitted and received over WebSocket connections
 */
export const SOCKET_EVENTS = {
  // Table events
  TABLE_CREATED:        'table.created',
  TABLE_UPDATED:        'table.updated',
  TABLE_DELETED:        'table.deleted',
  TABLE_LOCKED:         'table.locked',
  TABLE_UNLOCKED:       'table.unlocked',
  TABLE_STATUS_CHANGED: 'table.status.changed',
  TABLE_MOVED:          'table.moved',
  TABLES_MERGED:        'tables.merged',
  TABLES_SPLIT:         'tables.split',

  // Session events
  SESSION_STARTED:      'session.started',
  SESSION_CLOSED:       'session.closed',
  SESSION_UPDATED:      'session.updated',

  // Customer / Guest events
  CUSTOMER_JOINED:      'customer.joined',
  CUSTOMER_LEFT:        'customer.left',
  SEAT_UPDATED:         'seat.updated',

  // Waiter events
  WAITER_ASSIGNED:      'waiter.assigned',
  WAITER_TRANSFERRED:   'waiter.transferred',
  WAITER_QUEUED:        'waiter.queued',

  // Order events
  ORDER_CREATED:        'order.created',
  ORDER_UPDATED:        'order.updated',
  ORDER_CANCELLED:      'order.cancelled',
  ORDER_SERVED:         'order.served',
  ORDER_COMPLETED:      'order.completed',

  // Kitchen / Item events
  ITEM_PREPARING:       'item.preparing',
  ITEM_READY:           'item.ready',
  ITEM_SERVED:          'item.served',
  KITCHEN_TICKET_CREATED: 'kitchen.ticket.created',
  KITCHEN_TICKET_UPDATED: 'kitchen.ticket.updated',

  // Billing & Payment events
  BILL_REQUESTED:       'bill.requested',
  BILL_GENERATED:       'bill.generated',
  PAYMENT_INITIATED:    'payment.initiated',
  PAYMENT_COMPLETED:    'payment.completed',
  PAYMENT_FAILED:       'payment.failed',
  SPLIT_PAYMENT_UPDATED:'split.payment.updated',

  // Assistance events
  ASSISTANCE_REQUESTED: 'assistance.requested',
  ASSISTANCE_RESOLVED:  'assistance.resolved',

  // Notification events
  NOTIFICATION_CREATED: 'notification.created',

  // Reservation events
  RESERVATION_CREATED:  'reservation.created',
  RESERVATION_UPDATED:  'reservation.updated',
  RESERVATION_EXPIRED:  'reservation.expired',

  // Floor events
  FLOOR_UPDATED:        'floor.updated',
  SECTION_UPDATED:      'section.updated',

  // System
  ERROR:                'error',
  CONNECT:              'connect',
  DISCONNECT:           'disconnect',
  JOIN_OUTLET:          'join.outlet',
  JOIN_TABLE:           'join.table',
  JOIN_SESSION:         'join.session',
  LEAVE_TABLE:          'leave.table',
} as const;

export type SocketEvent = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];

/**
 * Socket.io Room naming conventions
 */
export const SOCKET_ROOMS = {
  outlet:  (outletId: string) => `outlet:${outletId}`,
  table:   (tableId: string)  => `table:${tableId}`,
  session: (sessionId: string)=> `session:${sessionId}`,
  waiter:  (waiterId: string) => `waiter:${waiterId}`,
  kitchen: (outletId: string) => `kitchen:${outletId}`,
  floor:   (floorId: string)  => `floor:${floorId}`,
};
