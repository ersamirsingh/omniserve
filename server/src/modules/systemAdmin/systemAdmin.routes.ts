import { Router } from 'express';
import { SystemAdminController } from './systemAdmin.controller.js';
import { HealthController } from '../health/health.controller.js';
import { verifyToken } from '../../middlewares/auth.middleware.js';
import { requireSystemAdmin } from '../../middlewares/rbac.middleware.js';
import { rateLimiter } from '../../middlewares/rateLimiter.middleware.js';

const router = Router();

const acceptInviteLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many attempts to accept invitation. Please try again after 15 minutes.',
});

const inviteLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many invitations sent. Please try again after 15 minutes.',
});

const adminGeneralLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

router.post('/accept-invite', acceptInviteLimiter, SystemAdminController.acceptInvite);

router.use(verifyToken);
router.use(requireSystemAdmin);
router.use(adminGeneralLimiter);

router.post('/invites', inviteLimiter, SystemAdminController.inviteAdmin);
router.get('/invites', SystemAdminController.getInvites);
router.delete('/invites/:id', SystemAdminController.revokeInvite);

router.get('/tenants', SystemAdminController.listTenants);
router.get('/tenants/:id', SystemAdminController.getTenantDetail);
router.post('/tenants/:id/status', SystemAdminController.updateTenantStatus);
router.post('/tenants/:id/subscription-override', SystemAdminController.overrideSubscription);
router.post('/tenants/:id/subscription/override', SystemAdminController.overrideSubscription);
router.delete('/tenants/:id', SystemAdminController.deleteTenant);

router.get('/users/search', SystemAdminController.searchUsers);

router.get('/admins', SystemAdminController.listSystemAdmins);

router.get('/audit-logs', SystemAdminController.getAuditLogs);

router.get('/health/detailed', HealthController.getDetailedHealth);

router.get('/health/stats', SystemAdminController.getHealthStats);

router.get('/schema/graph', SystemAdminController.getSchemaGraph);

router.get('/issues', SystemAdminController.listIssues);
router.post('/issues', SystemAdminController.createIssue);
router.post('/issues/:id/comments', SystemAdminController.addComment);
router.post('/issues/:id/status', SystemAdminController.updateIssueStatus);

export default router;
