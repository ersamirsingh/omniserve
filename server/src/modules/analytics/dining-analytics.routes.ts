import { Router } from "express";
import { DiningAnalyticsController } from "./dining-analytics.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";

const router = Router();

router.get("/summary", verifyToken, DiningAnalyticsController.getSummary);

export default router;
