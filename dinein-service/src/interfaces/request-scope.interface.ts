import type { DineInRole } from '../constants/table-states.constants.js';

export interface RequestScope {
  tenantId: string;
  outletId: string;
  userId?: string;
  role?: DineInRole | string;
}
