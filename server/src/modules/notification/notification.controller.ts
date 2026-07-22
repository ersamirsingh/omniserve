import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { NotificationService } from "./notification.service.js";
import { ApiResponseHandler } from "../../utils/apiResponse.js";

export class NotificationController {

  static async listNotifications(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.userId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated');
        return;
      }
      if (!req.user?.tenantId && req.user?.role !== 'SYSTEM_ADMIN') {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
        return;
      }

      const isReadQuery = req.query.isRead as string | undefined;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const skip = (page - 1) * limit;

      let isRead: boolean | undefined;
      if (isReadQuery === 'true') {
        isRead = true;
      } else if (isReadQuery === 'false') {
        isRead = false;
      }

      const filters: { isRead?: boolean; limit: number; skip: number } = { limit, skip };
      if (isRead !== undefined) {
        filters.isRead = isRead;
      }

      const { notifications, total } = await NotificationService.getNotificationsForUser(
        req.user.userId,
        req.user.tenantId,
        filters,
        req.user.role
      );

      ApiResponseHandler.success(res, 200, 'Notifications retrieved successfully', {
        notifications: notifications.map(n => ({
          id: n._id,
          title: n.title,
          message: n.message,
          type: n.type,
          isRead: n.isRead,
          readAt: n.readAt,
          entityId: n.entityId,
          entityType: n.entityType,
          createdAt: n.createdAt,
        })),
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || 'Failed to list notifications');
    }
  }

  static async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.userId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated');
        return;
      }
      if (!req.user?.tenantId && req.user?.role !== 'SYSTEM_ADMIN') {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
        return;
      }

      const { id } = req.params as { id: string };
      if (!Types.ObjectId.isValid(id)) {
        ApiResponseHandler.badRequest(res, 'Invalid notification ID format');
        return;
      }

      const notification = await NotificationService.markAsRead(
        id,
        req.user.userId,
        req.user.tenantId,
        req.user.role
      );

      if (!notification) {
        ApiResponseHandler.notFound(res, 'Notification not found or access denied');
        return;
      }

      ApiResponseHandler.success(res, 200, 'Notification marked as read successfully', {
        id: notification._id,
        isRead: notification.isRead,
        readAt: notification.readAt,
      });
    } catch (error: any) {
      ApiResponseHandler.badRequest(res, error.message || 'Failed to mark notification as read');
    }
  }

  static async markAllAsRead(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.userId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated');
        return;
      }
      if (!req.user?.tenantId && req.user?.role !== 'SYSTEM_ADMIN') {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
        return;
      }

      await NotificationService.markAllAsRead(req.user.userId, req.user.tenantId, req.user.role);

      ApiResponseHandler.success(res, 200, 'All notifications marked as read');
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || 'Failed to mark notifications as read');
    }
  }

  static async deleteNotification(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.userId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated');
        return;
      }
      if (!req.user?.tenantId && req.user?.role !== 'SYSTEM_ADMIN') {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
        return;
      }

      const { id } = req.params as { id: string };
      if (!Types.ObjectId.isValid(id)) {
        ApiResponseHandler.badRequest(res, 'Invalid notification ID format');
        return;
      }

      const notification = await NotificationService.deleteNotification(
        id,
        req.user.userId,
        req.user.tenantId,
        req.user.role
      );

      if (!notification) {
        ApiResponseHandler.notFound(res, 'Notification not found or access denied');
        return;
      }

      ApiResponseHandler.success(res, 200, 'Notification deleted successfully');
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || 'Failed to delete notification');
    }
  }
}
