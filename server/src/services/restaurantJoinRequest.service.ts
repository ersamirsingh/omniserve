import crypto from 'node:crypto';
import { Types } from 'mongoose';
import RestaurantJoinRequest, {
  IRestaurantJoinRequest,
} from '../models/restaurantJoinRequest.model.js';
import Restaurant from '../models/restaurant.model.js';
import User, { IUser } from '../models/user.model.js';
import { RestaurantJoinRequestStatus, UserRole, UserStatus } from '../enums/enums.js';
import { EmailService } from './email.service.js';
import { AuthService } from './auth.service.js';
import { NotificationService } from './notification.service.js';
import { UserService } from './user.service.js';
import { NotificationType } from '../enums/enums.js';
import { RoleHierarchy } from '../utils/roleHierarchy.utils.js';

interface CreateJoinRequestData {
  tenantId: string;
  restaurantId: string;
  requesterUserId: string;
  requesterRole: UserRole;
  email: string;
  requestedRole: UserRole;
  firstName?: string;
  lastName?: string;
  phone?: string;
  message?: string;
}

interface AcceptJoinRequestData {
  token: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  password?: string;
}

export class RestaurantJoinRequestService {
  private static tokenHash(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private static buildInviteLink(token: string): string {
    const baseUrl = process.env.CLIENT_URL || process.env.API_PUBLIC_URL || 'http://localhost:5173';
    return `${baseUrl.replace(/\/$/, '')}/join-restaurant?token=${encodeURIComponent(token)}`;
  }

  private static expiryDate(): Date {
    const days = Number(process.env.RESTAURANT_JOIN_INVITE_EXPIRY_DAYS || 7);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);
    return expiresAt;
  }

  private static serialize(request: IRestaurantJoinRequest): Record<string, unknown> {
    return {
      id: request._id,
      tenantId: request.tenantId,
      restaurantId: request.restaurantId,
      email: request.email,
      firstName: request.firstName,
      lastName: request.lastName,
      phone: request.phone,
      requestedRole: request.requestedRole,
      status: request.status,
      inviteLink: request.inviteLink,
      linkSentAt: request.linkSentAt,
      expiresAt: request.expiresAt,
      messages: request.messages,
      requestedBy: request.requestedBy,
      acceptedBy: request.acceptedBy,
      decidedBy: request.decidedBy,
      decidedAt: request.decidedAt,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    };
  }

