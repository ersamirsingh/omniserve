import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import { Types } from 'mongoose';
import User, { IUser } from "../../models/user.model.js";
import Restaurant from "../../models/restaurant.model.js";
import Outlet from "../../models/outlet.model.js";
import { UserRole, UserStatus } from "../../models/enums.js";
import { escapeRegex } from "../../utils/sanitize.utils.js";
import { RoleHierarchy } from "../../utils/roleHierarchy.utils.js";
import { EmailService } from "../notification/email.service.js";
import { NotificationService } from "../notification/notification.service.js";
import { NotificationType } from "../../models/enums.js";

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
    actorOutletId?: string,
    excludeUserId?: string
  ): Promise<void> {
    const role = data.role as UserRole;

    if (role === UserRole.RESTAURANT_OWNER && !data.restaurantId) {
      throw new Error('restaurantId is required for restaurant-scoped roles.');
    }

    if ([UserRole.OUTLET_MANAGER, UserRole.STAFF].includes(role) && (!data.restaurantId || (!data.outletId && (!data.outletIds || data.outletIds.length === 0)))) {
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

    const ids: string[] = [];
    if (data.outletId) ids.push(data.outletId.toString());
    if (data.outletIds && Array.isArray(data.outletIds)) {
      ids.push(...data.outletIds.map((id: any) => id.toString()));
    }

    if (ids.length > 0) {
      const uniqueIds = Array.from(new Set(ids));
      const outlets = await Outlet.find({
        _id: { $in: uniqueIds.map((id: string) => new Types.ObjectId(id)) },
        tenantId: new Types.ObjectId(tenantId),
        ...(data.restaurantId ? { restaurantId: new Types.ObjectId(data.restaurantId) } : {}),
        isDeleted: false,
      });
      if (outlets.length !== uniqueIds.length) {
        throw new Error('One or more selected outlets were not found or do not belong to the restaurant.');
      }
    }

    if (actorRole === UserRole.RESTAURANT_OWNER && actorRestaurantId && data.restaurantId !== actorRestaurantId) {
      throw new Error('You can only assign users to your restaurant.');
    }

    if (actorRole === UserRole.OUTLET_MANAGER && actorOutletId && !ids.includes(actorOutletId)) {
      throw new Error('You can only assign users to your outlet.');
    }

    await this.ensureScopedRoleAvailable(
      tenantId,
      role,
      data.restaurantId,
      ids,
      excludeUserId
    );
  }

  static async ensureScopedRoleAvailable(
    tenantId: string,
    role: UserRole,
    restaurantId?: string | Types.ObjectId | null,
    outletIdOrIds?: string | Types.ObjectId | (string | Types.ObjectId)[] | null,
    excludeUserId?: string
  ): Promise<void> {
    const tenantObjectId = new Types.ObjectId(tenantId);
    const query: any = {
      tenantId: tenantObjectId,
      isDeleted: false,
    };

    if (excludeUserId) {
      query._id = { $ne: new Types.ObjectId(excludeUserId) };
    }

    if (role === UserRole.RESTAURANT_OWNER) {
      if (!restaurantId) return;
      const restaurantObjectId = new Types.ObjectId(restaurantId.toString());
      query.$or = [
        { role: UserRole.RESTAURANT_OWNER, restaurantId: restaurantObjectId },
        { pendingRole: UserRole.RESTAURANT_OWNER, pendingRestaurantId: restaurantObjectId },
      ];
    } else if (role === UserRole.OUTLET_MANAGER) {
      if (!outletIdOrIds) return;
      const ids = Array.isArray(outletIdOrIds) ? outletIdOrIds : [outletIdOrIds];
      if (ids.length === 0) return;
      const outletObjectIds = ids.map((id: any) => new Types.ObjectId(id.toString()));
      query.$or = [
        { role: UserRole.OUTLET_MANAGER, outletId: { $in: outletObjectIds } },
        { role: UserRole.OUTLET_MANAGER, outletIds: { $in: outletObjectIds } },
        { pendingRole: UserRole.OUTLET_MANAGER, pendingOutletId: { $in: outletObjectIds } },
        { pendingRole: UserRole.OUTLET_MANAGER, pendingOutletIds: { $in: outletObjectIds } },
      ];
    } else {
      return;
    }

    const existingUser = await User.findOne(query).select('_id');
    if (!existingUser) return;

    if (role === UserRole.RESTAURANT_OWNER) {
      throw new Error('This restaurant already has a restaurant owner.');
    }

    throw new Error('This outlet already has an outlet manager.');
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
      user.tenantId!.toString(),
      user._id.toString(),
      'Invitation pending',
      `Accept your ${requestedRole} invitation for ${restaurantName}${outletId ? ` / ${outletName}` : ''}.`,
      NotificationType.SYSTEM,
      user._id.toString(),
      'UserInvitation',
      inviterUserId
    );
  }

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

    let primaryOutletId: Types.ObjectId | null = null;
    const outletObjectIds: Types.ObjectId[] = [];
    if (data.outletId) {
      primaryOutletId = new Types.ObjectId(data.outletId.toString());
      outletObjectIds.push(primaryOutletId);
    }
    if (data.outletIds && Array.isArray(data.outletIds)) {
      for (const id of data.outletIds) {
        const objId = new Types.ObjectId(id.toString());
        if (!primaryOutletId) primaryOutletId = objId;
        if (!outletObjectIds.some(oid => oid.equals(objId))) {
          outletObjectIds.push(objId);
        }
      }
    }

    const newUser = new User({
      tenantId: new Types.ObjectId(tenantId),
      restaurantId: isInvitation ? null : data.restaurantId ? new Types.ObjectId(data.restaurantId) : undefined,
      outletId: isInvitation ? null : primaryOutletId || undefined,
      outletIds: isInvitation ? [] : outletObjectIds,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      email: emailClean,
      phone: data.phone ? data.phone.trim() : undefined,
      passwordHash,
      role: isInvitation ? UserRole.STAFF : data.role,
      pendingRole: isInvitation ? data.role : null,
      pendingRestaurantId: isInvitation && data.restaurantId ? new Types.ObjectId(data.restaurantId) : null,
      pendingOutletId: isInvitation && primaryOutletId ? primaryOutletId : null,
      pendingOutletIds: isInvitation ? outletObjectIds : [],
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
        primaryOutletId?.toString(),
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

    await this.validateAssignment(tenantId, {
      role: user.pendingRole,
      restaurantId: user.pendingRestaurantId?.toString(),
      outletId: user.pendingOutletId?.toString(),
      outletIds: user.pendingOutletIds?.map((id: any) => id.toString()),
    }, undefined, undefined, undefined, user._id.toString());

    user.role = user.pendingRole;
    user.restaurantId = user.pendingRestaurantId || null;
    user.outletId = user.pendingOutletId || null;
    user.outletIds = user.pendingOutletIds || [];
    user.pendingRole = null;
    user.pendingRestaurantId = null;
    user.pendingOutletId = null;
    user.pendingOutletIds = [];
    user.invitationLink = null;
    user.invitationExpiresAt = null;
    user.invitationAccepted = true;
    user.updatedBy = user._id;

    return user.save();
  }

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
          { outletIds: outId },
          { pendingOutletId: outId },
          { pendingOutletIds: outId }
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

  static async getUserById(id: string, tenantId?: string): Promise<IUser | null> {
    const query: any = {
      _id: new Types.ObjectId(id),
      isDeleted: false,
    };
    if (tenantId) {
      query.tenantId = new Types.ObjectId(tenantId);
    } else {
      query.tenantId = null;
    }
    return await User.findOne(query);
  }

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

    const isSelfUpdate = id === updaterUserId;

    if (!isSelfUpdate && updaterRole && !RoleHierarchy.canManageRole(updaterRole, user.role as UserRole)) {
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
      if (isSelfUpdate && data.role !== user.role) {
        throw new Error('You cannot change your own role.');
      }
      if (!isSelfUpdate && updaterRole && !RoleHierarchy.canManageRole(updaterRole, data.role as UserRole)) {
        throw new Error('You can only assign users a role below your own role.');
      }

      user.role = data.role;
    }

    if (data.restaurantId !== undefined || data.outletId !== undefined || data.outletIds !== undefined || data.role !== undefined) {
      if (isSelfUpdate) {
        if (data.restaurantId !== undefined && data.restaurantId !== user.restaurantId?.toString()) {
          throw new Error('You cannot change your own restaurant.');
        }
        if (data.outletId !== undefined && data.outletId !== user.outletId?.toString()) {
          throw new Error('You cannot change your own outlet.');
        }
        if (data.outletIds !== undefined) {
          const newIds = data.outletIds.map((x: any) => x.toString()).sort().join(',');
          const oldIds = user.outletIds?.map(x => x.toString()).sort().join(',') || '';
          if (newIds !== oldIds) {
            throw new Error('You cannot change your own outlet assignments.');
          }
        }
      }

      let primaryOutletId = data.outletId !== undefined ? data.outletId : user.outletId?.toString();
      let outletIds: string[] = data.outletIds !== undefined
        ? data.outletIds.map((id: any) => id.toString())
        : user.outletIds?.map(id => id.toString()) || [];

      if (data.outletId !== undefined && data.outletId) {
        if (!outletIds.includes(data.outletId.toString())) {
          outletIds = [data.outletId.toString(), ...outletIds];
        }
      }
      if (outletIds.length > 0 && !primaryOutletId) {
        primaryOutletId = outletIds[0];
      }

      const assignmentData = {
        role: data.role || user.role,
        restaurantId: data.restaurantId !== undefined ? data.restaurantId : user.restaurantId?.toString(),
        outletId: primaryOutletId || undefined,
        outletIds: outletIds,
      };
      await this.validateAssignment(tenantId, assignmentData, updaterRole, updaterRestaurantId, updaterOutletId, id);

      user.restaurantId = assignmentData.restaurantId ? new Types.ObjectId(assignmentData.restaurantId) : null;
      user.outletId = assignmentData.outletId ? new Types.ObjectId(assignmentData.outletId) : null;
      user.outletIds = assignmentData.outletIds ? assignmentData.outletIds.map((id: string) => new Types.ObjectId(id)) : [];
    }
    if (data.status !== undefined) {
      if (isSelfUpdate && data.status !== user.status) {
        throw new Error('You cannot change your own status.');
      }
      user.status = data.status;
    }

    if (data.profileImage !== undefined) user.profileImage = data.profileImage;
    if (data.address !== undefined) user.address = data.address;
    if (data.idProof !== undefined) {
      user.idProof = data.idProof;
      if (data.idProof) {
        user.idProofStatus = 'PENDING';
      } else {
        user.idProofStatus = 'NONE';
      }
    }
    if (data.idProofStatus !== undefined && !isSelfUpdate) {
      user.idProofStatus = data.idProofStatus;
    }

    if (data.password) {
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(data.password, salt);
    }

    user.updatedBy = new Types.ObjectId(updaterUserId);
    return await user.save();
  }

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