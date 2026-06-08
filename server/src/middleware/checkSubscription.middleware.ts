import { Request, Response, NextFunction } from 'express';
import { SubscriptionService } from '../services/subscription.service.js';

declare global {
  namespace Express {
    interface Request {
      subscription?: any;
    }
  }
}

/**
 * Middleware to check if tenant has an active subscription
 * Fetches the active subscription using req.user.tenantId
 * Attaches subscription to req.subscription
 * Returns 403 if expired or no active plan
 */
export const checkSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Verify user is authenticated
    if (!req.user?.tenantId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated or tenantId not found',
      });
      return;
    }

    // Fetch active subscription for tenant
    const subscription = await SubscriptionService.getActiveSubscription(req.user.tenantId);

    // Check if subscription exists and is active
    if (!subscription) {
      res.status(403).json({
        success: false,
        message: 'No active subscription found. Please upgrade your plan.',
      });
      return;
    }

    // Attach subscription to request
    req.subscription = subscription;
    next();
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to verify subscription',
    });
  }
};

/**
 * Middleware to check if tenant has an active subscription with minimum plan tier
 * Optional middleware - doesn't fail if no token, but validates subscription if user is authenticated
 * Useful for routes that should have different functionality based on subscription tier
 */
export const optionalCheckSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // If user is not authenticated, proceed without subscription check
    if (!req.user?.tenantId) {
      next();
      return;
    }

    // Fetch active subscription for tenant
    const subscription = await SubscriptionService.getActiveSubscription(req.user.tenantId);

    // Attach subscription to request if it exists
    if (subscription) {
      req.subscription = subscription;
    }

    next();
  } catch (error: any) {
    // Even on error, proceed without subscription
    next();
  }
};

/**
 * Middleware to check subscription and validate specific plan tier
 * Returns 403 if user doesn't have the required plan or higher
 * Plan hierarchy: FREE < STARTER < PRO < ENTERPRISE
 */
export const checkSubscriptionTier = (requiredTier: string) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Verify user is authenticated
      if (!req.user?.tenantId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated or tenantId not found',
        });
        return;
      }

      // Fetch active subscription for tenant
      const subscription = await SubscriptionService.getActiveSubscription(req.user.tenantId);

      // Check if subscription exists
      if (!subscription) {
        res.status(403).json({
          success: false,
          message: 'No active subscription found. Please upgrade your plan.',
        });
        return;
      }

      // Define plan hierarchy
      const planHierarchy: Record<string, number> = {
        FREE: 0,
        STARTER: 1,
        PRO: 2,
        ENTERPRISE: 3,
      };

      const userPlanLevel = planHierarchy[subscription.plan] ?? -1;
      const requiredPlanLevel = planHierarchy[requiredTier] ?? -1;

      // Check if user's plan meets the required tier
      if (userPlanLevel < requiredPlanLevel) {
        res.status(403).json({
          success: false,
          message: `This feature requires ${requiredTier} plan or higher. Your current plan: ${subscription.plan}`,
        });
        return;
      }

      // Attach subscription to request
      req.subscription = subscription;
      next();
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to verify subscription tier',
      });
    }
  };
};
