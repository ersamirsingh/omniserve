import express from 'express';
import { AuditLogController } from '../controllers/auditlog.controller.js';
import { verifyToken, isSuperAdmin } from '../middleware/auth.middleware.js';
const router = express.Router();
// Get audit logs listing (Auth required, SuperAdmin only)
router.get('/', verifyToken, isSuperAdmin, AuditLogController.listAuditLogs);
// Get specific audit log by ID (Auth required, SuperAdmin only)
router.get('/:id', verifyToken, isSuperAdmin, AuditLogController.getAuditLogById);
export default router;
