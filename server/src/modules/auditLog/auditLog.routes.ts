import express, { Router } from 'express';
import { AuditLogController } from "./auditLog.controller.js";
import { verifyToken, isSuperAdmin } from "../../middlewares/auth.middleware.js";

const router: Router = express.Router();

router.get('/', verifyToken, isSuperAdmin, AuditLogController.listAuditLogs);

router.get('/:id', verifyToken, isSuperAdmin, AuditLogController.getAuditLogById);

export default router;
