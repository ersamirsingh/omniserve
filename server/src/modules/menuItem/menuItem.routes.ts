import express, { Router } from 'express';
import { MenuItemController } from "./menuItem.controller.js";
import { verifyToken, isOutletManager } from "../../middlewares/auth.middleware.js";

const router: Router = express.Router();

router.get('/', verifyToken, MenuItemController.listMenuItems);

router.post('/', verifyToken, isOutletManager, MenuItemController.createMenuItem);

router.patch('/:id/availability', verifyToken, isOutletManager, MenuItemController.toggleAvailability);

router.get('/:id', verifyToken, MenuItemController.getMenuItemById);

router.put('/:id', verifyToken, isOutletManager, MenuItemController.updateMenuItem);

router.delete('/:id', verifyToken, isOutletManager, MenuItemController.deleteMenuItem);

export default router;
