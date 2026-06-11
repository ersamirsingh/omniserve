import express, { Router } from 'express';
import { OutletController } from '../controllers/outlet.controller.js';
import {
  verifyToken,
  optionalAuth,
  isRestaurantOwner,
  isOutletManager,
} from '../middleware/auth.middleware.js';

const router: Router = express.Router();

/**
 * Public routes (no auth required, but optional auth is applied to support tenant isolation if logged in)
 * 
 * CRITICAL ORDERING CONCERN: Mount the public static `/nearby` route BEFORE parametric `/:id` routes
 * to prevent route parameter collision.
 */
router.get('/nearby', optionalAuth, OutletController.findNearbyOutlets);

/**
 * Protected routes (requires token verification)
 */

// List outlets for tenant
router.get('/', verifyToken, OutletController.listOutlets);

// Create a new outlet under a restaurant (restaurant owner role check)
router.post('/', verifyToken, isRestaurantOwner, OutletController.createOutlet);

// Get outlet details by ID
router.get('/:id', verifyToken, OutletController.getOutletById);

// Update outlet details (restaurant owner role check)
router.put('/:id', verifyToken, isRestaurantOwner, OutletController.updateOutlet);

// Activate/deactivate outlet (restaurant owner role check)
router.patch('/:id/status', verifyToken, isRestaurantOwner, OutletController.toggleOutletStatus);

// Update operating hours (restaurant owner or outlet manager role check)
router.patch('/:id/operating-hours', verifyToken, isOutletManager, OutletController.updateOperatingHours);

// Soft-delete outlet (restaurant owner role check)
router.delete('/:id', verifyToken, isRestaurantOwner, OutletController.deleteOutlet);

export default router;
