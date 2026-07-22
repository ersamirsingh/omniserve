import express, { Router } from 'express';
import { InventoryController } from "./inventory.controller.js";
import { verifyToken, isOutletManager } from "../../middlewares/auth.middleware.js";

const router: Router = express.Router();

router.get('/', verifyToken, InventoryController.listInventory);

router.get('/low-stock', verifyToken, InventoryController.listLowStock);

router.post('/', verifyToken, isOutletManager, InventoryController.createInventory);

router.get('/:id', verifyToken, InventoryController.getInventoryById);

router.patch('/:id/quantity', verifyToken, InventoryController.updateQuantity);

export default router;
