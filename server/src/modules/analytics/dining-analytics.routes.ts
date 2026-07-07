import { Router } from "express";
import { DiningAnalyticsController } from "./dining-analytics.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";

const router = Router();

/** GET /api/v1/dining-analytics/summary — dining operations analytics (query: outletId, from, to) */
router.get("/summary", verifyToken, DiningAnalyticsController.getSummary);

export default router;
