import express from 'express';
import { WebhookController } from '../controllers/webhook.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';
const router = express.Router();
// Dashboard Logs Management (Auth required)
// Define these BEFORE any parametric routes to avoid collisions
router.get('/logs', verifyToken, WebhookController.listLogs);
router.get('/logs/:id', verifyToken, WebhookController.getLogById);
router.post('/logs/:id/retry', verifyToken, WebhookController.retryLog);
// Public Webhook Intake callbacks (No auth required)
router.post('/:provider', WebhookController.receiveWebhook);
export default router;
