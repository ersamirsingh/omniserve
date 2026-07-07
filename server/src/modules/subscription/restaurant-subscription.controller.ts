import { Request, Response } from "express";
import { Types } from "mongoose";
import { SubscriptionRepository } from "./subscription.repository.js";
import { SubscriptionService } from "./subscription.service.js";
import { subscribeSchema } from "./subscription.validator.js";
import { ApiResponseHandler } from "../../utils/apiResponse.js";

export class RestaurantSubscriptionController {
  /**
   * GET /my-subscription
   * Retrieves the current tenant's active plan configuration and limits.
   */
  static async getMySubscription(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        ApiResponseHandler.badRequest(res, "Tenant identification context missing");
        return;
      }

      const subscription = await SubscriptionRepository.findSubscriptionByTenant(tenantId);
      if (!subscription) {
        ApiResponseHandler.notFound(res, "No subscription found. Please contact support.");
        return;
      }

      ApiResponseHandler.success(res, 200, "Active subscription retrieved successfully", { subscription });
    } catch (error: any) {
      console.error("[RestaurantSubscriptionController] getMySubscription error:", error);
      ApiResponseHandler.internalError(res, error.message || "Failed to retrieve subscription");
    }
  }

  /**
   * GET /usage
   * Retrieves usage metrics for the current month and year.
   */
  static async getUsage(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        ApiResponseHandler.badRequest(res, "Tenant identification context missing");
        return;
      }

      const month = new Date().getMonth() + 1;
      const year = new Date().getFullYear();

      let usage = await SubscriptionRepository.findUsage(tenantId, month, year);
      if (!usage) {
        // Initialize empty usage record for the month
        usage = await SubscriptionRepository.incrementUsage(tenantId, month, year, {});
      }

      ApiResponseHandler.success(res, 200, "Monthly resource usage metrics retrieved", { usage });
    } catch (error: any) {
      console.error("[RestaurantSubscriptionController] getUsage error:", error);
      ApiResponseHandler.internalError(res, error.message || "Failed to retrieve resource usage");
    }
  }

  /**
   * GET /invoice-history
   * Retrieves invoice receipts list.
   */
  static async getInvoiceHistory(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        ApiResponseHandler.badRequest(res, "Tenant identification context missing");
        return;
      }

      const limit = Number(req.query.limit) || 20;
      const skip = Number(req.query.skip) || 0;

      const result = await SubscriptionRepository.listInvoicesByTenant(tenantId, limit, skip);
      ApiResponseHandler.success(res, 200, "Invoices retrieved successfully", result);
    } catch (error: any) {
      console.error("[RestaurantSubscriptionController] getInvoiceHistory error:", error);
      ApiResponseHandler.internalError(res, error.message || "Failed to retrieve invoice history");
    }
  }

  /**
   * POST /upgrade
   * Upgrades subscription to a new plan tier.
   */
  static async upgrade(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.userId;
      if (!tenantId) {
        ApiResponseHandler.badRequest(res, "Tenant identification context missing");
        return;
      }

      const validated = subscribeSchema.parse(req.body);

      const subscription = await SubscriptionService.changeSubscriptionPlan(
        tenantId,
        validated.planId,
        validated.billingCycle,
        validated.paymentProvider,
        userId
      );

      ApiResponseHandler.success(res, 200, "Subscription plan upgraded successfully", { subscription });
    } catch (error: any) {
      console.error("[RestaurantSubscriptionController] upgrade error:", error);
      ApiResponseHandler.badRequest(res, error.message || "Plan upgrade request failed");
    }
  }

  /**
   * POST /downgrade
   * Downgrades subscription.
   */
  static async downgrade(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.userId;
      if (!tenantId) {
        ApiResponseHandler.badRequest(res, "Tenant identification context missing");
        return;
      }

      const validated = subscribeSchema.parse(req.body);

      const subscription = await SubscriptionService.changeSubscriptionPlan(
        tenantId,
        validated.planId,
        validated.billingCycle,
        validated.paymentProvider,
        userId
      );

      ApiResponseHandler.success(res, 200, "Subscription plan downgraded successfully", { subscription });
    } catch (error: any) {
      console.error("[RestaurantSubscriptionController] downgrade error:", error);
      ApiResponseHandler.badRequest(res, error.message || "Plan downgrade request failed");
    }
  }

  /**
   * POST /cancel
   * Disables auto-renew.
   */
  static async cancel(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        ApiResponseHandler.badRequest(res, "Tenant identification context missing");
        return;
      }

      const subscription = await SubscriptionService.cancelSubscription(tenantId);
      ApiResponseHandler.success(res, 200, "Subscription auto-renewal has been cancelled", { subscription });
    } catch (error: any) {
      console.error("[RestaurantSubscriptionController] cancel error:", error);
      ApiResponseHandler.badRequest(res, error.message || "Failed to cancel subscription");
    }
  }

  /**
   * POST /resume
   * Enables auto-renew.
   */
  static async resume(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        ApiResponseHandler.badRequest(res, "Tenant identification context missing");
        return;
      }

      const subscription = await SubscriptionService.resumeSubscription(tenantId);
      ApiResponseHandler.success(res, 200, "Subscription auto-renewal has been resumed", { subscription });
    } catch (error: any) {
      console.error("[RestaurantSubscriptionController] resume error:", error);
      ApiResponseHandler.badRequest(res, error.message || "Failed to resume subscription");
    }
  }

  /**
   * POST /renew
   * Manually triggers manual renewal invoice processing.
   */
  static async renew(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.userId;
      if (!tenantId) {
        ApiResponseHandler.badRequest(res, "Tenant identification context missing");
        return;
      }

      const subscription = await SubscriptionService.renewSubscription(tenantId, userId);
      ApiResponseHandler.success(res, 200, "Subscription renewed successfully", { subscription });
    } catch (error: any) {
      console.error("[RestaurantSubscriptionController] renew error:", error);
      ApiResponseHandler.badRequest(res, error.message || "Failed to renew subscription");
    }
  }
}
