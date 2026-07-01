import express from 'express';
import { AddonController } from '../controllers/addon.controller.js';
import { verifyToken, isOutletManager } from '../middleware/auth.middleware.js';
const router = express.Router();
// List addons for a menu item (Auth required, any role)
router.get('/', verifyToken, AddonController.listAddons);
// Create a new addon (Auth required, Outlet Manager/Restaurant Owner or above)
router.post('/', verifyToken, isOutletManager, AddonController.createAddon);
// Update addon details (Auth required, Outlet Manager/Restaurant Owner or above)
router.put('/:id', verifyToken, isOutletManager, AddonController.updateAddon);
// Soft-delete addon (Auth required, Outlet Manager/Restaurant Owner or above)
router.delete('/:id', verifyToken, isOutletManager, AddonController.deleteAddon);
export default router;
