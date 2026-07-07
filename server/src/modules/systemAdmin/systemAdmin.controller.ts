import { Request, Response } from 'express';
import { SystemAdminService } from './systemAdmin.service.js';
import { AuditLogService } from '../auditLog/auditLog.service.js';
import { ApiResponseHandler } from '../../utils/apiResponse.js';
import {
  sendInviteSchema,
  acceptInviteSchema,
  tenantStatusSchema,
  subscriptionOverrideSchema,
} from './systemAdmin.validator.js';
import { UserStatus } from '../../models/enums.js';

export class SystemAdminController {
  /**
   * Invite a new system admin
   */
  static async inviteAdmin(req: Request, res: Response): Promise<void> {
    try {
      const validated = sendInviteSchema.parse(req.body);
      const actorUserId = req.user?.userId;

      if (!actorUserId) {
        ApiResponseHandler.unauthorized(res, 'User context not found');
        return;
      }

      const invite = await SystemAdminService.inviteSystemAdmin(
        validated.email,
        actorUserId,
        req.ip,
        req.get('user-agent')
      );

      ApiResponseHandler.success(res, 201, 'System administrator invite created and sent successfully', invite);
    } catch (error: any) {
      ApiResponseHandler.badRequest(res, error.message || 'Failed to create invite');
    }
  }

  /**
   * List all invites
   */
  static async getInvites(req: Request, res: Response): Promise<void> {
    try {
      const invites = await SystemAdminService.getInvites();
      ApiResponseHandler.success(res, 200, 'System administrator invites retrieved successfully', invites);
    } catch (error: any) {
      ApiResponseHandler.badRequest(res, error.message || 'Failed to retrieve invites');
    }
  }

