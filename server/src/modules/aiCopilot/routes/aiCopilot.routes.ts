import { Router } from 'express';
import { verifyToken, authorizeRole } from '../../../middlewares/auth.middleware.js';
import { AICopilotController } from '../controllers/aiCopilot.controller.js';
import { UserRole } from '../../../models/enums.js';

const router = Router();

// Secure chat route accessible to all authenticated roles
router.post('/chat', verifyToken, AICopilotController.handleChat);

// Chat Sessions Lifecycle Routes
router.get('/chats', verifyToken, AICopilotController.listSessions);
router.post('/chats', verifyToken, AICopilotController.createSession);
router.get('/chats/:id', verifyToken, AICopilotController.getSession);
router.delete('/chats/:id', verifyToken, AICopilotController.deleteSession);

// Sync trigger route restricted strictly to admins
router.post(
  '/sync',
  verifyToken,
  authorizeRole(UserRole.SYSTEM_ADMIN, UserRole.SUPER_ADMIN),
  AICopilotController.handleSync
);

export default router;
