import { Request, Response, NextFunction } from 'express';
import { ApiResponseHandler } from '../utils/apiResponse.js';
import Tenant from '../models/tenant.model.js';
import { UserRole, UserStatus } from '../models/enums.js';

export const tenantScoping = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {

    if (req.user?.role === UserRole.SYSTEM_ADMIN && req.path.startsWith('/system-admin')) {
      return next();
    }

    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'] || req.query.tenantId;

    if (!tenantId) {
      ApiResponseHandler.badRequest(res, 'Tenant identification context required');
      return;
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant || tenant.isDeleted) {
      ApiResponseHandler.notFound(res, 'Tenant not found');
      return;
    }

    if (tenant.status !== UserStatus.ACTIVE) {
      ApiResponseHandler.forbidden(res, `Tenant account is ${tenant.status.toLowerCase()}`);
      return;
    }

    next();
  } catch (error: any) {
    ApiResponseHandler.internalError(res, 'Tenant scoping validation failed');
  }
};
