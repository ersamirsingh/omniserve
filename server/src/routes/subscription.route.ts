import express, { Router } from 'express';
import { SubscriptionController } from '../controllers/subscription.controller.js';
import { verifyToken, isSuperAdmin } from '../middleware/auth.middleware.js';

const router: Router = express.Router();

/**
 * All routes are protected and restricted to SUPER_ADMIN
 */

// GET current active subscription
router.get('/current', verifyToken, isSuperAdmin, SubscriptionController.getCurrentSubscription);

// GET list of subscriptions for the tenant
router.get('/', verifyToken, isSuperAdmin, SubscriptionController.getSubscriptionsByTenantId);

// GET details of a single subscription
router.get('/:id', verifyToken, isSuperAdmin, SubscriptionController.getSubscriptionById);

// Create a new active subscription (enforces single active subscription)
router.post('/', verifyToken, isSuperAdmin, SubscriptionController.createSubscription);

// Cancel subscription (sets status = CANCELLED)
router.patch('/:id/cancel', verifyToken, isSuperAdmin, SubscriptionController.cancelSubscription);

export default router;