  static async createJoinRequest(data: CreateJoinRequestData): Promise<{
    request: IRestaurantJoinRequest;
    emailSent: boolean;
    alreadyPending: boolean;
  }> {
    if (!RoleHierarchy.canInviteRestaurantRole(data.requesterRole, data.requestedRole)) {
      throw new Error('You can only invite restaurant roles below your own role.');
    }

    const restaurant = await Restaurant.findOne({
      _id: new Types.ObjectId(data.restaurantId),
      tenantId: new Types.ObjectId(data.tenantId),
      isDeleted: false,
    });

    if (!restaurant) {
      throw new Error('Restaurant not found or access denied.');
    }

    const email = data.email.trim().toLowerCase();
    const existingPending = await RestaurantJoinRequest.findOne({
      tenantId: new Types.ObjectId(data.tenantId),
      restaurantId: new Types.ObjectId(data.restaurantId),
      email,
      requestedRole: data.requestedRole,
      status: RestaurantJoinRequestStatus.PENDING,
      isDeleted: false,
    });

    if (existingPending) {
      return { request: existingPending, emailSent: false, alreadyPending: true };
    }

    await UserService.ensureScopedRoleAvailable(
      data.tenantId,
      data.requestedRole,
      data.restaurantId
    );

    if (data.requestedRole === UserRole.RESTAURANT_OWNER) {
      const existingOwnerRequest = await RestaurantJoinRequest.findOne({
        tenantId: new Types.ObjectId(data.tenantId),
        restaurantId: new Types.ObjectId(data.restaurantId),
        requestedRole: UserRole.RESTAURANT_OWNER,
        status: RestaurantJoinRequestStatus.PENDING,
        isDeleted: false,
      });

      if (existingOwnerRequest) {
        throw new Error('This restaurant already has a pending restaurant owner invitation.');
      }
    }

    const token = crypto.randomBytes(32).toString('hex');
    const inviteLink = this.buildInviteLink(token);
    const request = await RestaurantJoinRequest.create({
      tenantId: new Types.ObjectId(data.tenantId),
      restaurantId: new Types.ObjectId(data.restaurantId),
      email,
      firstName: data.firstName?.trim(),
      lastName: data.lastName?.trim(),
      phone: data.phone?.trim(),
      requestedRole: data.requestedRole,
      inviteTokenHash: this.tokenHash(token),
      inviteLink,
      expiresAt: this.expiryDate(),
      requestedBy: new Types.ObjectId(data.requesterUserId),
      messages: data.message
        ? [{
            senderId: new Types.ObjectId(data.requesterUserId),
            senderEmail: undefined,
            message: data.message.trim(),
            createdAt: new Date(),
          }]
        : [],
    });

    const emailSent = await EmailService.sendMail({
      to: email,
      subject: `Invitation to join ${restaurant.name}`,
      text: `You have been invited to join ${restaurant.name} as ${data.requestedRole}. Accept here: ${inviteLink}`,
      html: `<p>You have been invited to join <strong>${restaurant.name}</strong> as <strong>${data.requestedRole}</strong>.</p><p><a href="${inviteLink}">Accept invitation</a></p>`,
    });

    request.linkSentAt = new Date();
    await request.save();

    await this.notifyApprovers(
      data.tenantId,
      data.restaurantId,
      data.requesterUserId,
      'Restaurant join request sent',
      `${email} was invited as ${data.requestedRole}.`,
      request._id.toString()
    );

    return { request, emailSent, alreadyPending: false };
  }

  static async listJoinRequests(
    tenantId: string,
    restaurantId: string,
    status?: RestaurantJoinRequestStatus
  ): Promise<IRestaurantJoinRequest[]> {
    const query: Record<string, unknown> = {
      tenantId: new Types.ObjectId(tenantId),
      restaurantId: new Types.ObjectId(restaurantId),
      isDeleted: false,
    };

    if (status) {
      query.status = status;
    }

    return RestaurantJoinRequest.find(query).sort({ createdAt: -1 });
  }

