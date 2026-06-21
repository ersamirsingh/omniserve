// src/modules/analytics/routes/analytics.routes.ts

import { Router } from "express";
import { analyticsController } from "../controllers/analytics.controller.js";

import { verifyToken } from "../../middleware/auth.middleware.js";
// import { authorize } from "../../../middlewares/authorize.middleware.js";

const router = Router();

/**
 * Dashboard Summary
 * GET /api/v1/analytics/dashboard
 */
router.get(
  "/dashboard",
  verifyToken,
  analyticsController.getDashboardSummary.bind(
    analyticsController
  )
);

/**
 * Revenue Trend
 * GET /api/v1/analytics/revenue-trend
 */
router.get(
  "/revenue-trend",
  verifyToken,
  analyticsController.getRevenueTrend.bind(
    analyticsController
  )
);

/**
 * Revenue Growth
 * GET /api/v1/analytics/revenue-growth
 */
router.get(
  "/revenue-growth",
  verifyToken,
  analyticsController.getRevenueGrowth.bind(
    analyticsController
  )
);

/**
 * Top Selling Items
 * GET /api/v1/analytics/top-items
 */
router.get(
  "/top-items",
  verifyToken,
  analyticsController.getTopSellingItems.bind(
    analyticsController
  )
);

/**
 * Peak Hours
 * GET /api/v1/analytics/peak-hours
 */
router.get(
  "/peak-hours",
  verifyToken,
  analyticsController.getPeakHours.bind(
    analyticsController
  )
);

/**
 * Customer Retention
 * GET /api/v1/analytics/customer-retention
 */
router.get(
  "/customer-retention",
  verifyToken,
  analyticsController.getCustomerRetention.bind(
    analyticsController
  )
);

/**
 * Outlet Comparison
 * GET /api/v1/analytics/outlet-comparison
 */
router.get(
  "/outlet-comparison",
  verifyToken,
  analyticsController.getOutletComparison.bind(
    analyticsController
  )
);

export default router;