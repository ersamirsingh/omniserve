import type { Request } from 'express';
import { ApiError } from './ApiError.js';
import type { RequestScope } from '../interfaces/request-scope.interface.js';

export const getRequestScope = (req: Request): RequestScope => {
  const tenantId = req.user?.tenantId ?? req.header('x-tenant-id');
  const outletId = req.user?.outletId ?? req.header('x-outlet-id');

  if (!tenantId || !outletId) {
    throw ApiError.badRequest('Missing tenant or outlet scope');
  }

  return {
    tenantId,
    outletId,
    userId: req.user?.userId ?? req.header('x-user-id') ?? undefined,
    role: req.user?.role,
  };
};