  static async addMessage(
    tenantId: string,
    requestId: string,
    senderUserId: string,
    senderRole: UserRole,
    message: string
  ): Promise<IRestaurantJoinRequest | null> {
    const request = await RestaurantJoinRequest.findOne({
      _id: new Types.ObjectId(requestId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!request) {
      return null;
    }

    if (!RoleHierarchy.canInviteRestaurantRole(senderRole, request.requestedRole)) {
      throw new Error('You do not have permission to message this join request.');
    }

    request.messages.push({
      senderId: new Types.ObjectId(senderUserId),
      message: message.trim(),
      createdAt: new Date(),
    });

    return request.save();
  }

  static async decideJoinRequest(
    tenantId: string,
    requestId: string,
    deciderUserId: string,
    deciderRole: UserRole,
    status: RestaurantJoinRequestStatus.REJECTED | RestaurantJoinRequestStatus.CANCELLED,
    message?: string
  ): Promise<IRestaurantJoinRequest | null> {
    const request = await RestaurantJoinRequest.findOne({
      _id: new Types.ObjectId(requestId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!request) {
      return null;
    }

    if (request.status !== RestaurantJoinRequestStatus.PENDING) {
      throw new Error('Only pending join requests can be updated.');
    }

    if (!RoleHierarchy.canInviteRestaurantRole(deciderRole, request.requestedRole)) {
      throw new Error('You do not have permission to decide this join request.');
    }

    request.status = status;
    request.decidedBy = new Types.ObjectId(deciderUserId);
    request.decidedAt = new Date();

    if (message?.trim()) {
      request.messages.push({
        senderId: new Types.ObjectId(deciderUserId),
        message: message.trim(),
        createdAt: new Date(),
      });
    }

    return request.save();
  }

  static async acceptJoinRequest(data: AcceptJoinRequestData): Promise<{
    request: IRestaurantJoinRequest;
    user: IUser;
  }> {
    const request = await RestaurantJoinRequest.findOne({
      inviteTokenHash: this.tokenHash(data.token),
      isDeleted: false,
    }).select('+inviteTokenHash');

    if (!request) {
      throw new Error('Invalid invite token.');
    }

    if (request.status !== RestaurantJoinRequestStatus.PENDING) {
      throw new Error('Join request is no longer pending.');
    }

    if (request.expiresAt < new Date()) {
      request.status = RestaurantJoinRequestStatus.EXPIRED;
      request.decidedAt = new Date();
      await request.save();
      throw new Error('Join request invite link has expired.');
    }

    let user = await User.findOne({ email: request.email }).select('+passwordHash');

    if (user && user.tenantId.toString() !== request.tenantId.toString()) {
      throw new Error('A user with this email already belongs to another tenant.');
    }

    await UserService.ensureScopedRoleAvailable(
      request.tenantId.toString(),
      request.requestedRole,
      request.restaurantId,
      undefined,
      user?._id.toString()
    );

    if (!user) {
      if (!data.firstName || !data.lastName || !data.password) {
        throw new Error('firstName, lastName, and password are required to accept this invitation.');
      }

      const passwordHash = await AuthService.hashPassword(data.password);
      user = await User.create({
        tenantId: request.tenantId,
        restaurantId: request.restaurantId,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: request.email,
        phone: data.phone?.trim() || request.phone,
        passwordHash,
        role: request.requestedRole,
        status: UserStatus.ACTIVE,
        createdBy: request.requestedBy,
        updatedBy: request.requestedBy,
      });
    } else {
      user.restaurantId = request.restaurantId;
      user.role = request.requestedRole;
      user.status = UserStatus.ACTIVE;
      if (data.firstName) user.firstName = data.firstName.trim();
      if (data.lastName) user.lastName = data.lastName.trim();
      if (data.phone) user.phone = data.phone.trim();
      user.updatedBy = request.requestedBy;
      await user.save();
    }

    request.status = RestaurantJoinRequestStatus.ACCEPTED;
    request.acceptedBy = user._id;
    request.decidedAt = new Date();
    await request.save();

    await this.notifyApprovers(
      request.tenantId.toString(),
      request.restaurantId.toString(),
      user._id.toString(),
      'Restaurant invite accepted',
      `${request.email} accepted the ${request.requestedRole} invitation.`,
      request._id.toString()
    );

    return { request, user };
  }

  static responseData(request: IRestaurantJoinRequest): Record<string, unknown> {
    return this.serialize(request);
  }

  private static async notifyApprovers(
    tenantId: string,
    restaurantId: string,
    actorUserId: string,
    title: string,
    message: string,
    requestId: string
  ): Promise<void> {
    const users = await User.find({
      tenantId: new Types.ObjectId(tenantId),
      status: UserStatus.ACTIVE,
      isDeleted: false,
    });

    const approverIds = users
      .filter(user => user._id.toString() !== actorUserId)
      .filter(user => RoleHierarchy.assignableRestaurantRoles(user.role).length > 0)
      .map(user => user._id.toString());

    await NotificationService.createBulkNotifications(
      tenantId,
      approverIds,
      title,
      message,
      NotificationType.SYSTEM,
      requestId,
      'RestaurantJoinRequest',
      actorUserId
    );
  }
}
