import bcrypt from 'bcrypt';
import { Types } from 'mongoose';
import User, { IUser } from '../models/user.model.js';
import { UserStatus } from '../enums/enums.js';
import { escapeRegex } from '../utils/sanitize.utils.js';

export class UserService {
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

  /**
   * Create a new User under a specific tenant
   */
  static async createUser(
    tenantId: string,
    data: any,
    creatorUserId: string
  ): Promise<IUser> {
    const emailClean = data.email.trim().toLowerCase();
    await this.checkEmailConflict(emailClean);

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const newUser = new User({
      tenantId: new Types.ObjectId(tenantId),
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      email: emailClean,
      phone: data.phone ? data.phone.trim() : undefined,
      passwordHash,
      role: data.role,
      status: data.status || UserStatus.ACTIVE,
      createdBy: new Types.ObjectId(creatorUserId),
      updatedBy: new Types.ObjectId(creatorUserId),
    });

    return await newUser.save();
  }

  /**
   * List users with pagination, search, and filters (scoped to tenantId)
   */
  static async getUsers(
    tenantId: string,
    filters: { limit: number; skip: number; search?: string; role?: string; status?: string }
  ): Promise<{ users: IUser[]; total: number }> {
    const query: any = {
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    };

    if (filters.search) {
      const safeSearch = escapeRegex(filters.search);
      const regex = new RegExp(safeSearch, 'i');
      query.$or = [
        { firstName: { $regex: regex } },
        { lastName: { $regex: regex } },
        { email: { $regex: regex } },
        { phone: { $regex: regex } },
      ];
    }

    if (filters.role) {
      query.role = filters.role;
    }

    if (filters.status) {
      query.status = filters.status;
    }

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
    updaterUserId: string
  ): Promise<IUser | null> {
    const user = await User.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!user) {
      return null;
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
    if (data.role !== undefined) user.role = data.role;
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
  static async deleteUser(id: string, tenantId: string, deleterUserId: string): Promise<IUser | null> {
    if (id === deleterUserId) {
      throw new Error('You cannot delete your own account.');
    }

    return await User.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      },
      {
        isDeleted: true,
        updatedBy: new Types.ObjectId(deleterUserId),
      },
      { new: true }
    );
  }
}
