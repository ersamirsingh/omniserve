import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { RestaurantJoinRequestStatus, UserRole } from '../enums/enums.js';
import { RestaurantJoinRequestService } from '../services/restaurantJoinRequest.service.js';
import { ApiResponseHandler } from '../utils/response.handler.js';
import { RoleHierarchy } from '../utils/roleHierarchy.utils.js';

export class RestaurantJoinRequestController {
  private static EMAIL_REGEX = /^\S+@\S+\.\S+$/;
  private static PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  private static PHONE_REGEX = /^\+?[\d\s\-().]{7,20}$/;

  static async createJoinRequest(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.tenantId || !req.user?.userId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
        return;
      }

      const { restaurantId } = req.params as { restaurantId: string };
      if (!Types.ObjectId.isValid(restaurantId)) {
        ApiResponseHandler.badRequest(res, 'Invalid restaurantId');
        return;
      }

      const { email, requestedRole, firstName, lastName, phone, message } = req.body;

      if (!email || !requestedRole) {
        ApiResponseHandler.badRequest(res, 'email and requestedRole are required');
        return;
      }

      if (!RestaurantJoinRequestController.EMAIL_REGEX.test(email)) {
        ApiResponseHandler.badRequest(res, 'Please provide a valid email address');
        return;
      }

      if (!RoleHierarchy.isKnownRole(requestedRole)) {
        ApiResponseHandler.badRequest(res, `Invalid requestedRole: ${requestedRole}`);
        return;
      }

      if (firstName !== undefined && (typeof firstName !== 'string' || firstName.trim().length === 0 || firstName.length > 50)) {
        ApiResponseHandler.badRequest(res, 'firstName must be a non-empty string and under 50 characters');
        return;
      }

      if (lastName !== undefined && (typeof lastName !== 'string' || lastName.trim().length === 0 || lastName.length > 50)) {
        ApiResponseHandler.badRequest(res, 'lastName must be a non-empty string and under 50 characters');
        return;
      }

      if (phone && !RestaurantJoinRequestController.PHONE_REGEX.test(phone)) {
        ApiResponseHandler.badRequest(res, 'Please provide a valid phone number');
        return;
      }

      if (message !== undefined && (typeof message !== 'string' || message.trim().length === 0 || message.length > 1000)) {
        ApiResponseHandler.badRequest(res, 'message must be a non-empty string and under 1000 characters');
        return;
      }

      const result = await RestaurantJoinRequestService.createJoinRequest({
        tenantId: req.user.tenantId,
        restaurantId,
        requesterUserId: req.user.userId,
        requesterRole: req.user.role as UserRole,
        email,
        requestedRole,
        firstName,
        lastName,
        phone,
        message,
      });

