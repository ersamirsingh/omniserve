import express, { Router } from 'express';
import { AnalyticsController } from "./analytics.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";

const router: Router = express.Router();

router.post('/daily', verifyToken, AnalyticsController.upsertDailyMetrics);
router.get('/daily', verifyToken, AnalyticsController.getDailyStats);

router.get('/summary', verifyToken, AnalyticsController.getSummaryStats);
router.get('/extended', verifyToken, AnalyticsController.getExtendedStats);

router.get('/reviews/sentiment', verifyToken, AnalyticsController.getSentimentSummary);
router.post('/reviews', verifyToken, AnalyticsController.createReview);
router.get('/reviews', verifyToken, AnalyticsController.getReviews);
router.delete('/reviews/:id', verifyToken, AnalyticsController.deleteReview);

export default router;
