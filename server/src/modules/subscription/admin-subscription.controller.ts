import { Request, Response } from "express";
import { Types } from "mongoose";
import { SubscriptionRepository } from "./subscription.repository.js";
import { SubscriptionService } from "./subscription.service.js";
import { createPlanSchema, updatePlanSchema } from "./subscription.validator.js";
import { ApiResponseHandler } from "../../utils/apiResponse.js";
import { SubscriptionStatus, BillingCycle, InvoiceStatus } from "./subscription.enum.js";
import RestaurantSubscriptionModel from "../../models/subscription.model.js";
import InvoiceModel from "../../models/invoice.model.js";

export class AdminSubscriptionController {
  /**
   * GET /plans
   * Lists all subscription plans (including inactive ones for admins)
   */
  static async listPlans(req: Request, res: Response): Promise<void> {
    try {
      const plans = await SubscriptionRepository.listPlans(true);
      ApiResponseHandler.success(res, 200, "Plans retrieved successfully", { plans });
    } catch (error: any) {
      console.error("[AdminSubscriptionController] listPlans error:", error);
      ApiResponseHandler.internalError(res, error.message || "Failed to retrieve plans");
    }
  }

  /**
   * POST /plans
   * Creates a new plan
   */
  static async createPlan(req: Request, res: Response): Promise<void> {
    try {
      const validated = createPlanSchema.parse(req.body);
      const plan = await SubscriptionRepository.createPlan(validated as any);
      ApiResponseHandler.success(res, 201, "Plan created successfully", { plan });
    } catch (error: any) {
      console.error("[AdminSubscriptionController] createPlan error:", error);
      ApiResponseHandler.badRequest(res, error.message || "Failed to create plan");
    }
  }