  /**
   * Revoke a pending invite
   */
  static async revokeInvite(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const actorUserId = req.user?.userId;

      if (!actorUserId) {
        ApiResponseHandler.unauthorized(res, 'User context not found');
        return;
      }

      await SystemAdminService.revokeInvite(id as string, actorUserId, req.ip, req.get('user-agent'));
      ApiResponseHandler.success(res, 200, 'Invite revoked successfully');
    } catch (error: any) {
      ApiResponseHandler.badRequest(res, error.message || 'Failed to revoke invite');
    }
  }

  /**
   * Accept invite and create system admin user
   */
  static async acceptInvite(req: Request, res: Response): Promise<void> {
    try {
      const validated = acceptInviteSchema.parse(req.body);

      const result = await SystemAdminService.acceptInvite(
        validated.token,
        validated.name,
        validated.password,
        req.ip,
        req.get('user-agent')
      );

      // Set auth cookies for auto-login
      res.cookie('accessToken', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000,
      });

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      ApiResponseHandler.success(res, 200, 'System administrator account set up successfully', {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    } catch (error: any) {
      ApiResponseHandler.badRequest(res, error.message || 'Failed to accept invite');
    }
  }

  /**
   * List tenants with filters, search, and pagination
   */
  static async listTenants(req: Request, res: Response): Promise<void> {
    try {
      const search = req.query.search as string | undefined;
      const status = req.query.status as string | undefined;
      const subscriptionPlan = req.query.subscriptionPlan as string | undefined;
      const page = parseInt(req.query.page as string || '1');
      const limit = parseInt(req.query.limit as string || '10');
      const skip = (page - 1) * limit;

      const listFilters: any = { limit, skip };
      if (search) listFilters.search = search;
      if (status) listFilters.status = status;
      if (subscriptionPlan) listFilters.subscriptionPlan = subscriptionPlan;

      const result = await SystemAdminService.listTenants(listFilters);

      ApiResponseHandler.success(res, 200, 'Tenants retrieved successfully', {
        tenants: result.tenants,
        total: result.total,
        page,
        limit,
      });
    } catch (error: any) {
      ApiResponseHandler.badRequest(res, error.message || 'Failed to list tenants');
    }
  }

  /**
   * View details of a single tenant
   */
  static async getTenantDetail(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const detail = await SystemAdminService.getTenantDetail(id as string);
      ApiResponseHandler.success(res, 200, 'Tenant details retrieved successfully', detail);
    } catch (error: any) {
      ApiResponseHandler.notFound(res, error.message || 'Tenant details not found');
    }
  }

  /**
   * Suspend or Activate a tenant, cascading to outlets
   */
  static async updateTenantStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const validated = tenantStatusSchema.parse(req.body);
      const actorUserId = req.user?.userId;

      if (!actorUserId) {
        ApiResponseHandler.unauthorized(res, 'User context not found');
        return;
      }

      const tenant = await SystemAdminService.updateTenantStatus(
        id as string,
        validated.status as UserStatus,
        validated.reason,
        actorUserId,
        req.ip,
        req.get('user-agent')
      );

      ApiResponseHandler.success(res, 200, `Tenant status updated to ${validated.status.toLowerCase()} successfully`, tenant);
    } catch (error: any) {
      ApiResponseHandler.badRequest(res, error.message || 'Failed to update tenant status');
    }
  }

  /**
   * Soft delete a tenant, cascading to outlets
   */
  static async deleteTenant(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const actorUserId = req.user?.userId;

      if (!actorUserId) {
        ApiResponseHandler.unauthorized(res, 'User context not found');
        return;
      }

      if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
        ApiResponseHandler.badRequest(res, 'A delete reason of at least 5 characters is required');
        return;
      }

      const tenant = await SystemAdminService.deleteTenant(
        id as string,
        reason,
        actorUserId,
        req.ip,
        req.get('user-agent')
      );

      ApiResponseHandler.success(res, 200, 'Tenant soft deleted successfully', tenant);
    } catch (error: any) {
      ApiResponseHandler.badRequest(res, error.message || 'Failed to delete tenant');
    }
  }

  /**
   * Manually override a tenant's subscription plan, trial, and dates
   */
  static async overrideSubscription(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const validated = subscriptionOverrideSchema.parse(req.body);
      const actorUserId = req.user?.userId;

      if (!actorUserId) {
        ApiResponseHandler.unauthorized(res, 'User context not found');
        return;
      }

      const overrides: any = {
        planId: validated.planId,
        status: validated.status,
      };
      if (validated.trialEndsAt !== undefined) overrides.trialEndsAt = validated.trialEndsAt;
      if (validated.endDate !== undefined) overrides.endDate = validated.endDate;
      if (validated.amount !== undefined) overrides.amount = validated.amount;
      if (validated.billingCycle !== undefined) overrides.billingCycle = validated.billingCycle;

      const subscription = await SystemAdminService.overrideSubscription(
        id as string,
        overrides,
        actorUserId,
        req.ip,
        req.get('user-agent')
      );

      ApiResponseHandler.success(res, 200, 'Tenant subscription overridden successfully', subscription);
    } catch (error: any) {
      ApiResponseHandler.badRequest(res, error.message || 'Failed to override subscription');
    }
  }

  /**
   * Global search across all tenants for a user by email or phone
   */
  static async searchUsers(req: Request, res: Response): Promise<void> {
    try {
      const search = req.query.search as string || '';
      const users = await SystemAdminService.globalSearchUsers(search);
      ApiResponseHandler.success(res, 200, 'User search results retrieved successfully', users);
    } catch (error: any) {
      ApiResponseHandler.badRequest(res, error.message || 'Failed to search users');
    }
  }

  /**
   * View audit logs across all tenants
   */
  static async getAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.query.tenantId as string | undefined;
      const userId = req.query.userId as string | undefined;
      const action = req.query.action as string | undefined;
      const entityType = req.query.entityType as string | undefined;
      const from = req.query.from as string | undefined;
      const to = req.query.to as string | undefined;
      const page = parseInt(req.query.page as string || '1');
      const limit = parseInt(req.query.limit as string || '20');
      const skip = (page - 1) * limit;

      const filters: any = { limit, skip };
      if (tenantId) filters.tenantId = tenantId;
      if (userId) filters.userId = userId;
      if (action) filters.action = action;
      if (entityType) filters.entityType = entityType;
      if (from) filters.from = from;
      if (to) filters.to = to;

      const result = await AuditLogService.getGlobalAuditLogs(filters);

      ApiResponseHandler.success(res, 200, 'Global audit logs retrieved successfully', {
        logs: result.logs,
        total: result.total,
        page,
        limit,
      });
    } catch (error: any) {
      ApiResponseHandler.badRequest(res, error.message || 'Failed to retrieve global audit logs');
    }
  }
}
