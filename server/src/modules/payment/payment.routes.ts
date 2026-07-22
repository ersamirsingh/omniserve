import express, { Router } from 'express';
import { PaymentController } from "./payment.controller.js";
import { verifyToken, isOutletManager } from "../../middlewares/auth.middleware.js";

const router: Router = express.Router();

router.get('/', verifyToken, PaymentController.listPayments);

router.get('/order/:orderId', verifyToken, PaymentController.getPaymentByOrderId);

router.post('/', verifyToken, PaymentController.createPayment);

router.patch('/:id/refund', verifyToken, isOutletManager, PaymentController.refundPayment);

router.get('/:id', verifyToken, PaymentController.getPaymentById);

export default router;
