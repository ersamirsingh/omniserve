/**
 * DineIn Domain Event Types
 * Used for internal event bus / outbox pattern
 */
export const DINEIN_EVENTS = {
  // Table events
  TABLE_CREATED:          'DINEIN.TABLE.CREATED',
  TABLE_UPDATED:          'DINEIN.TABLE.UPDATED',
  TABLE_STATUS_CHANGED:   'DINEIN.TABLE.STATUS_CHANGED',
  TABLE_MERGED:           'DINEIN.TABLE.MERGED',
  TABLE_SPLIT:            'DINEIN.TABLE.SPLIT',
  TABLE_LOCKED:           'DINEIN.TABLE.LOCKED',
  TABLE_UNLOCKED:         'DINEIN.TABLE.UNLOCKED',

  // Session events
  SESSION_OPENED:         'DINEIN.SESSION.OPENED',
  SESSION_CLOSED:         'DINEIN.SESSION.CLOSED',
  SESSION_ABANDONED:      'DINEIN.SESSION.ABANDONED',

  // Guest events
  GUEST_JOINED:           'DINEIN.GUEST.JOINED',
  GUEST_LEFT:             'DINEIN.GUEST.LEFT',

  // Order events
  ORDER_CREATED:          'DINEIN.ORDER.CREATED',
  ORDER_PLACED:           'DINEIN.ORDER.PLACED',
  ORDER_CONFIRMED:        'DINEIN.ORDER.CONFIRMED',
  ORDER_ITEM_PREPARING:   'DINEIN.ORDER.ITEM_PREPARING',
  ORDER_ITEM_READY:       'DINEIN.ORDER.ITEM_READY',
  ORDER_SERVED:           'DINEIN.ORDER.SERVED',
  ORDER_COMPLETED:        'DINEIN.ORDER.COMPLETED',
  ORDER_CANCELLED:        'DINEIN.ORDER.CANCELLED',

  // Kitchen events
  KOT_CREATED:            'DINEIN.KOT.CREATED',
  KOT_ACCEPTED:           'DINEIN.KOT.ACCEPTED',
  KOT_READY:              'DINEIN.KOT.READY',
  KOT_CANCELLED:          'DINEIN.KOT.CANCELLED',

  // Billing events
  BILL_GENERATED:         'DINEIN.BILL.GENERATED',
  BILL_SPLIT:             'DINEIN.BILL.SPLIT',

  // Payment events
  PAYMENT_INITIATED:      'DINEIN.PAYMENT.INITIATED',
  PAYMENT_COMPLETED:      'DINEIN.PAYMENT.COMPLETED',
  PAYMENT_FAILED:         'DINEIN.PAYMENT.FAILED',

  // Assistance events
  ASSISTANCE_REQUESTED:   'DINEIN.ASSISTANCE.REQUESTED',
  ASSISTANCE_RESOLVED:    'DINEIN.ASSISTANCE.RESOLVED',

  // Reservation events
  RESERVATION_CREATED:    'DINEIN.RESERVATION.CREATED',
  RESERVATION_CONFIRMED:  'DINEIN.RESERVATION.CONFIRMED',
  RESERVATION_EXPIRED:    'DINEIN.RESERVATION.EXPIRED',
  RESERVATION_CANCELLED:  'DINEIN.RESERVATION.CANCELLED',
  RESERVATION_NO_SHOW:    'DINEIN.RESERVATION.NO_SHOW',

  // Waiter events
  WAITER_ASSIGNED:        'DINEIN.WAITER.ASSIGNED',
  WAITER_TRANSFERRED:     'DINEIN.WAITER.TRANSFERRED',
} as const;

export type DineInEvent = typeof DINEIN_EVENTS[keyof typeof DINEIN_EVENTS];

/**
 * Redis cache key prefixes
 */
export const CACHE_KEYS = {
  floorState:   (outletId: string) => `dinein:floor:${outletId}`,
  tableState:   (tableId: string)  => `dinein:table:${tableId}`,
  sessionState: (sessionId: string)=> `dinein:session:${sessionId}`,
  waiterQueue:  (outletId: string) => `dinein:waiter:queue:${outletId}`,
  menuCache:    (outletId: string) => `dinein:menu:${outletId}`,
  qrSession:    (token: string)    => `dinein:qr:${token}`,
  analyticsDay: (outletId: string, date: string) => `dinein:analytics:${outletId}:${date}`,
} as const;

/**
 * Cache TTLs in seconds
 */
export const CACHE_TTL = {
  FLOOR_STATE:    30,
  TABLE_STATE:    60,
  SESSION_STATE:  300,
  MENU_CACHE:     900,
  QR_SESSION:     7200,
  ANALYTICS_DAY:  3600,
  WAITER_QUEUE:   0,   // No expiry (managed manually)
} as const;
