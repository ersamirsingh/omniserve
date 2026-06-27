import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError.js';
import { getEnv } from '../config/env.config.js';
import { DineInRole } from '../constants/table-states.constants.js';
import type { DineInJWTPayload } from '../types/index.js';

const resolveToken = (req: Request): string | null => {
  const authorization = req.headers.authorization;
  if (authorization?.startsWith('Bearer ')) {
    return authorization.slice(7);
  }

  return null;
};

export const optionalAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const token = resolveToken(req);

  if (!token) {
    next();
    return;
  }

  try {
    req.user = jwt.verify(token, getEnv().JWT_SECRET) as DineInJWTPayload;
  } catch {
    req.user = undefined;
  }

  next();
};

export const requireAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const token = resolveToken(req);

  if (token) {
    try {
      req.user = jwt.verify(token, getEnv().JWT_SECRET) as DineInJWTPayload;
      next();
      return;
    } catch {
      next(ApiError.unauthorized('Invalid token'));
      return;
    }
  }

  const tenantId = req.header('x-tenant-id');
  const outletId = req.header('x-outlet-id');

  if (!tenantId || !outletId) {
    next(ApiError.unauthorized('Authentication required'));
    return;
  }

  req.user = {
    userId: req.header('x-user-id') ?? 'system-user',
    tenantId,
    outletId,
    email: req.header('x-user-email') ?? 'system@foodmesh.local',
    role: req.header('x-user-role') ?? DineInRole.OUTLET_MANAGER,
    status: 'ACTIVE',
  };

  next();
};

export const authorizeRoles =
  (...roles: Array<DineInRole | string>) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(ApiError.unauthorized('Authentication required'));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(ApiError.forbidden('Insufficient permissions'));
      return;
    }

    next();
  };
