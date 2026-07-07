import express, { Router } from 'express';
import { WebhookController } from "./webhook.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";

const router: Router = express.Router();

// Dashboard Logs Management (Auth required)
// Define these BEFORE any parametric routes to avoid collisions
router.get('/logs', verifyToken, WebhookController.listLogs);
router.get('/logs/:id', verifyToken, WebhookController.getLogById);
router.post('/logs/:id/retry', verifyToken, WebhookController.retryLog);

// Public Webhook Intake callbacks (No auth required)
router.post('/:provider', WebhookController.receiveWebhook);

export default router;
