import express, { Router } from 'express';
import { HelpRequestController } from './helpRequest.controller.js';
import { verifyToken, authorizeRole } from '../../middlewares/auth.middleware.js';
import { UserRole } from '../../models/enums.js';

const router: Router = express.Router();

router.post('/', verifyToken, HelpRequestController.createHelpRequest);
router.get('/', verifyToken, authorizeRole(UserRole.SYSTEM_ADMIN), HelpRequestController.listHelpRequests);
router.patch('/:id', verifyToken, authorizeRole(UserRole.SYSTEM_ADMIN), HelpRequestController.resolveHelpRequest);

export default router;
