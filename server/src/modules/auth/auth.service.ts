import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { IUser } from "../../models/user.model.js";
import User from "../../models/user.model.js";
import RefreshToken from "../../models/refreshtoken.model.js";
import { UserStatus, SubscriptionPlan, UserRole } from "../../models/enums.js";
import { Types } from 'mongoose';
import Tenant from "../../models/tenant.model.js";

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

    const isPasswordValid = await this.comparePassword(password, user.passwordHash);
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

    const isPasswordValid = await this.comparePassword(password, user.passwordHash);
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

    const isPasswordValid = await this.comparePassword(oldPassword, user.passwordHash);
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
}
