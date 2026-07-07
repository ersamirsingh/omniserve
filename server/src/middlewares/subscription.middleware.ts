import { Request, Response, NextFunction } from "express";
import { SubscriptionRepository } from "../modules/subscription/subscription.repository.js";
import { SubscriptionStatus } from "../modules/subscription/subscription.enum.js";
import { ApiResponseHandler } from "../utils/apiResponse.js";
import Outlet from "../models/outlet.model.js";
import User from "../models/user.model.js";
import { IRestaurantSubscriptionDocument } from "../models/subscription.model.js";

declare global {
  namespace Express {
    interface Request {
      subscription?: any;
    }
  }
}

/**
 * Ensures the tenant has an active subscription or is in trial/grace period.
 * Blocks expired or payment-pending accounts.
 */
export function requireActiveSubscription() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.user?.tenantId || req.headers["x-tenant-id"] || req.query.tenantId;
      if (!tenantId) {
        ApiResponseHandler.badRequest(res, "Tenant identification context required");
        return;
      }

      const subscription = await SubscriptionRepository.findSubscriptionByTenant(tenantId.toString());
      if (!subscription) {
        ApiResponseHandler.unauthorized(res, "No active subscription found. Please onboard.");
        return;
      }

      const allowedStatuses = [
        SubscriptionStatus.ACTIVE,
        SubscriptionStatus.TRIAL,
        SubscriptionStatus.GRACE_PERIOD
      ];

      if (!allowedStatuses.includes(subscription.status)) {
        ApiResponseHandler.forbidden(
          res,
          `Your subscription status is ${subscription.status}. Access locked. Please upgrade or renew your plan.`
        );
        return;
      }

      // Attach subscription details to req for downstream usage
      req.subscription = subscription;
      next();
    } catch (error: any) {
      console.error("[SubscriptionMiddleware] requireActiveSubscription error:", error);
      ApiResponseHandler.internalError(res, "Error validating subscription status");
    }
  };
}

/**
 * Guard that verifies if the tenant's current plan includes the requested feature flag.
 */
export function requireFeature(featureName: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.user?.tenantId || req.headers["x-tenant-id"];
      if (!tenantId) {
        ApiResponseHandler.badRequest(res, "Tenant identification context required");
        return;
      }

      const subscription = req.subscription || await SubscriptionRepository.findSubscriptionByTenant(tenantId.toString());
      if (!subscription || !subscription.planId) {
        ApiResponseHandler.forbidden(res, "Subscription details missing");
        return;
      }

      const plan = subscription.planId as any;
      const features = plan.features || {};

      if (!features[featureName]) {
        ApiResponseHandler.forbidden(
          res,
          `${featureName} feature is unavailable on your current plan. Please upgrade your subscription.`
        );
        return;
      }

      next();
    } catch (error: any) {
      console.error("[SubscriptionMiddleware] requireFeature error:", error);
      ApiResponseHandler.internalError(res, "Error validating feature access");
    }
  };
}

/**
 * Guards that inspect the database counts vs subscription limits to prevent over-allocation.
 */
export function checkUsage(resource: "outlets" | "employees" | "monthlyOrders") {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.user?.tenantId || req.headers["x-tenant-id"];
      if (!tenantId) {
        ApiResponseHandler.badRequest(res, "Tenant identification context required");
        return;
      }

      const subscription = req.subscription || await SubscriptionRepository.findSubscriptionByTenant(tenantId.toString());
      if (!subscription || !subscription.planId) {
        ApiResponseHandler.forbidden(res, "Subscription details missing");
        return;
      }

      const plan = subscription.planId as any;
      const limits = plan.limits || {};

      if (resource === "outlets") {
        const activeOutletsCount = await Outlet.countDocuments({
          tenantId: new Object(tenantId) as any,
          isDeleted: false,
        });
        if (activeOutletsCount >= limits.outlets) {
          ApiResponseHandler.forbidden(
            res,
            `Outlet creation limit reached (Max: ${limits.outlets}). Please upgrade your subscription.`
          );
          return;
        }
      }

      if (resource === "employees") {
        const activeStaffCount = await User.countDocuments({
          tenantId: new Object(tenantId) as any,
          isDeleted: false,
        });
        if (activeStaffCount >= limits.employees) {
          ApiResponseHandler.forbidden(
            res,
            `Staff creation limit reached (Max: ${limits.employees}). Please upgrade your subscription.`
          );
          return;
        }
      }

      if (resource === "monthlyOrders") {
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        const usage = await SubscriptionRepository.findUsage(tenantId.toString(), currentMonth, currentYear);
        const ordersUsed = usage?.ordersUsed || 0;

        if (ordersUsed >= limits.monthlyOrders) {
          ApiResponseHandler.forbidden(
            res,
            `Monthly orders limit reached (Max: ${limits.monthlyOrders}). Please upgrade your subscription.`
          );
          return;
        }
      }

      next();
    } catch (error: any) {
      console.error("[SubscriptionMiddleware] checkUsage error:", error);
      ApiResponseHandler.internalError(res, "Error checking subscription limits");
    }
  };
}
