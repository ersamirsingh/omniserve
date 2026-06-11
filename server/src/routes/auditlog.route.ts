import express, { Router } from 'express';
import { AuditLogController } from '../controllers/auditlog.controller.js';
import { verifyToken, isRestaurantOwner } from '../middleware/auth.middleware.js';

const router: Router = express.Router();

// Get audit logs listing (Auth required, Owner/SuperAdmin only)
router.get('/', verifyToken, isRestaurantOwner, AuditLogController.listAuditLogs);

// Get specific audit log by ID (Auth required, Owner/SuperAdmin only)
router.get('/:id', verifyToken, isRestaurantOwner, AuditLogController.getAuditLogById);

export default router;
