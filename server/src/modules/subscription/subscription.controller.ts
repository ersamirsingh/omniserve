import { Request, Response } from 'express';
import { SubscriptionService } from "./restaurant-owner-subscription.service.js";
import { SubscriptionPlan, SubscriptionStatus } from "../../models/enums.js";
import { ApiResponseHandler } from "../../utils/apiResponse.js";
import { Types } from 'mongoose';

declare global {
  namespace Express {
    interface Request {
      subscription?: any;
    }
  }
}

export class SubscriptionController {

  static async createSubscription(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenant ID not found');
        return;
      }

      const { plan, amount, startDate, endDate } = req.body;

      if (!plan || amount === undefined || !startDate || !endDate) {
        ApiResponseHandler.badRequest(res, 'plan, amount, startDate, and endDate are required');
        return;
      }

      if (!Object.values(SubscriptionPlan).includes(plan)) {
        ApiResponseHandler.badRequest(
          res,
          `Invalid plan. Must be one of: ${Object.values(SubscriptionPlan).join(', ')}`
        );
        return;
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start >= end) {
        ApiResponseHandler.badRequest(res, 'startDate must be before endDate');
        return;
      }

      if (Number(amount) < 0) {
        ApiResponseHandler.badRequest(res, 'amount cannot be negative');
        return;
      }

      const subscription = await SubscriptionService.createSubscription(
        tenantId,
        plan as SubscriptionPlan,
        Number(amount),
        start,
        end,
        req.user?.userId
      );

      ApiResponseHandler.success(res, 201, 'Subscription created successfully', subscription);
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || 'Failed to create subscription');
    }
  }

  static async getCurrentSubscription(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenant ID not found');
        return;
      }

      const subscription = await SubscriptionService.getCurrentSubscription(tenantId);

      if (!subscription) {
        ApiResponseHandler.notFound(res, 'No active subscription found');
        return;
      }

      ApiResponseHandler.success(res, 200, 'Current active subscription retrieved successfully', subscription);
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || 'Failed to retrieve current subscription');
    }
  }

  static async cancelSubscription(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenant ID not found');
        return;
      }

      const id = req.params.id as string;
      if (!id || !Types.ObjectId.isValid(id)) {
        ApiResponseHandler.badRequest(res, 'Invalid subscription ID format');
        return;
      }

      const cancelledSubscription = await SubscriptionService.cancelSubscription(
        id,
        tenantId,
        req.user?.userId
      );

      if (!cancelledSubscription) {
        ApiResponseHandler.notFound(res, 'Subscription not found or access denied');
        return;
      }

      ApiResponseHandler.success(res, 200, 'Subscription cancelled successfully', cancelledSubscription);
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || 'Failed to cancel subscription');
    }
  }

  static async getSubscriptionsByTenantId(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenant ID not found');
        return;
      }

      const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
      const skip = parseInt(req.query.skip as string) || 0;

      const { subscriptions, total } = await SubscriptionService.getSubscriptionsByTenantId(
        tenantId,
        limit,
        skip
      );

      ApiResponseHandler.success(res, 200, 'Subscriptions retrieved successfully', {
        subscriptions,
        pagination: {
          total,
          limit,
          skip,
          hasMore: skip + limit < total,
        },
      });
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || 'Failed to retrieve subscriptions');
    }
  }

  static async getSubscriptionById(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenant ID not found');
        return;
      }

      const id = req.params.id as string;
      if (!id || !Types.ObjectId.isValid(id)) {
        ApiResponseHandler.badRequest(res, 'Invalid subscription ID format');
        return;
      }

      const subscription = await SubscriptionService.getSubscriptionById(id, tenantId);

      if (!subscription) {
        ApiResponseHandler.notFound(res, 'Subscription not found or access denied');
        return;
      }

      ApiResponseHandler.success(res, 200, 'Subscription retrieved successfully', subscription);
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || 'Failed to retrieve subscription');
    }
  }

}