  /**
   * PUT /plans/:id
   * Updates an existing plan
   */
  static async updatePlan(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      if (!id || !Types.ObjectId.isValid(id)) {
        ApiResponseHandler.badRequest(res, "Invalid plan ID");
        return;
      }
      const validated = updatePlanSchema.parse(req.body);
      const plan = await SubscriptionRepository.updatePlan(id as string, validated as any);
      if (!plan) {
        ApiResponseHandler.notFound(res, "Plan not found");
        return;
      }
      ApiResponseHandler.success(res, 200, "Plan updated successfully", { plan });
    } catch (error: any) {
      console.error("[AdminSubscriptionController] updatePlan error:", error);
      ApiResponseHandler.badRequest(res, error.message || "Failed to update plan");
    }
  }

  /**
   * DELETE /plans/:id
   * Soft deletes a plan
   */
  static async deletePlan(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      if (!id || !Types.ObjectId.isValid(id)) {
        ApiResponseHandler.badRequest(res, "Invalid plan ID");
        return;
      }
      const plan = await SubscriptionRepository.deletePlan(id as string);
      if (!plan) {
        ApiResponseHandler.notFound(res, "Plan not found");
        return;
      }
      ApiResponseHandler.success(res, 200, "Plan deleted successfully", { plan });
    } catch (error: any) {
      console.error("[AdminSubscriptionController] deletePlan error:", error);
      ApiResponseHandler.internalError(res, error.message || "Failed to delete plan");
    }
  }

  /**
   * GET /subscriptions
   * Lists all active tenant subscriptions globally
   */
  static async listSubscriptions(req: Request, res: Response): Promise<void> {
    try {
      const limit = Number(req.query.limit) || 20;
      const skip = Number(req.query.skip) || 0;
      const result = await SubscriptionRepository.listSubscriptions({}, limit, skip);
      ApiResponseHandler.success(res, 200, "Subscriptions list retrieved successfully", result);
    } catch (error: any) {
      console.error("[AdminSubscriptionController] listSubscriptions error:", error);
      ApiResponseHandler.internalError(res, error.message || "Failed to retrieve subscriptions");
    }
  }

  /**
   * GET /subscription/:id
   * Get detail of a specific subscription
   */
  static async getSubscriptionById(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      if (!id || !Types.ObjectId.isValid(id)) {
        ApiResponseHandler.badRequest(res, "Invalid subscription ID");
        return;
      }
      const subscription = await SubscriptionRepository.findSubscriptionById(id as string);
      if (!subscription) {
        ApiResponseHandler.notFound(res, "Subscription not found");
        return;
      }
      ApiResponseHandler.success(res, 200, "Subscription retrieved successfully", { subscription });
    } catch (error: any) {
      console.error("[AdminSubscriptionController] getSubscriptionById error:", error);
      ApiResponseHandler.internalError(res, error.message || "Failed to retrieve subscription");
    }
  }

  /**
   * GET /invoices
   * Lists all invoices globally
   */
  static async listInvoices(req: Request, res: Response): Promise<void> {
    try {
      const limit = Number(req.query.limit) || 20;
      const skip = Number(req.query.skip) || 0;
      const result = await SubscriptionRepository.listAllInvoices(limit, skip);
      ApiResponseHandler.success(res, 200, "Invoices retrieved successfully", result);
    } catch (error: any) {
      console.error("[AdminSubscriptionController] listInvoices error:", error);
      ApiResponseHandler.internalError(res, error.message || "Failed to retrieve invoices");
    }
  }

  /**
   * GET /analytics
   * Aggregates SaaS recurring revenue metrics (MRR, ARR, Conversion, Expiring, Churn)
   */
  static async getAnalytics(req: Request, res: Response): Promise<void> {
    try {
      // 1. Fetch all active paid subscriptions
      const activeSubs = await RestaurantSubscriptionModel.find({
        status: SubscriptionStatus.ACTIVE,
        isDeleted: false,
      }).populate("planId");

      let mrr = 0;
      let arr = 0;
      let paidUsers = activeSubs.length;

      for (const sub of activeSubs) {
        const plan = sub.planId as any;
        if (!plan) continue;

        const basePrice = sub.billingCycle === BillingCycle.MONTHLY ? plan.monthlyPrice : plan.yearlyPrice;
        if (sub.billingCycle === BillingCycle.MONTHLY) {
          mrr += basePrice;
          arr += basePrice * 12;
        } else {
          mrr += basePrice / 12;
          arr += basePrice;
        }
      }

      // 2. Fetch Trial Users
      const trialUsers = await RestaurantSubscriptionModel.countDocuments({
        status: SubscriptionStatus.TRIAL,
        isDeleted: false,
      });

      // 3. Fetch expiring soon (next 7 days)
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      const expiringSoon = await RestaurantSubscriptionModel.countDocuments({
        status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL, SubscriptionStatus.GRACE_PERIOD] },
        endDate: { $lte: sevenDaysFromNow, $gte: new Date() },
        isDeleted: false,
      });

      // 4. Compute overall historical revenue from paid invoices
      const revenueAgg = await InvoiceModel.aggregate([
        { $match: { status: InvoiceStatus.PAID, isDeleted: false } },
        { $group: { _id: null, totalRevenue: { $sum: "$total" } } },
      ]);
      const revenue = revenueAgg[0]?.totalRevenue || 0;

      // 5. Popular plans count
      const planStats = await RestaurantSubscriptionModel.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: "$planId", count: { $sum: 1 } } },
        { $lookup: { from: "subscriptionplans", localField: "_id", foreignField: "_id", as: "plan" } },
        { $unwind: "$plan" },
        { $project: { name: "$plan.name", count: 1 } },
      ]);

      ApiResponseHandler.success(res, 200, "SaaS Analytics retrieved successfully", {
        mrr: parseFloat(mrr.toFixed(2)),
        arr: parseFloat(arr.toFixed(2)),
        trialUsers,
        paidUsers,
        expiringSoon,
        revenue,
        planStats,
        arpu: paidUsers > 0 ? parseFloat((mrr / paidUsers).toFixed(2)) : 0,
      });
    } catch (error: any) {
      console.error("[AdminSubscriptionController] getAnalytics error:", error);
      ApiResponseHandler.internalError(res, error.message || "Failed to retrieve analytics");
    }
  }
}
