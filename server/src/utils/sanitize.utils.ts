
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const SORT_FIELD_WHITELISTS: Record<string, readonly string[]> = {
  order: ['createdAt', 'totalAmount', 'orderStatus', 'orderNumber', 'updatedAt'],
  customer: ['createdAt', 'firstName', 'lastName', 'phone', 'email', 'totalOrders', 'totalSpent', 'updatedAt'],
  user: ['createdAt', 'firstName', 'lastName', 'email', 'role', 'status', 'updatedAt'],
  outlet: ['createdAt', 'name', 'city', 'state', 'status', 'updatedAt'],
  menuItem: ['createdAt', 'name', 'price', 'displayOrder', 'isAvailable', 'updatedAt'],
  payment: ['createdAt', 'amount', 'status', 'updatedAt'],
  category: ['createdAt', 'name', 'displayOrder', 'updatedAt'],
  inventory: ['createdAt', 'quantity', 'threshold', 'updatedAt'],
  notification: ['createdAt', 'isRead', 'updatedAt'],
  addon: ['createdAt', 'name', 'price', 'updatedAt'],
  variant: ['createdAt', 'name', 'price', 'updatedAt'],
} as const;

export function sanitizeSortField(
  resource: string,
  sortBy: string | undefined,
  fallback: string = 'createdAt'
): string {
  if (!sortBy) return fallback;

  const whitelist = SORT_FIELD_WHITELISTS[resource];
  if (!whitelist) return fallback;

  return whitelist.includes(sortBy) ? sortBy : fallback;
}

export function sanitizePaginationLimit(limit: number, max: number = 100): number {
  return Math.min(Math.max(1, limit), max);
}
