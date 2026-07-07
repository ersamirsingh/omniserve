import express, { Router } from 'express';
import { PaymentController } from "./payment.controller.js";
import { verifyToken, isOutletManager } from "../../middlewares/auth.middleware.js";

const router: Router = express.Router();

// List payments (Auth required, any role)
router.get('/', verifyToken, PaymentController.listPayments);

// Get payment by order ID (Auth required, any role)
// Mount this sub-endpoint before parametric /:id routes to avoid collision
router.get('/order/:orderId', verifyToken, PaymentController.getPaymentByOrderId);

// Process a payment (Auth required, any role)
router.post('/', verifyToken, PaymentController.createPayment);

// Process a refund (Auth required, restricted to Outlet Manager or above)
router.patch('/:id/refund', verifyToken, isOutletManager, PaymentController.refundPayment);

// Get payment details by ID (Auth required, any role)
router.get('/:id', verifyToken, PaymentController.getPaymentById);

export default router;
