import crypto from 'crypto';
import { Types } from 'mongoose';
import User from '../../models/user.model.js';
import Tenant from '../../models/tenant.model.js';
import Outlet from '../../models/outlet.model.js';
import Restaurant from '../../models/restaurant.model.js';
import Order from '../../models/order.model.js';
import SubscriptionPlanModel from '../../models/subscriptionPlan.model.js';
import RestaurantSubscriptionModel from '../../models/subscription.model.js';
import SystemAdminInvite from '../../models/systemAdminInvite.model.js';
import { AuditLogService } from '../auditLog/auditLog.service.js';
import { EmailService } from '../notification/email.service.js';
import { AuthService } from '../auth/auth.service.js';
import { UserRole, UserStatus, AuditAction, SubscriptionPlan } from '../../models/enums.js';

export class SystemAdminService {

  static async inviteSystemAdmin(
    email: string,
    invitedByUserId: string,
    reqIp?: string,
    reqUserAgent?: string
  ): Promise<any> {
    const formattedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: formattedEmail, role: UserRole.SYSTEM_ADMIN });
    if (existingUser) {
      throw new Error('Email is already registered as a system administrator');
    }

    const activeInvite = await SystemAdminInvite.findOne({
      email: formattedEmail,
      status: 'PENDING',
      expiresAt: { $gt: new Date() },
    });
    if (activeInvite) {
      throw new Error('A pending invite already exists for this email');
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);

    const invite = new SystemAdminInvite({
      email: formattedEmail,
      invitedBy: new Types.ObjectId(invitedByUserId),
      token: hashedToken,
      status: 'PENDING',
      expiresAt,
    });
    await invite.save();

    const invitingAdmin = await User.findById(invitedByUserId);
    const invitingName = invitingAdmin ? invitingAdmin.fullName : 'A System Administrator';

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const inviteUrl = `${clientUrl}/system-admin/accept-invite?token=${rawToken}`;

    await EmailService.sendMail({
      to: formattedEmail,
      subject: 'Set up your system administrator account',
      text: `Hello,\n\n${invitingName} has invited you to set up your System Administrator account.\n\nPlease complete your setup by visiting this link: ${inviteUrl}\n\nNote: This link will expire in 48 hours.\n\nThank you!`,
      html: `<p>Hello,</p><p><strong>${invitingName}</strong> has invited you to set up your System Administrator account.</p><p><a href="${inviteUrl}" style="padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px; display: inline-block;">Set up your account</a></p><p>Or copy this link to your browser: <br/><code>${inviteUrl}</code></p><p><em>Note: This link will expire in 48 hours.</em></p>`,
    });

    const inviteAuditData: any = {
      userId: invitedByUserId,
      action: AuditAction.SYSTEM_ADMIN_INVITED,
      entityType: 'SystemAdminInvite',
      entityId: invite._id.toString(),
      newData: { invitedEmail: formattedEmail },
    };
    if (reqIp) inviteAuditData.ipAddress = reqIp;
    if (reqUserAgent) inviteAuditData.userAgent = reqUserAgent;
    await AuditLogService.createAuditLog(null, inviteAuditData);

    return {
      id: invite._id,
      email: invite.email,
      status: invite.status,
      expiresAt: invite.expiresAt,
    };
  }

  static async getInvites(): Promise<any[]> {
    return await SystemAdminInvite.find()
      .populate('invitedBy', 'firstName lastName email')
      .sort({ createdAt: -1 });
  }

  static async revokeInvite(inviteId: string, actorUserId: string, reqIp?: string, reqUserAgent?: string): Promise<void> {
    const invite = await SystemAdminInvite.findById(inviteId);
    if (!invite) {
      throw new Error('Invite not found');
    }
    if (invite.status !== 'PENDING') {
      throw new Error(`Invite cannot be revoked (current status is ${invite.status})`);
    }

    invite.status = 'REVOKED';
    await invite.save();

    const revokeAuditData: any = {
      userId: actorUserId,
      action: AuditAction.SYSTEM_ADMIN_INVITE_REVOKED,
      entityType: 'SystemAdminInvite',
      entityId: inviteId,
    };
    if (reqIp) revokeAuditData.ipAddress = reqIp;
    if (reqUserAgent) revokeAuditData.userAgent = reqUserAgent;
    await AuditLogService.createAuditLog(null, revokeAuditData);
  }

  static async acceptInvite(
    token: string,
    name: string,
    password: string,
    clientIp?: string,
    clientUserAgent?: string
  ): Promise<any> {

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const invite = await SystemAdminInvite.findOne({ token: hashedToken });

    if (!invite) {
      throw new Error('Invalid or unrecognized invitation token');
    }

    if (invite.status !== 'PENDING') {
      throw new Error(`Invitation has already been ${invite.status.toLowerCase()}`);
    }

    if (invite.expiresAt < new Date()) {
      throw new Error('Invitation link has expired');
    }

    const nameParts = name.trim().split(/\s+/);
    const firstName = nameParts[0] || 'Admin';
    const lastName = nameParts.slice(1).join(' ') || 'User';

    const passwordHash = await AuthService.hashPassword(password);
    const user = new User({
      firstName,
      lastName,
      email: invite.email,
      passwordHash,
      role: UserRole.SYSTEM_ADMIN,
      tenantId: null,
      status: UserStatus.ACTIVE,
      invitationAccepted: true,
    });
    await user.save();

    invite.status = 'ACCEPTED';
    await invite.save();

    const acceptAuditData: any = {
      userId: user._id.toString(),
      action: AuditAction.SYSTEM_ADMIN_INVITE_ACCEPTED,
      entityType: 'User',
      entityId: user._id.toString(),
    };
    if (clientIp) acceptAuditData.ipAddress = clientIp;
    if (clientUserAgent) acceptAuditData.userAgent = clientUserAgent;
    await AuditLogService.createAuditLog(null, acceptAuditData);

    const tokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      status: user.status,
    };

    const accessToken = AuthService.generateAccessToken(tokenPayload);
    const refreshToken = await AuthService.generateRefreshToken(
      user._id.toString(),
      null,
      clientIp,
      clientUserAgent
    );

    return {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        status: user.status,
      },
      accessToken,
      refreshToken,
    };
  }

  static async listTenants(filters: {
    search?: string;
    status?: string;
    subscriptionPlan?: string;
    limit: number;
    skip: number;
  }): Promise<{ tenants: any[]; total: number }> {
    const query: any = { isDeleted: false };

    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { slug: { $regex: filters.search, $options: 'i' } },
      ];
    }
    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.subscriptionPlan) {
      query.subscriptionPlan = filters.subscriptionPlan;
    }

    const [tenants, total] = await Promise.all([
      Tenant.find(query)
        .sort({ createdAt: -1 })
        .limit(filters.limit)
        .skip(filters.skip),
      Tenant.countDocuments(query),
    ]);

    const tenantsWithSubscriptions = await Promise.all(
      tenants.map(async (tenant) => {
        const sub = await RestaurantSubscriptionModel.findOne({
          tenantId: tenant._id,
          isDeleted: false,
        }).populate('planId', 'name monthlyPrice yearlyPrice');

        return {
          id: tenant._id,
          name: tenant.name,
          slug: tenant.slug,
          status: tenant.status,
          subscriptionPlan: tenant.subscriptionPlan,
          createdAt: tenant.createdAt,
          subscription: sub
            ? {
                id: sub._id,
                status: sub.status,
                planName: (sub.planId as any)?.name || 'Unknown',
                endDate: sub.endDate,
                trialEndsAt: sub.trialEndsAt,
              }
            : null,
        };
      })
    );

    return { tenants: tenantsWithSubscriptions, total };
  }

  static async getTenantDetail(tenantId: string): Promise<any> {
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const restaurants = await Restaurant.find({ tenantId, isDeleted: false });
    const outlets = await Outlet.find({ tenantId, isDeleted: false });
    const userCount = await User.countDocuments({ tenantId, isDeleted: false });
    const orderVolume = await Order.countDocuments({ tenantId, isDeleted: false });
    const activeSubscription = await RestaurantSubscriptionModel.findOne({
      tenantId,
      isDeleted: false,
    }).populate('planId');

    return {
      tenant: {
        id: tenant._id,
        name: tenant.name,
        slug: tenant.slug,
        status: tenant.status,
        subscriptionPlan: tenant.subscriptionPlan,
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt,
      },
      activeSubscription,
      restaurants,
      outlets,
      userCount,
      orderVolume,
    };
  }

  static async updateTenantStatus(
    tenantId: string,
    status: UserStatus,
    reason: string,
    actorUserId: string,
    reqIp?: string,
    reqUserAgent?: string
  ): Promise<any> {
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const oldStatus = tenant.status;
    tenant.status = status;
    await tenant.save();

    await Outlet.updateMany({ tenantId }, { $set: { status } });

    const action = status === UserStatus.ACTIVE ? AuditAction.TENANT_ACTIVATE : AuditAction.TENANT_SUSPEND;
    const statusAuditData: any = {
      userId: actorUserId,
      action,
      entityType: 'Tenant',
      entityId: tenantId,
      oldData: { status: oldStatus },
      newData: { status, reason },
    };
    if (reqIp) statusAuditData.ipAddress = reqIp;
    if (reqUserAgent) statusAuditData.userAgent = reqUserAgent;
    await AuditLogService.createAuditLog(tenantId, statusAuditData);

    return tenant;
  }

  static async deleteTenant(
    tenantId: string,
    reason: string,
    actorUserId: string,
    reqIp?: string,
    reqUserAgent?: string
  ): Promise<any> {
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    tenant.isDeleted = true;
    await tenant.save();

    await Outlet.updateMany({ tenantId }, { $set: { isDeleted: true } });

    const deleteAuditData: any = {
      userId: actorUserId,
      action: AuditAction.TENANT_DELETE,
      entityType: 'Tenant',
      entityId: tenantId,
      newData: { reason },
    };
    if (reqIp) deleteAuditData.ipAddress = reqIp;
    if (reqUserAgent) deleteAuditData.userAgent = reqUserAgent;
    await AuditLogService.createAuditLog(tenantId, deleteAuditData);

    return tenant;
  }

  static async overrideSubscription(
    tenantId: string,
    payload: {
      planId: string;
      status: string;
      trialEndsAt?: string | null;
      endDate?: string | null;
      amount?: number;
      billingCycle?: 'MONTHLY' | 'YEARLY';
    },
    actorUserId: string,
    reqIp?: string,
    reqUserAgent?: string
  ): Promise<any> {
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const plan = await SubscriptionPlanModel.findById(payload.planId);
    if (!plan) {
      throw new Error('Subscription plan not found');
    }

    let tenantPlanEnum = SubscriptionPlan.FREE;
    if (plan.slug === 'pro') tenantPlanEnum = SubscriptionPlan.PRO;
    if (plan.slug === 'super') tenantPlanEnum = SubscriptionPlan.SUPER;

    let subscription = await RestaurantSubscriptionModel.findOne({
      tenantId,
      isDeleted: false,
    });

    const oldData = subscription ? subscription.toObject() : null;

    const restaurant = await Restaurant.findOne({ tenantId, isDeleted: false });
    const restaurantId = restaurant ? restaurant._id : new Types.ObjectId();

    const trialEndsAtDate = payload.trialEndsAt ? new Date(payload.trialEndsAt) : null;
    const endDateDate = payload.endDate ? new Date(payload.endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const subscriptionData = {
      tenantId: tenant._id,
      restaurantId,
      planId: plan._id,
      plan: tenantPlanEnum,
      amount: payload.amount !== undefined ? payload.amount : plan.monthlyPrice,
      status: payload.status,
      billingCycle: payload.billingCycle || 'MONTHLY',
      startDate: new Date(),
      endDate: endDateDate,
      nextBillingDate: endDateDate,
      trialEndsAt: trialEndsAtDate,
      graceEndsAt: null,
      renewalEnabled: true,
      paymentProvider: 'manual',
    };

    if (subscription) {
      subscription = await RestaurantSubscriptionModel.findOneAndUpdate(
        { _id: subscription._id },
        { $set: subscriptionData },
        { new: true }
      );
    } else {
      subscription = new RestaurantSubscriptionModel(subscriptionData);
      await subscription.save();
    }

    tenant.subscriptionPlan = tenantPlanEnum;
    await tenant.save();

    const overrideAuditData: any = {
      userId: actorUserId,
      action: AuditAction.TENANT_OVERRIDE_SUBSCRIPTION,
      entityType: 'Subscription',
      entityId: subscription!._id.toString(),
      oldData: oldData ? (oldData as unknown as Record<string, unknown>) : null,
      newData: payload as Record<string, unknown>,
    };
    if (reqIp) overrideAuditData.ipAddress = reqIp;
    if (reqUserAgent) overrideAuditData.userAgent = reqUserAgent;
    await AuditLogService.createAuditLog(tenantId, overrideAuditData);

    return subscription;
  }

  static async globalSearchUsers(search: string): Promise<any[]> {
    if (!search || search.trim().length < 2) {
      throw new Error('Search query must be at least 2 characters long');
    }

    const query = {
      $or: [
        { email: { $regex: search.trim(), $options: 'i' } },
        { phone: { $regex: search.trim(), $options: 'i' } },
      ],
      isDeleted: false,
    };

    return await User.find(query)
      .populate('tenantId', 'name slug status')
      .populate('restaurantId', 'name')
      .populate('outletId', 'name')
      .sort({ createdAt: -1 });
  }
}
