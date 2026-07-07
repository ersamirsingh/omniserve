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
router.delete('/tenants/:id', SystemAdminController.deleteTenant);
router.post('/tenants/:id/subscription-override', SystemAdminController.overrideSubscription);

// User search
router.get('/users/search', SystemAdminController.searchUsers);

// Audit logs
router.get('/audit-logs', SystemAdminController.getAuditLogs);

// Detailed health checks
router.get('/health/detailed', HealthController.getDetailedHealth);

export default router;
