import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import { Types } from 'mongoose';
import User, { IUser } from '../models/user.model.js';
import Restaurant from '../models/restaurant.model.js';
import Outlet from '../models/outlet.model.js';
import { UserRole, UserStatus } from '../enums/enums.js';
import { escapeRegex } from '../utils/sanitize.utils.js';
import { RoleHierarchy } from '../utils/roleHierarchy.utils.js';
import { EmailService } from './email.service.js';
import { NotificationService } from './notification.service.js';
import { NotificationType } from '../enums/enums.js';

export class UserService {
  private static buildInviteLink(token: string): string {
    const baseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    return `${baseUrl.replace(/\/$/, '')}/login?invite=${encodeURIComponent(token)}`;
  }

  private static invitationExpiryDate(): Date {
    const days = Number(process.env.RESTAURANT_JOIN_INVITE_EXPIRY_DAYS || 7);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);
    return expiresAt;
  }

  /**
   * Check if an email is already in use by an active (non-deleted) user
   */
  private static async checkEmailConflict(email: string, excludeUserId?: string): Promise<void> {
    const query: any = {
      email: email.trim().toLowerCase(),
      isDeleted: false,
    };
    if (excludeUserId) {
      query._id = { $ne: new Types.ObjectId(excludeUserId) };
    }
    const exists = await User.findOne(query);
    if (exists) {
      throw new Error('A user with this email address already exists.');
    }
  }

  private static async validateAssignment(
    tenantId: string,
    data: any,
    actorRole?: UserRole,
    actorRestaurantId?: string,
    actorOutletId?: string
  ): Promise<void> {
    const role = data.role as UserRole;

    if (role === UserRole.RESTAURANT_OWNER && !data.restaurantId) {
      throw new Error('restaurantId is required for restaurant-scoped roles.');
    }

    if ([UserRole.OUTLET_MANAGER, UserRole.STAFF].includes(role) && (!data.restaurantId || !data.outletId)) {
      throw new Error('restaurantId and outletId are required for outlet-scoped roles.');
    }

    if (data.restaurantId) {
      const restaurant = await Restaurant.findOne({
        _id: new Types.ObjectId(data.restaurantId),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      });
      if (!restaurant) {
        throw new Error('Restaurant not found or access denied.');
      }
    }

    if (data.outletId) {
      const outlet = await Outlet.findOne({
        _id: new Types.ObjectId(data.outletId),
        tenantId: new Types.ObjectId(tenantId),
        ...(data.restaurantId ? { restaurantId: new Types.ObjectId(data.restaurantId) } : {}),
        isDeleted: false,
      });
      if (!outlet) {
        throw new Error('Outlet not found or does not belong to the selected restaurant.');
      }
    }

    if (actorRole === UserRole.RESTAURANT_OWNER && actorRestaurantId && data.restaurantId !== actorRestaurantId) {
      throw new Error('You can only assign users to your restaurant.');
    }

    if (actorRole === UserRole.OUTLET_MANAGER && actorOutletId && data.outletId !== actorOutletId) {
      throw new Error('You can only assign users to your outlet.');
    }
  }

  private static async sendInvitationEmailAndNotification(
    user: IUser,
    requestedRole: UserRole,
    password: string,
    inviteLink: string,
    restaurantId?: string,
    outletId?: string,
    inviterUserId?: string
  ): Promise<void> {
    const [restaurant, outlet] = await Promise.all([
      restaurantId ? Restaurant.findById(new Types.ObjectId(restaurantId)) : null,
      outletId ? Outlet.findById(new Types.ObjectId(outletId)) : null,
    ]);

    const restaurantName = restaurant?.name || 'Not assigned';
    const outletName = outlet?.name || 'Not assigned';

    await EmailService.sendMail({
      to: user.email,
      subject: `Invitation to join ${restaurantName}`,
      text: [
        `You have been invited as ${requestedRole}.`,
        `Invitation link: ${inviteLink}`,
        `Restaurant: ${restaurantName}`,
        outletId ? `Outlet: ${outletName}` : undefined,
        `Login email: ${user.email}`,
        `Temporary password: ${password}`,
        'After login, open Notifications and accept the invitation.',
      ].filter(Boolean).join('\n'),
      html: `
        <p>You have been invited as <strong>${requestedRole}</strong>.</p>
        <p><a href="${inviteLink}">Open invitation</a></p>
        <p><strong>Restaurant:</strong> ${restaurantName}</p>
        ${outletId ? `<p><strong>Outlet:</strong> ${outletName}</p>` : ''}
        <p><strong>Login email:</strong> ${user.email}</p>
        <p><strong>Temporary password:</strong> ${password}</p>
        <p>After login, open Notifications and accept the invitation.</p>
      `,
    });

    await NotificationService.createNotification(
      user.tenantId.toString(),
      user._id.toString(),
      'Invitation pending',
      `Accept your ${requestedRole} invitation for ${restaurantName}${outletId ? ` / ${outletName}` : ''}.`,
      NotificationType.SYSTEM,
      user._id.toString(),
      'UserInvitation',
      inviterUserId
    );
  }

  /**
   * Create a new User under a specific tenant
   */
  static async createUser(
    tenantId: string,
    data: any,
    creatorUserId: string,
    creatorRole?: UserRole,
    creatorRestaurantId?: string,
    creatorOutletId?: string
  ): Promise<IUser> {
    const emailClean = data.email.trim().toLowerCase();
    await this.checkEmailConflict(emailClean);

    if (creatorRole && !RoleHierarchy.canManageRole(creatorRole, data.role as UserRole)) {
      throw new Error('You can only create users with a role below your own role.');
    }

    await this.validateAssignment(tenantId, data, creatorRole, creatorRestaurantId, creatorOutletId);

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const isInvitation = data.role !== UserRole.SUPER_ADMIN;
    const invitationToken = isInvitation ? crypto.randomBytes(32).toString('hex') : null;
    const invitationLink = invitationToken ? this.buildInviteLink(invitationToken) : null;
    const newUser = new User({
      tenantId: new Types.ObjectId(tenantId),
      restaurantId: isInvitation ? null : data.restaurantId ? new Types.ObjectId(data.restaurantId) : undefined,
      outletId: isInvitation ? null : data.outletId ? new Types.ObjectId(data.outletId) : undefined,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      email: emailClean,
      phone: data.phone ? data.phone.trim() : undefined,
      passwordHash,
      role: isInvitation ? UserRole.STAFF : data.role,
      pendingRole: isInvitation ? data.role : null,
      pendingRestaurantId: isInvitation && data.restaurantId ? new Types.ObjectId(data.restaurantId) : null,
      pendingOutletId: isInvitation && data.outletId ? new Types.ObjectId(data.outletId) : null,
      invitationLink,
      invitationExpiresAt: isInvitation ? this.invitationExpiryDate() : null,
      invitationAccepted: !isInvitation,
      status: data.status || UserStatus.ACTIVE,
      createdBy: new Types.ObjectId(creatorUserId),
      updatedBy: new Types.ObjectId(creatorUserId),
    });

    const savedUser = await newUser.save();

    if (isInvitation) {
      await this.sendInvitationEmailAndNotification(
        savedUser,
        data.role,
        data.password,
        invitationLink || this.buildInviteLink(''),
        data.restaurantId,
        data.outletId,
        creatorUserId
      );
    }

    return savedUser;
  }

  static async acceptInvitation(userId: string, tenantId: string): Promise<IUser | null> {
    const user = await User.findOne({
      _id: new Types.ObjectId(userId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!user) return null;
    if (user.invitationAccepted || !user.pendingRole) {
      throw new Error('No pending invitation found for this user.');
    }

    if (user.invitationExpiresAt && user.invitationExpiresAt < new Date()) {
      throw new Error('Invitation link has expired.');
    }

    user.role = user.pendingRole;
    user.restaurantId = user.pendingRestaurantId || null;
    user.outletId = user.pendingOutletId || null;
    user.pendingRole = null;
    user.pendingRestaurantId = null;
    user.pendingOutletId = null;
    user.invitationLink = null;
    user.invitationExpiresAt = null;
    user.invitationAccepted = true;
    user.updatedBy = user._id;

    return user.save();
  }

  /**
   * List users with pagination, search, and filters (scoped to tenantId)
   */
  static async getUsers(
    tenantId: string,
    filters: { limit: number; skip: number; search?: string; role?: string; status?: string; restaurantId?: string; outletId?: string }
  ): Promise<{ users: IUser[]; total: number }> {
    const conditions: any[] = [
      { tenantId: new Types.ObjectId(tenantId) },
      { isDeleted: false }
    ];

    if (filters.search) {
      const safeSearch = escapeRegex(filters.search);
      const regex = new RegExp(safeSearch, 'i');
      conditions.push({
        $or: [
          { firstName: { $regex: regex } },
          { lastName: { $regex: regex } },
          { email: { $regex: regex } },
          { phone: { $regex: regex } },
        ]
      });
    }

    if (filters.role) {
      conditions.push({
        $or: [
          { role: filters.role },
          { pendingRole: filters.role }
        ]
      });
    }

    if (filters.status) {
      conditions.push({ status: filters.status });
    }

    if (filters.restaurantId) {
      const restId = new Types.ObjectId(filters.restaurantId);
      conditions.push({
        $or: [
          { restaurantId: restId },
          { pendingRestaurantId: restId }
        ]
      });
    }

    if (filters.outletId) {
      const outId = new Types.ObjectId(filters.outletId);
      conditions.push({
        $or: [
          { outletId: outId },
          { pendingOutletId: outId }
        ]
      });
    }

    const query = { $and: conditions };

    const [users, total] = await Promise.all([
      User.find(query)
        .sort({ createdAt: -1 })
        .limit(filters.limit)
        .skip(filters.skip),
      User.countDocuments(query),
    ]);

    return { users, total };
  }

  /**
   * Retrieve a user by ID (scoped to tenantId)
   */
  static async getUserById(id: string, tenantId: string): Promise<IUser | null> {
    return await User.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });
  }

  /**
   * Update a user's details (scoped to tenantId)
   */
  static async updateUser(
    id: string,
    tenantId: string,
    data: any,
    updaterUserId: string,
    updaterRole?: UserRole,
    updaterRestaurantId?: string,
    updaterOutletId?: string
  ): Promise<IUser | null> {
    const user = await User.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!user) {
      return null;
    }

    if (updaterRole && !RoleHierarchy.canManageRole(updaterRole, user.role as UserRole)) {
      throw new Error('You can only update users with a role below your own role.');
    }

    if (data.email) {
      const emailClean = data.email.trim().toLowerCase();
      if (emailClean !== user.email) {
        await this.checkEmailConflict(emailClean, id);
        user.email = emailClean;
      }
    }

    if (data.firstName !== undefined) user.firstName = data.firstName.trim();
    if (data.lastName !== undefined) user.lastName = data.lastName.trim();
    if (data.phone !== undefined) user.phone = data.phone ? data.phone.trim() : undefined;
    if (data.role !== undefined) {
      if (updaterRole && !RoleHierarchy.canManageRole(updaterRole, data.role as UserRole)) {
        throw new Error('You can only assign users a role below your own role.');
      }

      user.role = data.role;
    }

    if (data.restaurantId !== undefined || data.outletId !== undefined || data.role !== undefined) {
      const assignmentData = {
        role: data.role || user.role,
        restaurantId: data.restaurantId !== undefined ? data.restaurantId : user.restaurantId?.toString(),
        outletId: data.outletId !== undefined ? data.outletId : user.outletId?.toString(),
      };
      await this.validateAssignment(tenantId, assignmentData, updaterRole, updaterRestaurantId, updaterOutletId);

      user.restaurantId = assignmentData.restaurantId ? new Types.ObjectId(assignmentData.restaurantId) : null;
      user.outletId = assignmentData.outletId ? new Types.ObjectId(assignmentData.outletId) : null;
    }
    if (data.status !== undefined) user.status = data.status;

    if (data.password) {
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(data.password, salt);
    }

    user.updatedBy = new Types.ObjectId(updaterUserId);
    return await user.save();
  }

  /**
   * Soft-delete a user (scoped to tenantId) and prevent self-deletion
   */
  static async deleteUser(
    id: string,
    tenantId: string,
    deleterUserId: string,
    deleterRole?: UserRole
  ): Promise<IUser | null> {
    if (id === deleterUserId) {
      throw new Error('You cannot delete your own account.');
    }

    const user = await User.findOne({
        _id: new Types.ObjectId(id),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
    });

    if (!user) {
      return null;
    }

    if (deleterRole && !RoleHierarchy.canManageRole(deleterRole, user.role as UserRole)) {
      throw new Error('You can only delete users with a role below your own role.');
    }

    user.isDeleted = true;
    user.updatedBy = new Types.ObjectId(deleterUserId);
    return await user.save();
  }
}