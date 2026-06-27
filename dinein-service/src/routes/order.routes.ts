import { Router } from 'express';
import { createOrder, listOrders, updateOrderStatus } from '../controllers/order.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createOrderSchema, updateOrderStatusSchema } from '../validators/order.validators.js';

const router = Router();

router.get('/', listOrders);
router.post('/', validate(createOrderSchema), createOrder);
router.patch('/:orderId/status', validate(updateOrderStatusSchema), updateOrderStatus);

export default router;
