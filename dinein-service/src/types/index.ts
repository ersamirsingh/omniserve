import { Request } from 'express';
import { DineInRole } from '../constants/table-states.constants.js';

declare global {
  namespace Express {
    interface Request {
      user?: DineInJWTPayload;
      guestSession?: GuestSessionPayload;
    }
  }
}

export interface DineInJWTPayload {
  userId: string;
  tenantId: string;
  restaurantId?: string;
  outletId?: string;
  outletIds?: string[];
  email: string;
  role: DineInRole | string;
  status: string;
}

export interface GuestSessionPayload {
  guestToken: string;
  sessionId: string;
  tableId: string;
  seatId?: string;
  tenantId: string;
  outletId: string;
  issuedAt: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  message: string;
  data?: T;
  meta?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  error?: string;
  code?: string;
  details?: unknown[];
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface RequestWithTenant extends Request {
  user: DineInJWTPayload;
}

export interface RequestWithGuest extends Request {
  guestSession: GuestSessionPayload;
}
