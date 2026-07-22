import express, { Router } from 'express';
import { OrderController } from "./order.controller.js";
import { verifyToken, isOutletManager } from "../../middlewares/auth.middleware.js";

const router: Router = express.Router();

router.get('/', verifyToken, OrderController.listOrders);

router.post('/', verifyToken, OrderController.placeOrder);

router.patch('/:id/status', verifyToken, OrderController.updateOrderStatus);

router.patch('/:id/cancel', verifyToken, OrderController.cancelOrder);

router.get('/:id/items', verifyToken, OrderController.listOrderItems);

router.post('/:id/items', verifyToken, OrderController.addItemToOrder);

router.get('/:id', verifyToken, OrderController.getOrderById);

router.delete('/:id', verifyToken, isOutletManager, OrderController.deleteOrder);

export default router;
