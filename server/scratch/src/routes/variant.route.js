import express from 'express';
import { VariantController } from '../controllers/variant.controller.js';
import { verifyToken, isOutletManager } from '../middleware/auth.middleware.js';
const router = express.Router();
// List variants for a menu item (Auth required, any role)
router.get('/', verifyToken, VariantController.listVariants);
// Create a new variant (Auth required, Outlet Manager/Restaurant Owner or above)
router.post('/', verifyToken, isOutletManager, VariantController.createVariant);
// Update variant details (Auth required, Outlet Manager/Restaurant Owner or above)
router.put('/:id', verifyToken, isOutletManager, VariantController.updateVariant);
// Soft-delete variant (Auth required, Outlet Manager/Restaurant Owner or above)
router.delete('/:id', verifyToken, isOutletManager, VariantController.deleteVariant);
export default router;
