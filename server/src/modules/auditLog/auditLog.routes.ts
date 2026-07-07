import express, { Router } from 'express';
import { AuditLogController } from "./auditLog.controller.js";
import { verifyToken, isSuperAdmin } from "../../middlewares/auth.middleware.js";

const router: Router = express.Router();

// Get audit logs listing (Auth required, SuperAdmin only)
router.get('/', verifyToken, isSuperAdmin, AuditLogController.listAuditLogs);

// Get specific audit log by ID (Auth required, SuperAdmin only)
router.get('/:id', verifyToken, isSuperAdmin, AuditLogController.getAuditLogById);

export default router;
