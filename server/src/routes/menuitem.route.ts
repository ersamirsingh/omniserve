import express, { Router } from 'express';
import { MenuItemController } from '../controllers/menuitem.controller.js';
import { verifyToken, isOutletManager } from '../middleware/auth.middleware.js';

const router: Router = express.Router();

// Get list of menu items (Auth required, any role)
router.get('/', verifyToken, MenuItemController.listMenuItems);

// Create a new menu item (Auth required, Outlet Manager/Restaurant Owner or above)
router.post('/', verifyToken, isOutletManager, MenuItemController.createMenuItem);

// Toggle menu item availability (Auth required, Outlet Manager/Restaurant Owner or above)
// Mount this sub-endpoint before parametric /:id routes to avoid collision
router.patch('/:id/availability', verifyToken, isOutletManager, MenuItemController.toggleAvailability);

// Get menu item details by ID (Auth required, any role)
router.get('/:id', verifyToken, MenuItemController.getMenuItemById);

// Update menu item details (Auth required, Outlet Manager/Restaurant Owner or above)
router.put('/:id', verifyToken, isOutletManager, MenuItemController.updateMenuItem);

// Soft-delete menu item (Auth required, Outlet Manager/Restaurant Owner or above)
router.delete('/:id', verifyToken, isOutletManager, MenuItemController.deleteMenuItem);

export default router;
