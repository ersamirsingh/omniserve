import express, { Router } from 'express';
import { NotificationController } from "./notification.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";

const router: Router = express.Router();

router.get('/', verifyToken, NotificationController.listNotifications);

router.patch('/read-all', verifyToken, NotificationController.markAllAsRead);

router.patch('/:id/read', verifyToken, NotificationController.markAsRead);

router.delete('/:id', verifyToken, NotificationController.deleteNotification);

export default router;
