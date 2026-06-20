import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { IUser } from '../models/user.model.js';
import User from '../models/user.model.js';
import RefreshToken, { IRefreshToken } from '../models/refreshtoken.model.js';
import { UserStatus, SubscriptionPlan, UserRole } from '../enums/enums.js';
import { Types } from 'mongoose';
import Tenant from '../models/tenant.model.js';


interface TokenPayload {
  userId: string;
  tenantId: string;
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
  /**
   * Hash a password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  /**
   * Compare password with hash
   */
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate JWT access token
   */
  static generateAccessToken(payload: TokenPayload): string {
    if(!process.env.JWT_SECRET || !process.env.JWT_EXPIRY) throw new Error('JWT_SECRET or JWT_EXPIRY is not defined');
    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRY,
    } as any);
  }

  /**
   * Generate JWT refresh token and store in database
   */
  static async generateRefreshToken(
    userId: string,
    tenantId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<string> {

    if(!process.env.JWT_REFRESH_SECRET || !process.env.JWT_REFRESH_EXPIRY) throw new Error('JWT_REFRESH_SECRET or JWT_REFRESH_EXPIRY is not defined');
    const token = jwt.sign(
      { userId, tenantId },
      process.env.JWT_REFRESH_SECRET,
      {
        expiresIn: process.env.JWT_REFRESH_EXPIRY,
      } as any
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const refreshTokenDoc = new RefreshToken({
      userId: new Types.ObjectId(userId),
      tenantId: new Types.ObjectId(tenantId),
      token,
      expiresAt,
      ipAddress,
      userAgent,
    });

    await refreshTokenDoc.save();
    return token;
  }

  /**
   * Verify JWT token
   */
  static verifyAccessToken(token: string): TokenPayload | null {
    try {
      if(!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not defined');
      return jwt.verify(token, process.env.JWT_SECRET) as TokenPayload;
    } catch (error) {
      return null;
    }
  }

  /**
   * Verify refresh token
   */
  static verifyRefreshToken(token: string): { userId: string; tenantId: string } | null {
    try {
      if(!process.env.JWT_REFRESH_SECRET) throw new Error('JWT_REFRESH_SECRET is not defined');
      return jwt.verify(token, process.env.JWT_REFRESH_SECRET) as { userId: string; tenantId: string };
    } catch (error) {
      return null;
    }
  }

  static tenantSlagGenerator(tenantName: string): string {
    return tenantName.replace(/\s+/g, '-').toLowerCase();
  }

  /** Register a new user */
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
      ownerId: new Types.ObjectId(), //Temporary placeholder
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
      role: UserRole.SUPER_ADMIN,   // first user of a tenant is always super_admin
      status: UserStatus.ACTIVE,
      createdBy: null,
    });

    //update tenant owner
    tenant.ownerId = user._id;
    await tenant.save();

    return user;
  }

  /**
   * Login user
   */
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
      tenantId: user.tenantId.toString(),
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
      user.tenantId.toString(),
      ipAddress,
      userAgent
    );

    // Update last login
    await User.updateOne({ _id: user._id }, { lastLogin: new Date() });

    return {
      accessToken,
      refreshToken,
      user: this.sanitizeUser(user),
    };
  }

  /**
   * Refresh access token
   */
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
      tenantId: user.tenantId.toString(),
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
      user.tenantId.toString()
    );

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: this.sanitizeUser(user),
    };
  }

  /**
   * Logout user - revoke refresh token
   */
  static async logout(refreshToken: string): Promise<void> {
    await RefreshToken.updateOne(
      { token: refreshToken },
      {
        isRevoked: true,
        revokedAt: new Date(),
      }
    );
  }

  /**
   * Verify user credentials
   */
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

  /**
   * Get user by ID
   */
  static async getUserById(userId: string): Promise<IUser | null> {
    return User.findById(new Types.ObjectId(userId));
  }

  /**
   * Update user password
   */
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

  /**
   * Remove sensitive fields from user object
   */
  private static sanitizeUser(user: IUser): Partial<IUser> {
    const { passwordHash, ...rest } = user.toObject();
    return rest;
  }

  /**
   * Revoke all refresh tokens for a user
   */
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
