import express from 'express';
import { OrderController } from '../controllers/order.controller.js';
import { verifyToken, isOutletManager } from '../middleware/auth.middleware.js';
const router = express.Router();
// List orders (Auth required, any role)
router.get('/', verifyToken, OrderController.listOrders);
// Place a new order (Auth required, any role)
router.post('/', verifyToken, OrderController.placeOrder);
// Update order status (Auth required, Staff and above allowed)
router.patch('/:id/status', verifyToken, OrderController.updateOrderStatus);
// Cancel order (Auth required, any role)
router.patch('/:id/cancel', verifyToken, OrderController.cancelOrder);
// List items for an order (Auth required, any role)
router.get('/:id/items', verifyToken, OrderController.listOrderItems);
// Add item to an existing order (Auth required, any role, pre-ACCEPTED only)
router.post('/:id/items', verifyToken, OrderController.addItemToOrder);
// Get order with details (items and payment) (Auth required, any role)
router.get('/:id', verifyToken, OrderController.getOrderById);
// Soft-delete order record (Auth required, Outlet Manager/Restaurant Owner or above)
router.delete('/:id', verifyToken, isOutletManager, OrderController.deleteOrder);
export default router;
