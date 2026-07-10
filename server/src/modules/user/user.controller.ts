import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { UserService } from "./user.service.js";
import { ApiResponseHandler } from "../../utils/apiResponse.js";
import { UserRole, UserStatus } from "../../models/enums.js";
import { RoleHierarchy } from "../../utils/roleHierarchy.utils.js";
import { UserProfileContextService } from "./user-profile-context.service.js";

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
   * Get authenticated user's profile context hierarchy
   * GET /users/me/profile-context
   */
  static async getMyProfileContext(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.userId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated');
        return;
      }
      if (!req.user?.tenantId && req.user?.role !== UserRole.SYSTEM_ADMIN) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
        return;
      }
      const user = await UserService.getUserById(req.user.userId, req.user.tenantId);
      if (!user) {
        ApiResponseHandler.notFound(res, 'User not found');
        return;
      }
      const context = await UserProfileContextService.resolveProfileContext(user);
      ApiResponseHandler.success(res, 200, 'Profile context resolved successfully', context);
    } catch (error: any) {
      ApiResponseHandler.badRequest(res, error.message || 'Failed to resolve profile context');
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

      if (req.user.role === UserRole.OUTLET_MANAGER) {
        if (role !== UserRole.STAFF) {
          ApiResponseHandler.forbidden(res, 'Outlet managers can only create staff members');
          return;
        }
      }

      let targetRestaurantId = restaurantId;
      let targetOutletId = outletId;
      let targetOutletIds = outletIds;
      if (req.user.role === UserRole.OUTLET_MANAGER) {
        targetRestaurantId = req.user.restaurantId;
        targetOutletId = req.user.outletId;
        targetOutletIds = req.user.outletIds && req.user.outletIds.length > 0 ? req.user.outletIds : [req.user.outletId];
      }

      const userData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone ? phone.trim() : undefined,
        password,
        role,
        status: status || UserStatus.ACTIVE,
        restaurantId: targetRestaurantId,
        outletId: targetOutletId,
        outletIds: targetOutletIds,
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

      if (req.user.role === UserRole.OUTLET_MANAGER) {
        const myOutletIdStr = req.user.outletId?.toString();
        const isSameOutlet = user.outletId?.toString() === myOutletIdStr || user.outletIds?.map((oid: any) => oid.toString()).includes(myOutletIdStr || '');
        if (!isSameOutlet) {
          ApiResponseHandler.forbidden(res, 'You are not authorized to view users outside your outlet scope');
          return;
        }
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
      const hasManagerPrivileges = [UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER, UserRole.OUTLET_MANAGER].includes(req.user.role as UserRole);

      if (!isSelfUpdate && !hasManagerPrivileges) {
        ApiResponseHandler.forbidden(res, 'You do not have permission to update this user');
        return;
      }

      const existingUser = await UserService.getUserById(id, req.user.tenantId);
      if (!existingUser) {
        ApiResponseHandler.notFound(res, 'User not found');
        return;
      }

      if (req.user.role === UserRole.OUTLET_MANAGER && !isSelfUpdate) {
        const myOutletIdStr = req.user.outletId?.toString();
        const isSameOutlet = existingUser.outletId?.toString() === myOutletIdStr || existingUser.outletIds?.map((oid: any) => oid.toString()).includes(myOutletIdStr || '');
        if (!isSameOutlet) {
          ApiResponseHandler.forbidden(res, 'You cannot update users outside your outlet scope');
          return;
        }

        const { role, restaurantId, outletId, outletIds } = req.body;
        if (role !== undefined && role !== UserRole.STAFF) {
          ApiResponseHandler.forbidden(res, 'Outlet managers can only assign users the STAFF role');
          return;
        }
        if (restaurantId !== undefined && restaurantId !== req.user.restaurantId?.toString()) {
          ApiResponseHandler.forbidden(res, 'You cannot change the restaurant assignment outside your scope');
          return;
        }
        if (outletId !== undefined && outletId !== req.user.outletId?.toString()) {
          ApiResponseHandler.forbidden(res, 'You cannot change the outlet assignment outside your scope');
          return;
        }
        if (outletIds !== undefined) {
          const hasOutsideOutlet = outletIds.some((oid: any) => oid.toString() !== req.user!.outletId?.toString());
          if (hasOutsideOutlet) {
            ApiResponseHandler.forbidden(res, 'You cannot assign outlets outside your scope');
            return;
          }
        }
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

      const user = await UserService.getUserById(id, req.user.tenantId);
      if (!user) {
        ApiResponseHandler.notFound(res, 'User not found');
        return;
      }

      if (req.user.role === UserRole.OUTLET_MANAGER) {
        if (user.role !== UserRole.STAFF) {
          ApiResponseHandler.forbidden(res, 'Outlet managers can only delete staff members');
          return;
        }

        const myOutletIdStr = req.user.outletId?.toString();
        const isSameOutlet = user.outletId?.toString() === myOutletIdStr || user.outletIds?.map((oid: any) => oid.toString()).includes(myOutletIdStr || '');
        if (!isSameOutlet) {
          ApiResponseHandler.forbidden(res, 'You cannot delete users outside your outlet scope');
          return;
        }
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
