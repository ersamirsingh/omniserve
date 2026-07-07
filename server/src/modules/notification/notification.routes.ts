import express, { Router } from 'express';
import { NotificationController } from "./notification.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";

const router: Router = express.Router();

// List notifications (Auth required)
router.get('/', verifyToken, NotificationController.listNotifications);

// Mark all notifications as read (Auth required)
// MUST be placed before /:id/read route to avoid collisions
router.patch('/read-all', verifyToken, NotificationController.markAllAsRead);

// Mark a specific notification as read (Auth required)
router.patch('/:id/read', verifyToken, NotificationController.markAsRead);

// Soft-delete a notification (Auth required)
router.delete('/:id', verifyToken, NotificationController.deleteNotification);

export default router;
