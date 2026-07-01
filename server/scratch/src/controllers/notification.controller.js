import { Types } from 'mongoose';
import { NotificationService } from '../services/notification.service.js';
import { ApiResponseHandler } from '../utils/response.handler.js';
export class NotificationController {
    /**
     * List notifications for the logged-in user
     * GET /notifications
     */
    static async listNotifications(req, res) {
        try {
            if (!req.user?.userId || !req.user?.tenantId) {
                ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
                return;
            }
            const isReadQuery = req.query.isRead;
            const page = parseInt(req.query.page) || 1;
            const limit = Math.min(parseInt(req.query.limit) || 20, 100);
            const skip = (page - 1) * limit;
            let isRead;
            if (isReadQuery === 'true') {
                isRead = true;
            }
            else if (isReadQuery === 'false') {
                isRead = false;
            }
            const filters = { limit, skip };
            if (isRead !== undefined) {
                filters.isRead = isRead;
            }
            const { notifications, total } = await NotificationService.getNotificationsForUser(req.user.userId, req.user.tenantId, filters);
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
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || 'Failed to list notifications');
        }
    }
    /**
     * Mark a specific notification as read
     * PATCH /notifications/:id/read
     */
    static async markAsRead(req, res) {
        try {
            if (!req.user?.userId || !req.user?.tenantId) {
                ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
                return;
            }
            const { id } = req.params;
            if (!Types.ObjectId.isValid(id)) {
                ApiResponseHandler.badRequest(res, 'Invalid notification ID format');
                return;
            }
            const notification = await NotificationService.markAsRead(id, req.user.userId, req.user.tenantId);
            if (!notification) {
                ApiResponseHandler.notFound(res, 'Notification not found or access denied');
                return;
            }
            ApiResponseHandler.success(res, 200, 'Notification marked as read successfully', {
                id: notification._id,
                isRead: notification.isRead,
                readAt: notification.readAt,
            });
        }
        catch (error) {
            ApiResponseHandler.badRequest(res, error.message || 'Failed to mark notification as read');
        }
    }
    /**
     * Mark all unread notifications of the user as read
     * PATCH /notifications/read-all
     */
    static async markAllAsRead(req, res) {
        try {
            if (!req.user?.userId || !req.user?.tenantId) {
                ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
                return;
            }
            await NotificationService.markAllAsRead(req.user.userId, req.user.tenantId);
            ApiResponseHandler.success(res, 200, 'All notifications marked as read');
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || 'Failed to mark notifications as read');
        }
    }
    /**
     * Soft-delete a notification
     * DELETE /notifications/:id
     */
    static async deleteNotification(req, res) {
        try {
            if (!req.user?.userId || !req.user?.tenantId) {
                ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
                return;
            }
            const { id } = req.params;
            if (!Types.ObjectId.isValid(id)) {
                ApiResponseHandler.badRequest(res, 'Invalid notification ID format');
                return;
            }
            const notification = await NotificationService.deleteNotification(id, req.user.userId, req.user.tenantId);
            if (!notification) {
                ApiResponseHandler.notFound(res, 'Notification not found or access denied');
                return;
            }
            ApiResponseHandler.success(res, 200, 'Notification deleted successfully');
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || 'Failed to delete notification');
        }
    }
}
