import { Request, Response } from "express";
import { Types } from "mongoose";
import { SubscriptionRepository } from "./subscription.repository.js";
import { SubscriptionService } from "./subscription.service.js";
import { subscribeSchema } from "./subscription.validator.js";
import { ApiResponseHandler } from "../../utils/apiResponse.js";
import { CouponService } from "../coupon/coupon.service.js";
import { AccessScope } from "../../utils/accessScope.utils.js";
import RestaurantSubscriptionModel from "../../models/subscription.model.js";

export class RestaurantSubscriptionController {

  static async getMySubscription(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        ApiResponseHandler.badRequest(res, "Tenant identification context missing");
        return;
      }

      const reqOutletId = req.query.outletId as string | undefined;
      let targetOutletId: string | undefined = reqOutletId;

      const allowedOutletIds = req.user ? await AccessScope.outletIdsForUser(req.user) : null;
      if (targetOutletId) {
        if (req.user && !(await AccessScope.canAccessOutlet(req.user, targetOutletId))) {
          ApiResponseHandler.forbidden(res, "Access denied: You cannot view subscriptions for this outlet");
          return;
        }
      } else if (allowedOutletIds && allowedOutletIds.length > 0) {
        targetOutletId = allowedOutletIds[0];
      }

      const query: any = { tenantId: new Types.ObjectId(tenantId), isDeleted: false };
      if (targetOutletId && Types.ObjectId.isValid(targetOutletId)) {
        query.$or = [
          { outletId: new Types.ObjectId(targetOutletId) },
          { outletId: null }
        ];
      }

      const subscription = await RestaurantSubscriptionModel.findOne(query).sort({ createdAt: -1 }).populate("planId");
      if (!subscription) {
        ApiResponseHandler.notFound(res, "No subscription found for the specified outlet context.");
        return;
      }

      ApiResponseHandler.success(res, 200, "Active subscription retrieved successfully", { subscription });
    } catch (error: any) {
      console.error("[RestaurantSubscriptionController] getMySubscription error:", error);
      ApiResponseHandler.internalError(res, error.message || "Failed to retrieve subscription");
    }
  }

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

        usage = await SubscriptionRepository.incrementUsage(tenantId, month, year, {});
      }

      ApiResponseHandler.success(res, 200, "Monthly resource usage metrics retrieved", { usage });
    } catch (error: any) {
      console.error("[RestaurantSubscriptionController] getUsage error:", error);
      ApiResponseHandler.internalError(res, error.message || "Failed to retrieve resource usage");
    }
  }

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

  static async upgrade(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.userId;
      if (!tenantId) {
        ApiResponseHandler.badRequest(res, "Tenant identification context missing");
        return;
      }

      const validated = subscribeSchema.parse(req.body);
      const outletId = req.body.outletId as string | undefined;

      if (outletId) {
        if (!Types.ObjectId.isValid(outletId)) {
          ApiResponseHandler.badRequest(res, "Invalid outletId format");
          return;
        }
        if (req.user && !(await AccessScope.canAccessOutlet(req.user, outletId))) {
          ApiResponseHandler.forbidden(res, "Access denied: You cannot purchase a subscription for this outlet");
          return;
        }
      }

      const subscription = await SubscriptionService.changeSubscriptionPlan(
        tenantId,
        validated.planId,
        validated.billingCycle,
        validated.paymentProvider,
        validated.couponCode,
        userId,
        outletId
      );

      ApiResponseHandler.success(res, 200, "Subscription plan upgraded successfully", { subscription });
    } catch (error: any) {
      console.error("[RestaurantSubscriptionController] upgrade error:", error);
      ApiResponseHandler.badRequest(res, error.message || "Plan upgrade request failed");
    }
  }

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
        validated.couponCode,
        userId
      );

      ApiResponseHandler.success(res, 200, "Subscription plan downgraded successfully", { subscription });
    } catch (error: any) {
      console.error("[RestaurantSubscriptionController] downgrade error:", error);
      ApiResponseHandler.badRequest(res, error.message || "Plan downgrade request failed");
    }
  }

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

  static async renew(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.userId;
      if (!tenantId) {
        ApiResponseHandler.badRequest(res, "Tenant identification context missing");
        return;
      }

      const subscription = await SubscriptionService.renewSubscription(tenantId, req.body.couponCode, userId);
      ApiResponseHandler.success(res, 200, "Subscription renewed successfully", { subscription });
    } catch (error: any) {
      console.error("[RestaurantSubscriptionController] renew error:", error);
      ApiResponseHandler.badRequest(res, error.message || "Failed to renew subscription");
    }
  }

  static async validateSubscriptionCoupon(req: Request, res: Response): Promise<void> {
    try {
      const { code, subtotal } = req.body;

      if (!code || subtotal === undefined || isNaN(Number(subtotal))) {
        ApiResponseHandler.badRequest(res, "code and subtotal are required");
        return;
      }

      const tenantId = req.user?.tenantId;
      const result = await CouponService.validateSubscriptionCoupon(code as string, Number(subtotal), tenantId);

      if (!result.isValid) {
        ApiResponseHandler.success(res, 200, result.reason || "Invalid coupon", {
          isValid: false,
          discount: 0,
          reason: result.reason,
        });
        return;
      }

      ApiResponseHandler.success(res, 200, "Coupon validated successfully", {
        isValid: true,
        discount: result.discount,
        code: result.coupon?.code,
        discountType: result.coupon?.discountType,
        discountValue: result.coupon?.discountValue,
      });
    } catch (error: any) {
      ApiResponseHandler.badRequest(res, error.message || "Failed to validate coupon");
    }
  }
}
