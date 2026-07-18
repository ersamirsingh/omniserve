import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Tenant, Restaurant, Outlet, User, MenuItem, Order, Payment, AuditLog, Customer, Issue } from '../../models/index.js';
import Reservation from '../../models/reservation.model.js';
import HelpRequest from '../../models/helpRequest.model.js';
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

  /**
   * Run visual database stats diagnostics and anomaly prediction
   */
  static async getHealthStats(req: Request, res: Response): Promise<void> {
    try {
      // 1. Gather document counts for key models
      const [
        tenantsCount,
        restaurantsCount,
        outletsCount,
        usersCount,
        menuItemsCount,
        ordersCount,
        paymentsCount,
        auditLogsCount,
        customersCount,
        reservationsCount,
        helpRequestsCount,
      ] = await Promise.all([
        Tenant.estimatedDocumentCount().catch(() => 0),
        Restaurant.estimatedDocumentCount().catch(() => 0),
        Outlet.estimatedDocumentCount().catch(() => 0),
        User.estimatedDocumentCount().catch(() => 0),
        MenuItem.estimatedDocumentCount().catch(() => 0),
        Order.estimatedDocumentCount().catch(() => 0),
        Payment.estimatedDocumentCount().catch(() => 0),
        AuditLog.estimatedDocumentCount().catch(() => 0),
        Customer.estimatedDocumentCount().catch(() => 0),
        Reservation.estimatedDocumentCount().catch(() => 0),
        HelpRequest.estimatedDocumentCount().catch(() => 0),
      ]);

      // 2. Fetch connection stats
      let dbStats = { db: 'omniserve', collections: 0, objects: 0, dataSize: 0, storageSize: 0, indexSize: 0 };
      try {
        if (mongoose.connection.db) {
          const stats = await mongoose.connection.db.stats();
          dbStats = {
            db: stats.db,
            collections: stats.collections,
            objects: stats.objects,
            dataSize: stats.dataSize,
            storageSize: stats.storageSize,
            indexSize: stats.indexSize,
          };
        }
      } catch (err) {
        console.error('Failed to get database stats:', err);
      }

      // 3. Problem predictions / Anomaly detection checks
      const predictions: any[] = [];

      // Check open support tickets count
      const openHelpTickets = await HelpRequest.countDocuments({ status: { $ne: 'RESOLVED' } }).catch(() => 0);
      if (openHelpTickets > 5) {
        predictions.push({
          type: 'WARNING',
          category: 'SUPPORT',
          title: 'High Support Ticket Queue',
          message: `There are currently ${openHelpTickets} open support/need-help queries. Response times might degrade.`,
          suggestion: 'Assign staff or address outstanding tickets immediately.',
        });
      }

      // Check orders stuck in non-final states for over 12 hours
      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
      const stuckOrders = await Order.countDocuments({
        status: { $nin: ['COMPLETED', 'CANCELLED', 'DELIVERED'] },
        createdAt: { $lt: twelveHoursAgo }
      }).catch(() => 0);

      if (stuckOrders > 0) {
        predictions.push({
          type: 'WARNING',
          category: 'DATABASE',
          title: 'Stuck Active Orders Detected',
          message: `${stuckOrders} order(s) are stuck in progress for over 12 hours without finalization.`,
          suggestion: 'Run the system cleanup script or investigate hanging orders.',
        });
      }

      // Check for high audit log volume in last 24h
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentAuditLogs = await AuditLog.countDocuments({ createdAt: { $gt: oneDayAgo } }).catch(() => 0);
      if (recentAuditLogs > 500) {
        predictions.push({
          type: 'INFO',
          category: 'PERFORMANCE',
          title: 'High Activity Volume',
          message: `${recentAuditLogs} system audit log entries created in the last 24 hours.`,
          suggestion: 'Ensure database query indexing is optimized to prevent performance degradation.',
        });
      }

      // Check DB storage warning
      const indexRatio = dbStats.storageSize > 0 ? (dbStats.indexSize / dbStats.storageSize) * 100 : 0;
      if (indexRatio > 50) {
        predictions.push({
          type: 'WARNING',
          category: 'STORAGE',
          title: 'High Index Storage Ratio',
          message: `Index size (${(dbStats.indexSize / (1024 * 1024)).toFixed(2)} MB) is over 50% of data size.`,
          suggestion: 'Analyze collection indexes and drop unused indexes to optimize disk usage.',
        });
      }

      // If no issues, add all-clear
      if (predictions.length === 0) {
        predictions.push({
          type: 'OPTIMAL',
          category: 'SYSTEM',
          title: 'All Systems Operating Normally',
          message: 'No performance bottlenecks, stuck records, or support ticket surges detected.',
          suggestion: 'None required.',
        });
      }

      ApiResponseHandler.success(res, 200, 'Detailed DB visual stats retrieved successfully', {
        counts: {
          tenants: tenantsCount,
          restaurants: restaurantsCount,
          outlets: outletsCount,
          users: usersCount,
          menuItems: menuItemsCount,
          orders: ordersCount,
          payments: paymentsCount,
          auditLogs: auditLogsCount,
          customers: customersCount,
          reservations: reservationsCount,
          helpRequests: helpRequestsCount,
        },
        dbStats,
        predictions,
      });
    } catch (error: any) {
      ApiResponseHandler.badRequest(res, error.message || 'Failed to retrieve detailed db stats');
    }
  }

  /**
   * Get DB schema graph node/edge definitions for visual map representation
   */
  static async getSchemaGraph(req: Request, res: Response): Promise<void> {
    try {
      const nodes = [
        { id: 'Tenant', label: 'Tenant', group: 'core', fields: ['name', 'slug', 'status', 'subscriptionPlan'] },
        { id: 'User', label: 'User', group: 'core', fields: ['firstName', 'lastName', 'email', 'role', 'status'] },
        { id: 'Restaurant', label: 'Restaurant', group: 'core', fields: ['name', 'slug', 'status', 'tenantId'] },
        { id: 'Outlet', label: 'Outlet', group: 'core', fields: ['name', 'phone', 'email', 'status', 'restaurantId'] },
        { id: 'Category', label: 'Category', group: 'menu', fields: ['name', 'description', 'isActive', 'outletId'] },
        { id: 'MenuItem', label: 'MenuItem', group: 'menu', fields: ['name', 'price', 'description', 'categoryId', 'outletId'] },
        { id: 'Variant', label: 'Variant', group: 'menu', fields: ['name', 'price', 'menuItemId'] },
        { id: 'Addon', label: 'Addon', group: 'menu', fields: ['name', 'price', 'menuItemId'] },
        { id: 'Order', label: 'Order', group: 'sales', fields: ['orderNumber', 'status', 'total', 'customerId', 'outletId'] },
        { id: 'OrderItem', label: 'OrderItem', group: 'sales', fields: ['quantity', 'price', 'orderId', 'menuItemId'] },
        { id: 'Payment', label: 'Payment', group: 'sales', fields: ['amount', 'status', 'method', 'orderId', 'tenantId'] },
        { id: 'Customer', label: 'Customer', group: 'crm', fields: ['fullName', 'email', 'phone', 'tenantId'] },
        { id: 'Reservation', label: 'Reservation', group: 'ops', fields: ['guestName', 'partySize', 'scheduledAt', 'status', 'tableId', 'outletId'] },
        { id: 'Table', label: 'Table', group: 'ops', fields: ['tableNumber', 'seatCount', 'operationalStatus', 'outletId'] },
        { id: 'HelpRequest', label: 'HelpRequest', group: 'support', fields: ['description', 'status', 'userRole', 'userId', 'outletId'] },
        { id: 'AuditLog', label: 'AuditLog', group: 'system', fields: ['action', 'entityType', 'entityId', 'userId', 'tenantId'] },
        { id: 'WebhookLog', label: 'WebhookLog', group: 'system', fields: ['event', 'url', 'status', 'tenantId'] },
        { id: 'Subscription', label: 'Subscription', group: 'finance', fields: ['status', 'startDate', 'endDate', 'tenantId'] },
      ];

      const edges = [
        { from: 'Restaurant', to: 'Tenant', label: 'tenantId' },
        { from: 'User', to: 'Tenant', label: 'tenantId' },
        { from: 'Outlet', to: 'Restaurant', label: 'restaurantId' },
        { from: 'Category', to: 'Outlet', label: 'outletId' },
        { from: 'MenuItem', to: 'Category', label: 'categoryId' },
        { from: 'MenuItem', to: 'Outlet', label: 'outletId' },
        { from: 'Variant', to: 'MenuItem', label: 'menuItemId' },
        { from: 'Addon', to: 'MenuItem', label: 'menuItemId' },
        { from: 'Order', to: 'Customer', label: 'customerId' },
        { from: 'Order', to: 'Outlet', label: 'outletId' },
        { from: 'OrderItem', to: 'Order', label: 'orderId' },
        { from: 'OrderItem', to: 'MenuItem', label: 'menuItemId' },
        { from: 'Payment', to: 'Order', label: 'orderId' },
        { from: 'Payment', to: 'Tenant', label: 'tenantId' },
        { from: 'Customer', to: 'Tenant', label: 'tenantId' },
        { from: 'Reservation', to: 'Table', label: 'tableId' },
        { from: 'Reservation', to: 'Outlet', label: 'outletId' },
        { from: 'Table', to: 'Outlet', label: 'outletId' },
        { from: 'HelpRequest', to: 'User', label: 'userId' },
        { from: 'HelpRequest', to: 'Outlet', label: 'outletId' },
        { from: 'AuditLog', to: 'User', label: 'userId' },
        { from: 'AuditLog', to: 'Tenant', label: 'tenantId' },
        { from: 'WebhookLog', to: 'Tenant', label: 'tenantId' },
        { from: 'Subscription', to: 'Tenant', label: 'tenantId' },
      ];

      ApiResponseHandler.success(res, 200, 'Database schema relationship graph retrieved successfully', { nodes, edges });
    } catch (error: any) {
      ApiResponseHandler.badRequest(res, error.message || 'Failed to retrieve schema graph');
    }
  }

  /**
   * List all system admin tracking issues
   */
  static async listIssues(req: Request, res: Response): Promise<void> {
    try {
      const issues = await Issue.find().sort({ updatedAt: -1 }).populate('assigneeId', 'firstName lastName email');
      ApiResponseHandler.success(res, 200, 'Tracking issues retrieved successfully', issues);
    } catch (error: any) {
      ApiResponseHandler.badRequest(res, error.message || 'Failed to retrieve tracking issues');
    }
  }

  /**
   * Create an issue manually
   */
  static async createIssue(req: Request, res: Response): Promise<void> {
    try {
      const { title, description, type, priority, tenantId, restaurantId, outletId } = req.body;
      const reporterId = req.user?.userId;

      // Resolve reporter user details
      let reporterName = 'System Admin';
      let reporterEmail = '';
      if (reporterId) {
        const reporterUser = await User.findById(reporterId);
        if (reporterUser) {
          reporterName = `${reporterUser.firstName || ''} ${reporterUser.lastName || ''}`.trim() || 'System Admin';
          reporterEmail = reporterUser.email || '';
        }
      }

      const issue = await Issue.create({
        title,
        description,
        type,
        priority,
        tenantId: tenantId || null,
        restaurantId: restaurantId || null,
        outletId: outletId || null,
        reporterId,
        reporterName,
        reporterEmail,
        status: 'OPEN',
        comments: [],
      });

      ApiResponseHandler.success(res, 201, 'Tracking issue created successfully', issue);
    } catch (error: any) {
      ApiResponseHandler.badRequest(res, error.message || 'Failed to create tracking issue');
    }
  }

  /**
   * Post comment/update on an issue thread
   */
  static async addComment(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { message } = req.body;
      const authorId = req.user?.userId;

      if (!authorId) {
        ApiResponseHandler.unauthorized(res, 'User context not found');
        return;
      }

      const authorUser = await User.findById(authorId);
      if (!authorUser) {
        ApiResponseHandler.badRequest(res, 'Author user not found');
        return;
      }

      const authorName = `${authorUser.firstName || ''} ${authorUser.lastName || ''}`.trim() || authorUser.email;

      const issue = await Issue.findById(id);
      if (!issue) {
        ApiResponseHandler.notFound(res, 'Tracking issue not found');
        return;
      }

      issue.comments.push({
        authorId: new mongoose.Types.ObjectId(authorId),
        authorName,
        message,
        createdAt: new Date(),
      });

      // Touch updatedAt timestamp
      issue.markModified('comments');
      await issue.save();

      ApiResponseHandler.success(res, 200, 'Comment added to issue thread successfully', issue);
    } catch (error: any) {
      ApiResponseHandler.badRequest(res, error.message || 'Failed to add comment');
    }
  }

  /**
   * Change status or assignment of an issue
   */
  static async updateIssueStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status, assigneeId } = req.body;
      const actorUserId = req.user?.userId;

      const issue = await Issue.findById(id);
      if (!issue) {
        ApiResponseHandler.notFound(res, 'Tracking issue not found');
        return;
      }

      const actorUser = await User.findById(actorUserId);
      const actorName = actorUser ? `${actorUser.firstName || ''} ${actorUser.lastName || ''}`.trim() : 'System Admin';

      if (status && status !== issue.status) {
        const oldStatus = issue.status;
        issue.status = status;
        issue.comments.push({
          authorId: new mongoose.Types.ObjectId(actorUserId),
          authorName: 'System Log',
          message: `${actorName} changed issue status from ${oldStatus} to ${status}.`,
          createdAt: new Date(),
        });
      }

      if (assigneeId !== undefined) {
        const oldAssigneeId = issue.assigneeId;
        if (assigneeId === null || assigneeId === '') {
          issue.assigneeId = null as any;
          issue.comments.push({
            authorId: new mongoose.Types.ObjectId(actorUserId),
            authorName: 'System Log',
            message: `${actorName} unassigned this issue.`,
            createdAt: new Date(),
          });
        } else {
          issue.assigneeId = new mongoose.Types.ObjectId(assigneeId);
          const assigneeUser = await User.findById(assigneeId);
          const assigneeName = assigneeUser ? `${assigneeUser.firstName || ''} ${assigneeUser.lastName || ''}`.trim() : 'another administrator';
          issue.comments.push({
            authorId: new mongoose.Types.ObjectId(actorUserId),
            authorName: 'System Log',
            message: `${actorName} assigned this issue to ${assigneeName}.`,
            createdAt: new Date(),
          });
        }
      }

      issue.markModified('comments');
      await issue.save();

      ApiResponseHandler.success(res, 200, 'Tracking issue updated successfully', issue);
    } catch (error: any) {
      ApiResponseHandler.badRequest(res, error.message || 'Failed to update tracking issue');
    }
  }
  /**
   * List all system admin users (for issue assignment dropdown)
   */
  static async listSystemAdmins(req: Request, res: Response): Promise<void> {
    try {
      const admins = await User.find({ role: 'SYSTEM_ADMIN', isDeleted: false })
        .select('firstName lastName email _id')
        .sort({ firstName: 1 });
      ApiResponseHandler.success(res, 200, 'System administrators retrieved successfully', admins);
    } catch (error: any) {
      ApiResponseHandler.badRequest(res, error.message || 'Failed to retrieve system admins');
    }
  }
}

