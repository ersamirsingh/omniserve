import express, { Router } from 'express';
import { CategoryController } from "./category.controller.js";
import { verifyToken, isOutletManager } from "../../middlewares/auth.middleware.js";

const router: Router = express.Router();

router.get('/', verifyToken, CategoryController.listCategories);

router.post('/', verifyToken, isOutletManager, CategoryController.createCategory);

router.get('/:id', verifyToken, CategoryController.getCategoryById);

router.put('/:id', verifyToken, isOutletManager, CategoryController.updateCategory);

router.patch('/:id/order', verifyToken, isOutletManager, CategoryController.updateCategoryOrder);

router.delete('/:id', verifyToken, isOutletManager, CategoryController.deleteCategory);

export default router;
