export const DINEIN_SCOPE_STORAGE_KEY = 'foodmesh.dinein.scope';

export const TABLE_STATUSES = [
  'AVAILABLE',
  'RESERVED',
  'OCCUPIED',
  'ORDERING',
  'PREPARING',
  'READY',
  'SERVING',
  'SERVED',
  'BILL_REQUESTED',
  'PAYMENT_PENDING',
  'CLEANING',
  'CLOSED',
  'BLOCKED',
  'MAINTENANCE',
];

export const SESSION_STATUSES = ['ACTIVE', 'ORDERING', 'BILLED', 'CLOSED', 'ABANDONED'];
export const RESERVATION_STATUSES = ['PENDING', 'CONFIRMED', 'SEATED', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'EXPIRED'];
export const DINEIN_ORDER_STATUSES = ['DRAFT', 'PLACED', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'CANCELLED'];
export const ASSISTANCE_TYPES = ['WATER', 'CALL_WAITER', 'TISSUE', 'NEED_BILL', 'NEED_MANAGER', 'CUSTOM'];
export const SPLIT_TYPES = ['NO_SPLIT', 'EQUAL_SPLIT', 'CUSTOM_SPLIT', 'SEAT_WISE'];
export const DINEIN_PAYMENT_METHODS = ['CASH', 'UPI', 'CARD', 'WALLET', 'ROOM_CHARGE'];
export const SECTION_TYPES = ['INDOOR', 'OUTDOOR', 'VIP', 'PRIVATE_ROOM', 'TERRACE', 'BAR', 'ROOFTOP'];
export const TABLE_SHAPES = ['ROUND', 'SQUARE', 'RECTANGLE', 'OVAL'];

export const STATUS_VARIANTS = {
  AVAILABLE: 'success',
  RESERVED: 'warning',
  OCCUPIED: 'danger',
  ORDERING: 'warning',
  PREPARING: 'info',
  READY: 'success',
  SERVING: 'info',
  SERVED: 'success',
  BILL_REQUESTED: 'warning',
  PAYMENT_PENDING: 'warning',
  CLEANING: 'info',
  CLOSED: 'neutral',
  BLOCKED: 'danger',
  MAINTENANCE: 'neutral',
  ACTIVE: 'success',
  BILLED: 'warning',
  ABANDONED: 'danger',
  PENDING: 'warning',
  CONFIRMED: 'info',
  SEATED: 'success',
  COMPLETED: 'success',
  CANCELLED: 'danger',
  NO_SHOW: 'danger',
  EXPIRED: 'neutral',
  DRAFT: 'neutral',
  PLACED: 'warning',
  RESOLVED: 'success',
  IN_PROGRESS: 'info',
  SEEN: 'info',
};

export const TABLE_STATUS_COLORS = {
  AVAILABLE: '#16a34a',
  RESERVED: '#ca8a04',
  OCCUPIED: '#dc2626',
  ORDERING: '#ea580c',
  PREPARING: '#7c3aed',
  READY: '#0891b2',
  SERVING: '#2563eb',
  SERVED: '#059669',
  BILL_REQUESTED: '#d97706',
  PAYMENT_PENDING: '#db2777',
  CLEANING: '#60a5fa',
  CLOSED: '#6b7280',
  BLOCKED: '#374151',
  MAINTENANCE: '#9ca3af',
};

export const DINEIN_TABS = [
  { to: '/dine-in/dashboard', label: 'Dashboard' },
  { to: '/dine-in/floor', label: 'Floor' },
  { to: '/dine-in/sessions', label: 'Sessions' },
  { to: '/dine-in/reservations', label: 'Reservations' },
  { to: '/dine-in/orders', label: 'Orders' },
  { to: '/dine-in/assistance', label: 'Assistance' },
  { to: '/dine-in/billing', label: 'Billing' },
];
