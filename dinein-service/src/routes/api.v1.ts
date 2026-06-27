import { Router } from 'express';
import floorRoutes from './floor.routes.js';
import tableRoutes from './table.routes.js';
import sessionRoutes from './session.routes.js';
import reservationRoutes from './reservation.routes.js';
import orderRoutes from './order.routes.js';
import assistanceRoutes from './assistance.routes.js';
import billingRoutes from './billing.routes.js';
import { healthCheck } from '../controllers/health.controller.js';

const router = Router();

router.get('/health', healthCheck);
router.use('/floor', floorRoutes);
router.use('/tables', tableRoutes);
router.use('/sessions', sessionRoutes);
router.use('/reservations', reservationRoutes);
router.use('/orders', orderRoutes);
router.use('/assistance', assistanceRoutes);
router.use('/billing', billingRoutes);

export default router;
