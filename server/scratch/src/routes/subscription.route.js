import express from 'express';
import { SubscriptionController } from '../controllers/subscription.controller.js';
import { verifyToken, isRestaurantOwner, isSuperAdmin } from '../middleware/auth.middleware.js';
const router = express.Router();
/**
 * All routes are protected.
 * `/current` is visible to restaurant owners and super admins.
 * Mutating and historical subscription endpoints remain super-admin only.
 */
// GET current active subscription
router.get('/current', verifyToken, isRestaurantOwner, SubscriptionController.getCurrentSubscription);
// GET list of subscriptions for the tenant
router.get('/', verifyToken, isSuperAdmin, SubscriptionController.getSubscriptionsByTenantId);
// GET details of a single subscription
router.get('/:id', verifyToken, isSuperAdmin, SubscriptionController.getSubscriptionById);
// Create a new active subscription (enforces single active subscription)
router.post('/', verifyToken, isSuperAdmin, SubscriptionController.createSubscription);
// Cancel subscription (sets status = CANCELLED)
router.patch('/:id/cancel', verifyToken, isSuperAdmin, SubscriptionController.cancelSubscription);
export default router;
