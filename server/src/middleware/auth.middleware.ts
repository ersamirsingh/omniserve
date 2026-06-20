import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { TokenBlacklistService } from '../services/tokenblacklist.service.js';
import { UserRole } from '../enums/enums.js';



declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        tenantId: string;
        restaurantId?: string;
        outletId?: string;
        outletIds?: string[];
        email: string;
        role: string;
        status: string;
      };
    }
  }
}

/** Verify JWT access token and attach user to request */
export const verifyToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];

    if (!token) {
      res.status(401).json({ success: false, message: 'No token provided' });
      return;
    }

    // Check if token is blacklisted (revoked)
    const isBlacklisted = await TokenBlacklistService.isBlacklisted(token);
    if (isBlacklisted) {
      res.status(401).json({
        success: false,
        message: 'Token has been revoked. Please login again.',
        code: 'TOKEN_REVOKED',
      });
      return;
    }

    const decoded = AuthService.verifyAccessToken(token);

    if (!decoded) {
      res.status(401).json({ success: false, message: 'Invalid or expired token' });
      return;
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Authentication failed' });
  }
};

/** Verify JWT access token from cookies */
export const verifyTokenFromCookie = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const token = req.cookies.accessToken;

    if (!token) {
      res.status(401).json({ success: false, message: 'No token found in cookies' });
      return;
    }

    const decoded = AuthService.verifyAccessToken(token);

    if (!decoded) {
      res.status(401).json({ success: false, message: 'Invalid or expired token' });
      return;
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Authentication failed' });
  }
};

/** Middleware to check if user has required role(s) */
export const authorizeRole = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'User not authenticated' });
      return;
    }

    if (!roles.includes(req.user.role as UserRole)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions for this action',
      });
      return;
    }

    next();
  };
};

/** Middleware to check if user is super admin */
export const isSuperAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'User not authenticated' });
    return;
  }

  if (req.user.role !== UserRole.SUPER_ADMIN) {
    res.status(403).json({
      success: false,
      message: 'Only super admins can perform this action',
    });
    return;
  }

  next();
};

/** Middleware to check if user is restaurant owner or super admin */
export const isRestaurantOwner = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'User not authenticated' });
    return;
  }

  if (
    req.user.role !== UserRole.RESTAURANT_OWNER &&
    req.user.role !== UserRole.SUPER_ADMIN
  ) {
    res.status(403).json({
      success: false,
      message: 'Only restaurant owners can perform this action',
    });
    return;
  }

  next();
};

/**  Middleware to check if user is outlet manager or above */
export const isOutletManager = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'User not authenticated' });
    return;
  }

  const allowedRoles = [
    UserRole.OUTLET_MANAGER,
    UserRole.RESTAURANT_OWNER,
    UserRole.SUPER_ADMIN,
  ];

  if (!allowedRoles.includes(req.user.role as UserRole)) {
    res.status(403).json({
      success: false,
      message: 'Only outlet managers and above can perform this action',
    });
    return;
  }

  next();
};

/** Optional authentication middleware - doesn't fail if no token */
export const optionalAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (token) {
      const decoded = AuthService.verifyAccessToken(token);
      if (decoded) {
        req.user = decoded;
      }
    }

    next();
  } catch (error) {
    next();
  }
};
