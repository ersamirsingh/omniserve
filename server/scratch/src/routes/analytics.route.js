import express from 'express';
import { AnalyticsController } from '../controllers/analytics.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';
const router = express.Router();
// Daily analytics routes
router.post('/daily', verifyToken, AnalyticsController.upsertDailyMetrics);
router.get('/daily', verifyToken, AnalyticsController.getDailyStats);
// Aggregated tenant summary
router.get('/summary', verifyToken, AnalyticsController.getSummaryStats);
// Review analytics routes
// IMPORTANT: Place /reviews/sentiment before any parametric /reviews/:id routes to prevent collisions
router.get('/reviews/sentiment', verifyToken, AnalyticsController.getSentimentSummary);
router.post('/reviews', verifyToken, AnalyticsController.createReview);
router.get('/reviews', verifyToken, AnalyticsController.getReviews);
router.delete('/reviews/:id', verifyToken, AnalyticsController.deleteReview);
export default router;
