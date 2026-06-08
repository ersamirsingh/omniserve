import express, { Router } from 'express';
import { SubscriptionController } from '../controllers/subscription.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';
import { checkSubscription } from '../middleware/checkSubscription.middleware.js';

const router: Router = express.Router();

/**
 * Public routes (no auth required)
 */

/**
 * Protected routes (requires authentication)
 */

/** Create a new subscription (admin/super-admin only) */
router.post('/', verifyToken, SubscriptionController.createSubscription);

/**  Get active subscription for current tenant */
router.get('/active', verifyToken, SubscriptionController.getActiveSubscription);

/** Get subscription details with plan info (requires active subscription) */
router.get('/details', verifyToken, checkSubscription, SubscriptionController.getSubscriptionDetails);

/**  Get all subscriptions for current tenan */
router.get('/', verifyToken, SubscriptionController.getSubscriptionsByTenantId);

/**  Get subscription by ID */
router.get('/:id', verifyToken, SubscriptionController.getSubscriptionById);

/** Update subscription plan */
router.patch('/:id/plan', verifyToken, SubscriptionController.updateSubscriptionPlan);

/** Extend subscription end date */
router.patch('/:id/extend', verifyToken, SubscriptionController.extendSubscription);

/** Cancel subscription */
router.delete('/:id', verifyToken, SubscriptionController.cancelSubscription);



export default router;
