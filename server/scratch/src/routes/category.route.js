import express from 'express';
import { CategoryController } from '../controllers/category.controller.js';
import { verifyToken, isOutletManager } from '../middleware/auth.middleware.js';
const router = express.Router();
// Get list of categories (Auth required, any role)
router.get('/', verifyToken, CategoryController.listCategories);
// Create a new category (Auth required, Outlet Manager/Restaurant Owner or above)
router.post('/', verifyToken, isOutletManager, CategoryController.createCategory);
// Get category details by ID (Auth required, any role)
router.get('/:id', verifyToken, CategoryController.getCategoryById);
// Update category details (Auth required, Outlet Manager/Restaurant Owner or above)
router.put('/:id', verifyToken, isOutletManager, CategoryController.updateCategory);
// Update category display order (Auth required, Outlet Manager/Restaurant Owner or above)
router.patch('/:id/order', verifyToken, isOutletManager, CategoryController.updateCategoryOrder);
// Soft-delete category (Auth required, Outlet Manager/Restaurant Owner or above)
router.delete('/:id', verifyToken, isOutletManager, CategoryController.deleteCategory);
export default router;
