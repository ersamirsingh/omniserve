import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { IUser } from "../../models/user.model.js";
import User from "../../models/user.model.js";
import RefreshToken from "../../models/refreshtoken.model.js";
import { UserStatus, SubscriptionPlan, UserRole, AuditAction } from "../../models/enums.js";
import { Types } from 'mongoose';
import Tenant from "../../models/tenant.model.js";
import { GoogleProvider } from "./google-auth.service.js";
import { AuditLogService } from "../auditLog/auditLog.service.js";
import crypto from 'crypto';
import { EmailService } from "../notification/email.service.js";

interface TokenPayload {
  userId: string;
  tenantId?: string;
  restaurantId?: string;
  outletId?: string;
  outletIds?: string[];
  email: string;
  role: string;
  status: string;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: Partial<IUser>;
}

export class AuthService {

  static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static generateAccessToken(payload: TokenPayload): string {
    if(!process.env.JWT_SECRET || !process.env.JWT_EXPIRY) throw new Error('JWT_SECRET or JWT_EXPIRY is not defined');
    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRY,
    } as any);
  }

  static async generateRefreshToken(
    userId: string,
    tenantId?: string | null,
    ipAddress?: string,
    userAgent?: string
  ): Promise<string> {

    if(!process.env.JWT_REFRESH_SECRET || !process.env.JWT_REFRESH_EXPIRY) throw new Error('JWT_REFRESH_SECRET or JWT_REFRESH_EXPIRY is not defined');
    const token = jwt.sign(
      { userId, ...(tenantId ? { tenantId } : {}) },
      process.env.JWT_REFRESH_SECRET,
      {
        expiresIn: process.env.JWT_REFRESH_EXPIRY,
      } as any
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const refreshTokenDoc = new RefreshToken({
      userId: new Types.ObjectId(userId),
      tenantId: tenantId ? new Types.ObjectId(tenantId) : null,
      token,
      expiresAt,
      ipAddress,
      userAgent,
    });

    await refreshTokenDoc.save();
    return token;
  }

  static verifyAccessToken(token: string): TokenPayload | null {
    try {
      if(!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not defined');
      return jwt.verify(token, process.env.JWT_SECRET) as TokenPayload;
    } catch (error) {
      return null;
    }
  }

  static verifyRefreshToken(token: string): { userId: string; tenantId?: string } | null {
    try {
      if(!process.env.JWT_REFRESH_SECRET) throw new Error('JWT_REFRESH_SECRET is not defined');
      return jwt.verify(token, process.env.JWT_REFRESH_SECRET) as { userId: string; tenantId?: string };
    } catch (error) {
      return null;
    }
  }

  static tenantSlagGenerator(tenantName: string): string {
    return tenantName.replace(/\s+/g, '-').toLowerCase();
  }

  static async register(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    tenantName: string,
  ): Promise<IUser> {
    const existingUser = await User.findOne({ email });
    if (existingUser && !existingUser.isDeleted) {
      throw new Error('Email already exists');
    }

    const tenantSlug = this.tenantSlagGenerator(tenantName);
    const existingTenant = await Tenant.findOne({ slug: tenantSlug });
    if (existingTenant) {
      throw new Error('Tenant slug already taken');
    }

    const tenant = await Tenant.create({
      name: tenantName,
      slug: tenantSlug,
      ownerId: new Types.ObjectId(),
      subscriptionPlan: SubscriptionPlan.FREE,
      status: UserStatus.ACTIVE,
    });

    const passwordHash = await this.hashPassword(password);

    const user = await User.create({
      tenantId: tenant._id,
      firstName,
      lastName,
      email,
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      createdBy: null,
    });

    tenant.ownerId = user._id;
    await tenant.save();

    return user;
  }

  static async login(
    email: string,
    password: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthResponse> {
    const user = await User.findOne({ email }).select('+passwordHash');

    if (!user) {
      throw new Error('Invalid email or password');
    }

    if (user.status === UserStatus.BLOCKED) {
      throw new Error('User account is blocked');
    }

    if (user.status === UserStatus.INACTIVE) {
      throw new Error('User account is inactive');
    }

    const isPasswordValid = user.passwordHash ? await this.comparePassword(password, user.passwordHash) : false;
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    const tokenPayload: TokenPayload = {
      userId: user._id.toString(),
      ...(user.tenantId ? { tenantId: user.tenantId.toString() } : {}),
      ...(user.restaurantId ? { restaurantId: user.restaurantId.toString() } : {}),
      ...(user.outletId ? { outletId: user.outletId.toString() } : {}),
      ...(user.outletIds && user.outletIds.length > 0 ? { outletIds: user.outletIds.map(id => id.toString()) } : {}),
      email: user.email,
      role: user.role,
      status: user.status,
    };

    const accessToken = this.generateAccessToken(tokenPayload);
    const refreshToken = await this.generateRefreshToken(
      user._id.toString(),
      user.tenantId ? user.tenantId.toString() : null,
      ipAddress,
      userAgent
    );

    await User.updateOne({ _id: user._id }, { lastLogin: new Date() });

    return {
      accessToken,
      refreshToken,
      user: this.sanitizeUser(user),
    };
  }

  static async refreshAccessToken(refreshToken: string): Promise<AuthResponse> {
    const decoded = this.verifyRefreshToken(refreshToken);
    if (!decoded) {
      throw new Error('Invalid refresh token');
    }

    const refreshTokenDoc = await RefreshToken.findOne({
      token: refreshToken,
      isRevoked: false,
    });

    if (!refreshTokenDoc) {
      throw new Error('Refresh token not found or revoked');
    }

    if (refreshTokenDoc.expiresAt < new Date()) {
      throw new Error('Refresh token expired');
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.status === UserStatus.BLOCKED) {
      throw new Error('User account is blocked');
    }

    const tokenPayload: TokenPayload = {
      userId: user._id.toString(),
      ...(user.tenantId ? { tenantId: user.tenantId.toString() } : {}),
      ...(user.restaurantId ? { restaurantId: user.restaurantId.toString() } : {}),
      ...(user.outletId ? { outletId: user.outletId.toString() } : {}),
      ...(user.outletIds && user.outletIds.length > 0 ? { outletIds: user.outletIds.map(id => id.toString()) } : {}),
      email: user.email,
      role: user.role,
      status: user.status,
    };

    const newAccessToken = this.generateAccessToken(tokenPayload);
    const newRefreshToken = await this.generateRefreshToken(
      user._id.toString(),
      user.tenantId ? user.tenantId.toString() : null
    );

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: this.sanitizeUser(user),
    };
  }

  static async logout(refreshToken: string): Promise<void> {
    await RefreshToken.updateOne(
      { token: refreshToken },
      {
        isRevoked: true,
        revokedAt: new Date(),
      }
    );
  }

  static async verifyUserCredentials(
    email: string,
    password: string
  ): Promise<IUser | null> {
    const user = await User.findOne({ email }).select('+passwordHash');

    if (!user) {
      return null;
    }

    const isPasswordValid = user.passwordHash ? await this.comparePassword(password, user.passwordHash) : false;
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  static async getUserById(userId: string): Promise<IUser | null> {
    return User.findById(new Types.ObjectId(userId));
  }

  static async updatePassword(
    userId: string,
    oldPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await User.findById(userId).select('+passwordHash');

    if (!user) {
      throw new Error('User not found');
    }

    const isPasswordValid = user.passwordHash ? await this.comparePassword(oldPassword, user.passwordHash) : false;
    if (!isPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    const passwordHash = await this.hashPassword(newPassword);
    await User.updateOne({ _id: user._id }, { passwordHash });
  }

  private static sanitizeUser(user: IUser): Partial<IUser> {
    const { passwordHash, ...rest } = user.toObject();
    return rest;
  }

  static async revokeAllTokens(userId: string): Promise<void> {
    await RefreshToken.updateMany(
      { userId: new Types.ObjectId(userId) },
      {
        isRevoked: true,
        revokedAt: new Date(),
      }
    );
  }

  static async googleAuth(
    idToken: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ onboardingRequired: boolean; onboardingToken?: string; authResponse?: AuthResponse }> {
    const provider = new GoogleProvider();
    const verifiedProfile = await provider.verifyToken(idToken);

    if (!verifiedProfile.emailVerified) {
      throw new Error('Google email is not verified');
    }

    const email = verifiedProfile.email.toLowerCase();

    // Look up existing user
    const user = await User.findOne({ email }).select('+passwordHash');

    if (user) {
      // 1. Enforce Role check: SYSTEM_ADMIN cannot use Google
      if (user.role === UserRole.SYSTEM_ADMIN || user.pendingRole === UserRole.SYSTEM_ADMIN) {
        throw new Error('Google login is disabled for system administrators. Please use local login.');
      }

      // 2. Enforce User Status
      if (user.status === UserStatus.BLOCKED) {
        throw new Error('User account is blocked');
      }

      if (user.status === UserStatus.INACTIVE) {
        if (user.invitationAccepted) {
          throw new Error('User account is inactive');
        }
      }

      // 3. Enforce Tenant Status
      if (user.tenantId) {
        const tenant = await Tenant.findOne({ _id: user.tenantId, isDeleted: false });
        if (!tenant) {
          throw new Error('Tenant not found or deleted');
        }
        if (tenant.status !== UserStatus.ACTIVE) {
          throw new Error('Tenant account is inactive or suspended');
        }
      }

      // 4. Account linking / updating details
      let isLinking = false;
      if (user.authProvider !== 'GOOGLE' || !user.providerId) {
        user.authProvider = 'GOOGLE';
        user.providerId = verifiedProfile.providerId;
        user.emailVerified = true;
        isLinking = true;
      }

      // 5. Handle Staff / User invitation activation
      let isInviteActivation = false;
      if (!user.invitationAccepted && user.pendingRole) {
        if (user.invitationExpiresAt && user.invitationExpiresAt < new Date()) {
          throw new Error('Invitation has expired');
        }
        
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
        isInviteActivation = true;
      }

      user.lastLogin = new Date();
      user.updatedBy = user._id;
      await user.save();

      // Create session
      const tokenPayload: TokenPayload = {
        userId: user._id.toString(),
        ...(user.tenantId ? { tenantId: user.tenantId.toString() } : {}),
        ...(user.restaurantId ? { restaurantId: user.restaurantId.toString() } : {}),
        ...(user.outletId ? { outletId: user.outletId.toString() } : {}),
        ...(user.outletIds && user.outletIds.length > 0 ? { outletIds: user.outletIds.map(id => id.toString()) } : {}),
        email: user.email,
        role: user.role,
        status: user.status,
      };

      const accessToken = this.generateAccessToken(tokenPayload);
      const refreshToken = await this.generateRefreshToken(
        user._id.toString(),
        user.tenantId ? user.tenantId.toString() : null,
        ipAddress,
        userAgent
      );

      // Audit Logs
      if (isInviteActivation) {
        await AuditLogService.createAuditLog(user.tenantId?.toString(), {
          userId: user._id.toString(),
          action: AuditAction.STATUS_CHANGE,
          entityType: 'User',
          entityId: user._id.toString(),
          newData: { invitationAccepted: true, role: user.role },
          ...(ipAddress ? { ipAddress } : {}),
          ...(userAgent ? { userAgent } : {}),
        });
      }
      
      await AuditLogService.createAuditLog(user.tenantId?.toString(), {
        userId: user._id.toString(),
        action: AuditAction.LOGIN,
        entityType: 'User',
        entityId: user._id.toString(),
        newData: { provider: 'google', linked: isLinking, activated: isInviteActivation },
        ...(ipAddress ? { ipAddress } : {}),
        ...(userAgent ? { userAgent } : {}),
      });

      return {
        onboardingRequired: false,
        authResponse: {
          accessToken,
          refreshToken,
          user: this.sanitizeUser(user),
        },
      };
    } else {
      // User does not exist, onboarding required.
      if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not defined');
      }
      const onboardingToken = jwt.sign(
        {
          email,
          firstName: verifiedProfile.firstName,
          lastName: verifiedProfile.lastName,
          providerId: verifiedProfile.providerId,
        },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );

      return {
        onboardingRequired: true,
        onboardingToken,
      };
    }
  }

  static async googleRegister(
    onboardingToken: string,
    tenantName: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthResponse> {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined');
    }

    let decodedPayload: any;
    try {
      decodedPayload = jwt.verify(onboardingToken, process.env.JWT_SECRET);
    } catch (err) {
      throw new Error('Invalid or expired onboarding token');
    }

    const { email, firstName, lastName, providerId } = decodedPayload;

    if (!email || !providerId) {
      throw new Error('Invalid onboarding token payload');
    }

    // Double check email collision
    const existingUser = await User.findOne({ email });
    if (existingUser && !existingUser.isDeleted) {
      throw new Error('Email already exists');
    }

    const tenantSlug = this.tenantSlagGenerator(tenantName);
    const existingTenant = await Tenant.findOne({ slug: tenantSlug });
    if (existingTenant) {
      throw new Error('Tenant slug already taken');
    }

    const tenant = await Tenant.create({
      name: tenantName,
      slug: tenantSlug,
      ownerId: new Types.ObjectId(),
      subscriptionPlan: SubscriptionPlan.FREE,
      status: UserStatus.ACTIVE,
    });

    const user = await User.create({
      tenantId: tenant._id,
      firstName,
      lastName,
      email,
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      authProvider: 'GOOGLE',
      providerId,
      emailVerified: true,
      invitationAccepted: true,
      createdBy: null,
    });

    tenant.ownerId = user._id;
    await tenant.save();

    // Create session
    const tokenPayload: TokenPayload = {
      userId: user._id.toString(),
      tenantId: tenant._id.toString(),
      email: user.email,
      role: user.role,
      status: user.status,
    };

    const accessToken = this.generateAccessToken(tokenPayload);
    const refreshToken = await this.generateRefreshToken(
      user._id.toString(),
      tenant._id.toString(),
      ipAddress,
      userAgent
    );

    // Audit Logs
    await AuditLogService.createAuditLog(tenant._id.toString(), {
      userId: user._id.toString(),
      action: AuditAction.CREATE,
      entityType: 'Tenant',
      entityId: tenant._id.toString(),
      newData: { name: tenantName, slug: tenantSlug },
      ...(ipAddress ? { ipAddress } : {}),
      ...(userAgent ? { userAgent } : {}),
    });

    await AuditLogService.createAuditLog(tenant._id.toString(), {
      userId: user._id.toString(),
      action: AuditAction.CREATE,
      entityType: 'User',
      entityId: user._id.toString(),
      newData: { email, role: user.role, provider: 'google' },
      ...(ipAddress ? { ipAddress } : {}),
      ...(userAgent ? { userAgent } : {}),
    });

    await AuditLogService.createAuditLog(tenant._id.toString(), {
      userId: user._id.toString(),
      action: AuditAction.LOGIN,
      entityType: 'User',
      entityId: user._id.toString(),
      newData: { provider: 'google', isNewUser: true },
      ...(ipAddress ? { ipAddress } : {}),
      ...(userAgent ? { userAgent } : {}),
    });

    return {
      accessToken,
      refreshToken,
      user: this.sanitizeUser(user),
    };
  }

  static async forgotPassword(email: string, clientUrl: string): Promise<{ success: boolean; message: string; code?: string }> {
    const emailClean = email.trim().toLowerCase();
    const user = await User.findOne({ email: emailClean });

    // Email enumeration protection: generic message if user not found or isDeleted
    if (!user || user.isDeleted) {
      return {
        success: true,
        message: 'If an account is associated with this email, a password reset link has been sent.',
      };
    }

    // Invalidate all previous reset tokens by generating a new one
    const plainToken = crypto.randomBytes(32).toString('hex');
    const resetPasswordToken = crypto.createHash('sha256').update(plainToken).digest('hex');
    const resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiration

    user.resetPasswordToken = resetPasswordToken;
    user.resetPasswordExpires = resetPasswordExpires;
    await user.save();

    // Create password reset link
    const baseUrl = clientUrl || process.env.CLIENT_URL || 'http://localhost:5173';
    const resetLink = `${baseUrl}/reset-password?token=${plainToken}`;

    // Send email using EmailService
    try {
      await EmailService.sendPasswordResetEmail(user.email, resetLink);
    } catch (emailError: any) {
      console.error('Failed to send password reset email (SMTP error):', emailError);
    }

    return {
      success: true,
      message: 'If an account is associated with this email, a password reset link has been sent.',
    };
  }

  static async resetPassword(
    token: string,
    newPassword: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean; message: string }> {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new Error('Invalid or expired password reset token');
    }

    // Validate new password complexity
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      throw new Error('Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character');
    }

    // Hash the new password
    const passwordHash = await this.hashPassword(newPassword);
    user.passwordHash = passwordHash;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    user.updatedBy = user._id;
    await user.save();

    // Invalidate all current active refresh tokens for security
    await this.revokeAllTokens(user._id.toString());

    // Log audit event
    await AuditLogService.createAuditLog(user.tenantId?.toString(), {
      userId: user._id.toString(),
      action: AuditAction.UPDATE,
      entityType: 'User',
      entityId: user._id.toString(),
      newData: { passwordReset: true },
      ...(ipAddress ? { ipAddress } : {}),
      ...(userAgent ? { userAgent } : {}),
    });

    return {
      success: true,
      message: 'Password has been reset successfully.',
    };
  }
}
