import express, { Router } from 'express';
import { InventoryController } from '../controllers/inventory.controller.js';
import { verifyToken, isOutletManager } from '../middleware/auth.middleware.js';

const router: Router = express.Router();

// Get list of inventory records (Auth required, any role)
router.get('/', verifyToken, InventoryController.listInventory);

// Get list of low stock inventory records (Auth required, any role)
// Mount this sub-endpoint before parametric /:id routes to avoid collision
router.get('/low-stock', verifyToken, InventoryController.listLowStock);

// Create a new inventory record (Auth required, Outlet Manager/Restaurant Owner or above)
router.post('/', verifyToken, isOutletManager, InventoryController.createInventory);

// Get inventory details by ID (Auth required, any role)
router.get('/:id', verifyToken, InventoryController.getInventoryById);

// Update inventory stock quantity (Auth required, all roles including Staff allowed per requirement)
router.patch('/:id/quantity', verifyToken, InventoryController.updateQuantity);

export default router;
