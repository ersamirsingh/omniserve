import { Router } from 'express';
import { SystemAdminController } from './systemAdmin.controller.js';
import { HealthController } from '../health/health.controller.js';
import { verifyToken } from '../../middlewares/auth.middleware.js';
import { requireSystemAdmin } from '../../middlewares/rbac.middleware.js';
import { rateLimiter } from '../../middlewares/rateLimiter.middleware.js';

const router = Router();

// Strict rate limiter for accept-invite (public endpoint) to prevent brute-forcing
const acceptInviteLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 5,
  message: 'Too many attempts to accept invitation. Please try again after 15 minutes.',
});

// Strict rate limiter for invites creation
const inviteLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many invitations sent. Please try again after 15 minutes.',
});

// General rate limiter for admin actions
const adminGeneralLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

// Public Endpoint
router.post('/accept-invite', acceptInviteLimiter, SystemAdminController.acceptInvite);

// Authenticated System Admin Route Guard
router.use(verifyToken);
router.use(requireSystemAdmin);
router.use(adminGeneralLimiter);

// Invites management
router.post('/invites', inviteLimiter, SystemAdminController.inviteAdmin);
router.get('/invites', SystemAdminController.getInvites);
router.delete('/invites/:id', SystemAdminController.revokeInvite);

// Tenant management
router.get('/tenants', SystemAdminController.listTenants);
router.get('/tenants/:id', SystemAdminController.getTenantDetail);
router.post('/tenants/:id/status', SystemAdminController.updateTenantStatus);
router.post('/tenants/:id/subscription-override', SystemAdminController.overrideSubscription);
router.post('/tenants/:id/subscription/override', SystemAdminController.overrideSubscription);
router.delete('/tenants/:id', SystemAdminController.deleteTenant);

// User search
router.get('/users/search', SystemAdminController.searchUsers);

// List all system admins (for issue assignment)
router.get('/admins', SystemAdminController.listSystemAdmins);

// Audit logs
router.get('/audit-logs', SystemAdminController.getAuditLogs);

// Detailed health checks
router.get('/health/detailed', HealthController.getDetailedHealth);

// Detailed database stats
router.get('/health/stats', SystemAdminController.getHealthStats);

// Schema relationship graph
router.get('/schema/graph', SystemAdminController.getSchemaGraph);

// Issue Tracker routes
router.get('/issues', SystemAdminController.listIssues);
router.post('/issues', SystemAdminController.createIssue);
router.post('/issues/:id/comments', SystemAdminController.addComment);
router.post('/issues/:id/status', SystemAdminController.updateIssueStatus);

export default router;
