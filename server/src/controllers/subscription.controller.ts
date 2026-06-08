import { Request, Response } from 'express';
import { SubscriptionService } from '../services/subscription.service.js';
import { SubscriptionPlan, UserStatus } from '../enums/enums.js';

declare global {
  namespace Express {
    interface Request {
      subscription?: any;
    }
  }
}

export class SubscriptionController {
  /**
   * Create a new subscription
   * POST /subscriptions
   */
  static async createSubscription(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, plan, amount, startDate, endDate } = req.body;

      // Validate required fields
      if (!tenantId || !plan || !amount || !startDate || !endDate) {
        res.status(400).json({
          success: false,
          message: 'tenantId, plan, amount, startDate, and endDate are required',
        });
        return;
      }

      // Validate plan is valid
      if (!Object.values(SubscriptionPlan).includes(plan)) {
        res.status(400).json({
          success: false,
          message: `Invalid plan. Must be one of: ${Object.values(SubscriptionPlan).join(', ')}`,
        });
        return;
      }

      // Validate dates
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (start >= end) {
        res.status(400).json({
          success: false,
          message: 'startDate must be before endDate',
        });
        return;
      }

      if (amount < 0) {
        res.status(400).json({
          success: false,
          message: 'amount cannot be negative',
        });
        return;
      }

      const subscription = await SubscriptionService.createSubscription(
        tenantId,
        plan,
        amount,
        start,
        end,
        req.user?.userId
      );

      res.status(201).json({
        success: true,
        message: 'Subscription created successfully',
        data: subscription,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create subscription',
      });
    }
  }

  /**
   * Get active subscription for current tenant
   * GET /subscriptions/active
   */
  static async getActiveSubscription(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated or tenantId not found',
        });
        return;
      }

      const subscription = await SubscriptionService.getActiveSubscription(req.user.tenantId);

      if (!subscription) {
        res.status(404).json({
          success: false,
          message: 'No active subscription found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Active subscription retrieved',
        data: subscription,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve subscription',
      });
    }
  }

  /**
   * Get subscription details with plan info
   * GET /subscriptions/details
   */
  static async getSubscriptionDetails(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated or tenantId not found',
        });
        return;
      }

      const details = await SubscriptionService.getSubscriptionDetails(req.user.tenantId);

      if (!details) {
        res.status(404).json({
          success: false,
          message: 'No active subscription found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Subscription details retrieved',
        data: details,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve subscription details',
      });
    }
  }

  /**
   * Get all subscriptions for current tenant
   * GET /subscriptions
   */
  static async getSubscriptionsByTenantId(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated or tenantId not found',
        });
        return;
      }

      const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
      const skip = parseInt(req.query.skip as string) || 0;

      const { subscriptions, total } = await SubscriptionService.getSubscriptionsByTenantId(
        req.user.tenantId,
        limit,
        skip
      );

      res.status(200).json({
        success: true,
        message: 'Subscriptions retrieved',
        data: {
          subscriptions,
          pagination: {
            total,
            limit,
            skip,
            hasMore: skip + limit < total,
          },
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve subscriptions',
      });
    }
  }

  /**
   * Get subscription by ID
   * GET /subscriptions/:id
   */
  static async getSubscriptionById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params as { id: string };

      const subscription = await SubscriptionService.getSubscriptionById(id);

      if (!subscription) {
        res.status(404).json({
          success: false,
          message: 'Subscription not found',
        });
        return;
      }

      // Verify user has access to this subscription
      if (subscription.tenantId.toString() !== req.user?.tenantId) {
        res.status(403).json({
          success: false,
          message: 'You do not have access to this subscription',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Subscription retrieved',
        data: subscription,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve subscription',
      });
    }
  }

  /**
   * Update subscription plan
   * PATCH /subscriptions/:id/plan
   */
  static async updateSubscriptionPlan(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const { plan, amount, endDate } = req.body;

      if (!plan || !amount || !endDate) {
        res.status(400).json({
          success: false,
          message: 'plan, amount, and endDate are required',
        });
        return;
      }

      if (!Object.values(SubscriptionPlan).includes(plan)) {
        res.status(400).json({
          success: false,
          message: `Invalid plan. Must be one of: ${Object.values(SubscriptionPlan).join(', ')}`,
        });
        return;
      }

      const subscription = await SubscriptionService.getSubscriptionById(id);

      if (!subscription) {
        res.status(404).json({
          success: false,
          message: 'Subscription not found',
        });
        return;
      }

      if (subscription.tenantId.toString() !== req.user?.tenantId) {
        res.status(403).json({
          success: false,
          message: 'You do not have access to this subscription',
        });
        return;
      }

      const updatedSubscription = await SubscriptionService.updateSubscriptionPlan(
        id,
        plan,
        amount,
        new Date(endDate),
        req.user?.userId
      );

      res.status(200).json({
        success: true,
        message: 'Subscription plan updated',
        data: updatedSubscription,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update subscription plan',
      });
    }
  }

  /**
   * Extend subscription end date
   * PATCH /subscriptions/:id/extend
   */
  static async extendSubscription(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const { endDate } = req.body;

      if (!endDate) {
        res.status(400).json({
          success: false,
          message: 'endDate is required',
        });
        return;
      }

      const subscription = await SubscriptionService.getSubscriptionById(id);

      if (!subscription) {
        res.status(404).json({
          success: false,
          message: 'Subscription not found',
        });
        return;
      }

      if (subscription.tenantId.toString() !== req.user?.tenantId) {
        res.status(403).json({
          success: false,
          message: 'You do not have access to this subscription',
        });
        return;
      }

      const newEndDate = new Date(endDate);
      
      if (newEndDate <= subscription.endDate) {
        res.status(400).json({
          success: false,
          message: 'New end date must be after current end date',
        });
        return;
      }

      const updatedSubscription = await SubscriptionService.extendSubscription(
        id,
        newEndDate,
        req.user?.userId
      );

      res.status(200).json({
        success: true,
        message: 'Subscription extended',
        data: updatedSubscription,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to extend subscription',
      });
    }
  }

  /**
   * Cancel subscription
   * DELETE /subscriptions/:id
   */
  static async cancelSubscription(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params as { id: string };

      const subscription = await SubscriptionService.getSubscriptionById(id);

      if (!subscription) {
        res.status(404).json({
          success: false,
          message: 'Subscription not found',
        });
        return;
      }

      if (subscription.tenantId.toString() !== req.user?.tenantId) {
        res.status(403).json({
          success: false,
          message: 'You do not have access to this subscription',
        });
        return;
      }

      const cancelledSubscription = await SubscriptionService.cancelSubscription(
        id,
        req.user?.userId
      );

      res.status(200).json({
        success: true,
        message: 'Subscription cancelled',
        data: cancelledSubscription,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to cancel subscription',
      });
    }
  }
}
