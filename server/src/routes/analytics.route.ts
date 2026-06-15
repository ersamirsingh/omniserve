import express, { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller.js';
import { verifyToken, isOutletManager } from '../middleware/auth.middleware.js';

const router: Router = express.Router();

// Daily analytics routes
router.post('/daily', verifyToken, isOutletManager, AnalyticsController.upsertDailyMetrics);
router.get('/daily', verifyToken, isOutletManager, AnalyticsController.getDailyStats);

// Aggregated tenant summary
router.get('/summary', verifyToken, isOutletManager, AnalyticsController.getSummaryStats);

// Review analytics routes
// IMPORTANT: Place /reviews/sentiment before any parametric /reviews/:id routes to prevent collisions
router.get('/reviews/sentiment', verifyToken, isOutletManager, AnalyticsController.getSentimentSummary);
router.post('/reviews', verifyToken, AnalyticsController.createReview);
router.get('/reviews', verifyToken, isOutletManager, AnalyticsController.getReviews);
router.delete('/reviews/:id', verifyToken, isOutletManager, AnalyticsController.deleteReview);

export default router;
