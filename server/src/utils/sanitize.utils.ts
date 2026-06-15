
 /* @param input - Raw user input string
 * @returns Escaped string safe for use in RegExp constructor
 */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Per-resource allowed sort field whitelists.
 * Only these fields can be used as sortBy values.
 */
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

/**
 * Validate and sanitize a sort field against the resource's whitelist.
 * Returns the field if it is in the whitelist, otherwise returns the
 * default sort field ('createdAt').
 *
 * Prevents NoSQL injection via arbitrary field name injection in
 * MongoDB .sort() operations.
 */

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

/**
 * Cap a pagination limit to a maximum value to prevent
 * denial-of-service via extremely large page sizes.
 */
export function sanitizePaginationLimit(limit: number, max: number = 100): number {
  return Math.min(Math.max(1, limit), max);
}
