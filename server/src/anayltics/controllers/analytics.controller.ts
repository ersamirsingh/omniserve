// src/modules/analytics/controllers/analytics.controller.ts

import { Request, Response, NextFunction } from "express";
import { analyticsService } from "../services/index.js";

class AnalyticsController {
  /**
   * Dashboard Summary
   * GET /analytics/dashboard
   */
  async getDashboardSummary(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const outletId = req.query.outletId as string | undefined;

      const data =
        await analyticsService.getDashboardSummary(
          tenantId,
          outletId
        );

      return res.status(200).json({
        success: true,
        message: "Dashboard summary fetched successfully",
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Revenue Trend
   * GET /analytics/revenue-trend
   */
  async getRevenueTrend(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const tenantId = req.user?.tenantId;

      const { startDate, endDate, outletId } = req.query;

      const data =
        await analyticsService.getRevenueTrend(
          tenantId!,
          new Date(startDate as string),
          new Date(endDate as string),
          outletId as string | undefined
        );

      return res.status(200).json({
        success: true,
        message: "Revenue trend fetched successfully",
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Top Selling Items
   * GET /analytics/top-items
   */
  async getTopSellingItems(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const tenantId = req.user?.tenantId;

      const {
        startDate,
        endDate,
        limit,
      } = req.query;

      const data =
        await analyticsService.getTopSellingItems(
          tenantId!,
          new Date(startDate as string),
          new Date(endDate as string),
          Number(limit || 10)
        );

      return res.status(200).json({
        success: true,
        message: "Top items fetched successfully",
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Peak Hours
   * GET /analytics/peak-hours
   */
  async getPeakHours(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const tenantId = req.user?.tenantId;

      const {
        startDate,
        endDate,
        outletId,
      } = req.query;

      const data =
        await analyticsService.getPeakHours(
          tenantId!,
          new Date(startDate as string),
          new Date(endDate as string),
          outletId as string | undefined
        );

      return res.status(200).json({
        success: true,
        message: "Peak hours fetched successfully",
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Customer Retention
   * GET /analytics/customer-retention
   */
  async getCustomerRetention(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const tenantId = req.user?.tenantId;

      const {
        startDate,
        endDate,
      } = req.query;

      const data =
        await analyticsService.getCustomerRetention(
          tenantId!,
          new Date(startDate as string),
          new Date(endDate as string)
        );

      return res.status(200).json({
        success: true,
        message:
          "Customer retention fetched successfully",
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Outlet Comparison
   * GET /analytics/outlet-comparison
   */
  async getOutletComparison(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const tenantId = req.user?.tenantId;

      const data =
        await analyticsService.getOutletComparison(
          tenantId!
        );

      return res.status(200).json({
        success: true,
        message:
          "Outlet comparison fetched successfully",
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Revenue Growth
   * GET /analytics/revenue-growth
   */
  async getRevenueGrowth(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const tenantId = req.user?.tenantId;

      const {
        currentStart,
        currentEnd,
        previousStart,
        previousEnd,
        outletId,
      } = req.query;

      const growth =
        await analyticsService.getRevenueGrowth(
          tenantId!,
          new Date(currentStart as string),
          new Date(currentEnd as string),
          new Date(previousStart as string),
          new Date(previousEnd as string),
          outletId as string | undefined
        );

      return res.status(200).json({
        success: true,
        message:
          "Revenue growth calculated successfully",
        data: {
          growthPercentage: growth,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const analyticsController =
  new AnalyticsController();