      ApiResponseHandler.success(
        res,
        result.alreadyPending ? 200 : 201,
        result.alreadyPending
          ? 'A pending join request already exists; invite link was not resent'
          : 'Restaurant join request created successfully',
        {
          request: RestaurantJoinRequestService.responseData(result.request),
          emailSent: result.emailSent,
          alreadyPending: result.alreadyPending,
        }
      );
    } catch (error: any) {
      ApiResponseHandler.badRequest(res, error.message || 'Failed to create restaurant join request');
    }
  }

  static async listJoinRequests(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
        return;
      }

      const { restaurantId } = req.params as { restaurantId: string };
      if (!Types.ObjectId.isValid(restaurantId)) {
        ApiResponseHandler.badRequest(res, 'Invalid restaurantId');
        return;
      }

      const status = req.query.status as RestaurantJoinRequestStatus | undefined;
      if (status && !Object.values(RestaurantJoinRequestStatus).includes(status)) {
        ApiResponseHandler.badRequest(res, `Invalid status: ${status}`);
        return;
      }

      const requests = await RestaurantJoinRequestService.listJoinRequests(
        req.user.tenantId,
        restaurantId,
        status
      );

      ApiResponseHandler.success(res, 200, 'Restaurant join requests retrieved successfully', {
        requests: requests.map(request => RestaurantJoinRequestService.responseData(request)),
      });
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || 'Failed to list restaurant join requests');
    }
  }

  static async addMessage(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.tenantId || !req.user?.userId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
        return;
      }

      const { requestId } = req.params as { requestId: string };
      if (!Types.ObjectId.isValid(requestId)) {
        ApiResponseHandler.badRequest(res, 'Invalid requestId');
        return;
      }

      const { message } = req.body;
      if (!message || typeof message !== 'string' || message.trim().length === 0 || message.length > 1000) {
        ApiResponseHandler.badRequest(res, 'message is required and must be under 1000 characters');
        return;
      }

      const request = await RestaurantJoinRequestService.addMessage(
        req.user.tenantId,
        requestId,
        req.user.userId,
        req.user.role as UserRole,
        message
      );

      if (!request) {
        ApiResponseHandler.notFound(res, 'Restaurant join request not found');
        return;
      }

      ApiResponseHandler.success(res, 200, 'Message added successfully', {
        request: RestaurantJoinRequestService.responseData(request),
      });
    } catch (error: any) {
      ApiResponseHandler.badRequest(res, error.message || 'Failed to add message');
    }
  }

  static async rejectOrCancel(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.tenantId || !req.user?.userId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
        return;
      }

      const { requestId } = req.params as { requestId: string };
      if (!Types.ObjectId.isValid(requestId)) {
        ApiResponseHandler.badRequest(res, 'Invalid requestId');
        return;
      }

      const { status, message } = req.body;
      const allowedStatuses = [
        RestaurantJoinRequestStatus.REJECTED,
        RestaurantJoinRequestStatus.CANCELLED,
      ];

      if (!allowedStatuses.includes(status)) {
        ApiResponseHandler.badRequest(res, 'status must be REJECTED or CANCELLED');
        return;
      }

      const request = await RestaurantJoinRequestService.decideJoinRequest(
        req.user.tenantId,
        requestId,
        req.user.userId,
        req.user.role as UserRole,
        status,
        message
      );

      if (!request) {
        ApiResponseHandler.notFound(res, 'Restaurant join request not found');
        return;
      }

      ApiResponseHandler.success(res, 200, 'Restaurant join request updated successfully', {
        request: RestaurantJoinRequestService.responseData(request),
      });
    } catch (error: any) {
      ApiResponseHandler.badRequest(res, error.message || 'Failed to update restaurant join request');
    }
  }

  static async acceptByToken(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params as { token: string };
      const { firstName, lastName, phone, password } = req.body;

      if (!token) {
        ApiResponseHandler.badRequest(res, 'Invite token is required');
        return;
      }

      if (password !== undefined && !RestaurantJoinRequestController.PASSWORD_REGEX.test(password)) {
        ApiResponseHandler.badRequest(res, 'Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character');
        return;
      }

      if (phone && !RestaurantJoinRequestController.PHONE_REGEX.test(phone)) {
        ApiResponseHandler.badRequest(res, 'Please provide a valid phone number');
        return;
      }

      const { request, user } = await RestaurantJoinRequestService.acceptJoinRequest({
        token,
        firstName,
        lastName,
        phone,
        password,
      });

      ApiResponseHandler.success(res, 200, 'Restaurant join request accepted successfully', {
        request: RestaurantJoinRequestService.responseData(request),
        user: {
          id: user._id,
          tenantId: user.tenantId,
          restaurantId: user.restaurantId,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          status: user.status,
        },
      });
    } catch (error: any) {
      ApiResponseHandler.badRequest(res, error.message || 'Failed to accept restaurant join request');
    }
  }

  static async getAssignableRoles(req: Request, res: Response): Promise<void> {
    if (!req.user?.role) {
      ApiResponseHandler.unauthorized(res, 'User not authenticated');
      return;
    }

    ApiResponseHandler.success(res, 200, 'Assignable restaurant roles retrieved successfully', {
      roles: RoleHierarchy.assignableRestaurantRoles(req.user.role as UserRole),
    });
  }
}
