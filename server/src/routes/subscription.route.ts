import express, { Router } from 'express';
import { SubscriptionController } from '../controllers/subscription.controller.js';
import { verifyToken, isRestaurantOwner } from '../middleware/auth.middleware.js';

const router: Router = express.Router();

/**
 * All routes are protected and restricted to RESTAURANT_OWNER and SUPER_ADMIN
 */

// GET current active subscription
router.get('/current', verifyToken, isRestaurantOwner, SubscriptionController.getCurrentSubscription);

// GET list of subscriptions for the tenant
router.get('/', verifyToken, isRestaurantOwner, SubscriptionController.getSubscriptionsByTenantId);

// GET details of a single subscription
router.get('/:id', verifyToken, isRestaurantOwner, SubscriptionController.getSubscriptionById);

// Create a new active subscription (enforces single active subscription)
router.post('/', verifyToken, isRestaurantOwner, SubscriptionController.createSubscription);

// Cancel subscription (sets status = CANCELLED)
router.patch('/:id/cancel', verifyToken, isRestaurantOwner, SubscriptionController.cancelSubscription);

export default router;