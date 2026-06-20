import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { UserService } from '../services/user.service.js';
import { ApiResponseHandler } from '../utils/response.handler.js';
import { UserRole, UserStatus } from '../enums/enums.js';
import { RoleHierarchy } from '../utils/roleHierarchy.utils.js';

export class UserController {
  private static EMAIL_REGEX = /^\S+@\S+\.\S+$/;
  private static PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  private static PHONE_REGEX = /^\+?[\d\s\-().]{7,20}$/;

  /**
   * Accept the logged-in user's pending invitation
   * PATCH /users/me/accept-invitation
   */
  static async acceptMyInvitation(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.tenantId || !req.user?.userId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
        return;
      }

      const user = await UserService.acceptInvitation(req.user.userId, req.user.tenantId);
      if (!user) {
        ApiResponseHandler.notFound(res, 'User not found');
        return;
      }

      ApiResponseHandler.success(res, 200, 'Invitation accepted successfully', {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        restaurantId: user.restaurantId,
        outletId: user.outletId,
        invitationAccepted: user.invitationAccepted,
        status: user.status,
      });
    } catch (error: any) {
      ApiResponseHandler.badRequest(res, error.message || 'Failed to accept invitation');
    }
  }

  /**
   * Create a new User
   * POST /users
   */
  static async createUser(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
        return;
      }

      const { firstName, lastName, email, phone, password, role, status, restaurantId, outletId, outletIds } = req.body;

      // Validate required fields
      if (!firstName || !lastName || !email || !password || !role) {
        ApiResponseHandler.badRequest(res, 'firstName, lastName, email, password, and role are required');
        return;
      }

      if (typeof firstName !== 'string' || firstName.trim().length === 0 || firstName.length > 50) {
        ApiResponseHandler.badRequest(res, 'firstName must be a non-empty string and under 50 characters');
        return;
      }

      if (typeof lastName !== 'string' || lastName.trim().length === 0 || lastName.length > 50) {
        ApiResponseHandler.badRequest(res, 'lastName must be a non-empty string and under 50 characters');
        return;
      }

      if (!UserController.EMAIL_REGEX.test(email)) {
        ApiResponseHandler.badRequest(res, 'Please provide a valid email address');
        return;
      }

      if (!UserController.PASSWORD_REGEX.test(password)) {
        ApiResponseHandler.badRequest(res, 'Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character');
        return;
      }

      if (phone && !UserController.PHONE_REGEX.test(phone)) {
        ApiResponseHandler.badRequest(res, 'Please provide a valid phone number');
        return;
      }

      if (!Object.values(UserRole).includes(role as UserRole)) {
        ApiResponseHandler.badRequest(res, `Invalid user role: ${role}`);
        return;
      }

      if (!RoleHierarchy.canManageRole(req.user.role as UserRole, role as UserRole)) {
        ApiResponseHandler.forbidden(res, 'You can only create users with a role below your own role');
        return;
      }

      if (status && !Object.values(UserStatus).includes(status as UserStatus)) {
        ApiResponseHandler.badRequest(res, `Invalid user status: ${status}`);
        return;
      }

      if (restaurantId && !Types.ObjectId.isValid(restaurantId)) {
        ApiResponseHandler.badRequest(res, 'Invalid restaurantId format');
        return;
      }

      if (outletId && !Types.ObjectId.isValid(outletId)) {
        ApiResponseHandler.badRequest(res, 'Invalid outletId format');
        return;
      }

      if (outletIds && Array.isArray(outletIds)) {
        for (const id of outletIds) {
          if (!Types.ObjectId.isValid(id)) {
            ApiResponseHandler.badRequest(res, 'Invalid outletId format in outletIds');
            return;
          }
        }
      }

      const userData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone ? phone.trim() : undefined,
        password,
        role,
        status: status || UserStatus.ACTIVE,
        restaurantId,
        outletId,
        outletIds,
      };

      const user = await UserService.createUser(
        req.user.tenantId,
        userData,
        req.user.userId,
        req.user.role as UserRole,
        req.user.restaurantId,
        req.user.outletId
      );

      ApiResponseHandler.success(res, 201, 'User created successfully', {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        restaurantId: user.restaurantId,
        outletId: user.outletId,
        outletIds: user.outletIds,
        pendingRole: user.pendingRole,
        pendingRestaurantId: user.pendingRestaurantId,
        pendingOutletId: user.pendingOutletId,
        pendingOutletIds: user.pendingOutletIds,
        invitationAccepted: user.invitationAccepted,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
    } catch (error: any) {
      ApiResponseHandler.badRequest(res, error.message || 'Failed to create user');
    }
  }

  /**
   * List Users for a tenant
   * GET /users
   */
  static async listUsers(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
        return;
      }

      const search = req.query.search as string | undefined;
      const role = req.query.role as string | undefined;
      const status = req.query.status as string | undefined;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const skip = (page - 1) * limit;

      const filters: { limit: number; skip: number; search?: string; role?: string; status?: string; restaurantId?: string; outletId?: string } = {
        limit,
        skip,
      };

      if (search && search.trim().length > 0) {
        filters.search = search.trim();
      }
      if (role && role.trim().length > 0) {
        filters.role = role.trim();
      }
      if (status && status.trim().length > 0) {
        filters.status = status.trim();
      }
      if (req.user.role === UserRole.RESTAURANT_OWNER) {
        if (req.user.restaurantId) filters.restaurantId = req.user.restaurantId;
      }
      if (req.user.role === UserRole.OUTLET_MANAGER || req.user.role === UserRole.STAFF) {
        if (req.user.outletId) filters.outletId = req.user.outletId;
      }

      const { users, total } = await UserService.getUsers(req.user.tenantId, filters);

      ApiResponseHandler.success(res, 200, 'Users retrieved successfully', {
        users: users.map(user => ({
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          restaurantId: user.restaurantId,
          outletId: user.outletId,
          outletIds: user.outletIds,
          pendingRole: user.pendingRole,
          pendingRestaurantId: user.pendingRestaurantId,
          pendingOutletId: user.pendingOutletId,
          pendingOutletIds: user.pendingOutletIds,
          invitationAccepted: user.invitationAccepted,
          status: user.status,
          profileImage: user.profileImage,
          address: user.address,
          idProof: user.idProof,
          idProofStatus: user.idProofStatus,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        })),
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || 'Failed to list users');
    }
  }

  /**
   * Get User details by ID
   * GET /users/:id
   */
  static async getUserById(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
        return;
      }

      const { id } = req.params as { id: string };
      if (!Types.ObjectId.isValid(id)) {
        ApiResponseHandler.badRequest(res, 'Invalid user ID format');
        return;
      }

      const user = await UserService.getUserById(id, req.user.tenantId);
      if (!user) {
        ApiResponseHandler.notFound(res, 'User not found');
        return;
      }

      ApiResponseHandler.success(res, 200, 'User details retrieved successfully', {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        restaurantId: user.restaurantId,
        outletId: user.outletId,
        outletIds: user.outletIds,
        pendingRole: user.pendingRole,
        pendingRestaurantId: user.pendingRestaurantId,
        pendingOutletId: user.pendingOutletId,
        pendingOutletIds: user.pendingOutletIds,
        invitationAccepted: user.invitationAccepted,
        status: user.status,
        profileImage: user.profileImage,
        address: user.address,
        idProof: user.idProof,
        idProofStatus: user.idProofStatus,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || 'Failed to retrieve user');
    }
  }

  /**
   * Update User details
   * PUT /users/:id
   */
  static async updateUser(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
        return;
      }

      const { id } = req.params as { id: string };
      if (!Types.ObjectId.isValid(id)) {
        ApiResponseHandler.badRequest(res, 'Invalid user ID format');
        return;
      }

      const isSelfUpdate = id === req.user.userId;
      const hasManagerPrivileges = [UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER].includes(req.user.role as UserRole);

      if (!isSelfUpdate && !hasManagerPrivileges) {
        ApiResponseHandler.forbidden(res, 'You do not have permission to update this user');
        return;
      }

      const { firstName, lastName, email, phone, password, role, status, restaurantId, outletId, outletIds, profileImage, address, idProof, idProofStatus } = req.body;

      // Validate inputs if provided
      if (firstName !== undefined && (typeof firstName !== 'string' || firstName.trim().length === 0 || firstName.length > 50)) {
        ApiResponseHandler.badRequest(res, 'firstName must be a non-empty string and under 50 characters');
        return;
      }

      if (lastName !== undefined && (typeof lastName !== 'string' || lastName.trim().length === 0 || lastName.length > 50)) {
        ApiResponseHandler.badRequest(res, 'lastName must be a non-empty string and under 50 characters');
        return;
      }

      if (email !== undefined && !UserController.EMAIL_REGEX.test(email)) {
        ApiResponseHandler.badRequest(res, 'Please provide a valid email address');
        return;
      }

      if (password !== undefined && !UserController.PASSWORD_REGEX.test(password)) {
        ApiResponseHandler.badRequest(res, 'Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character');
        return;
      }

      if (phone && !UserController.PHONE_REGEX.test(phone)) {
        ApiResponseHandler.badRequest(res, 'Please provide a valid phone number');
        return;
      }

      if (role !== undefined && !Object.values(UserRole).includes(role as UserRole)) {
        ApiResponseHandler.badRequest(res, `Invalid user role: ${role}`);
        return;
      }

      if (role !== undefined && !isSelfUpdate && !RoleHierarchy.canManageRole(req.user.role as UserRole, role as UserRole)) {
        ApiResponseHandler.forbidden(res, 'You can only assign users a role below your own role');
        return;
      }

      if (status !== undefined && !Object.values(UserStatus).includes(status as UserStatus)) {
        ApiResponseHandler.badRequest(res, `Invalid user status: ${status}`);
        return;
      }

      if (restaurantId !== undefined && restaurantId && !Types.ObjectId.isValid(restaurantId)) {
        ApiResponseHandler.badRequest(res, 'Invalid restaurantId format');
        return;
      }

      if (outletId !== undefined && outletId && !Types.ObjectId.isValid(outletId)) {
        ApiResponseHandler.badRequest(res, 'Invalid outletId format');
        return;
      }

      if (outletIds !== undefined && Array.isArray(outletIds)) {
        for (const id of outletIds) {
          if (!Types.ObjectId.isValid(id)) {
            ApiResponseHandler.badRequest(res, 'Invalid outletId format in outletIds');
            return;
          }
        }
      }

      const updateData = {
        firstName,
        lastName,
        email,
        phone,
        password,
        role,
        status,
        restaurantId,
        outletId,
        outletIds,
        profileImage,
        address,
        idProof,
        idProofStatus,
      };

      const user = await UserService.updateUser(
        id,
        req.user.tenantId,
        updateData,
        req.user.userId,
        req.user.role as UserRole,
        req.user.restaurantId,
        req.user.outletId
      );

      if (!user) {
        ApiResponseHandler.notFound(res, 'User not found');
        return;
      }

      ApiResponseHandler.success(res, 200, 'User details updated successfully', {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        restaurantId: user.restaurantId,
        outletId: user.outletId,
        outletIds: user.outletIds,
        pendingRole: user.pendingRole,
        pendingRestaurantId: user.pendingRestaurantId,
        pendingOutletId: user.pendingOutletId,
        pendingOutletIds: user.pendingOutletIds,
        invitationAccepted: user.invitationAccepted,
        status: user.status,
        profileImage: user.profileImage,
        address: user.address,
        idProof: user.idProof,
        idProofStatus: user.idProofStatus,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
    } catch (error: any) {
      ApiResponseHandler.badRequest(res, error.message || 'Failed to update user');
    }
  }

  /**
   * Soft-delete User
   * DELETE /users/:id
   */
  static async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
        return;
      }

      const { id } = req.params as { id: string };
      if (!Types.ObjectId.isValid(id)) {
        ApiResponseHandler.badRequest(res, 'Invalid user ID format');
        return;
      }

      const deletedUser = await UserService.deleteUser(
        id,
        req.user.tenantId,
        req.user.userId,
        req.user.role as UserRole
      );
      if (!deletedUser) {
        ApiResponseHandler.notFound(res, 'User not found');
        return;
      }

      ApiResponseHandler.success(res, 200, 'User deleted successfully');
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || 'Failed to delete user');
    }
  }
}
