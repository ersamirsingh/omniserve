import { Types } from 'mongoose';
import Notification from '../models/notification.model.js';
import User from '../models/user.model.js';
import { NotificationType, UserStatus } from '../enums/enums.js';
export class NotificationService {
    /**
     * Create a single notification
     */
    static async createNotification(tenantId, userId, title, message, type, entityId, entityType, createdByUserId) {
        const notification = new Notification({
            tenantId: new Types.ObjectId(tenantId),
            userId: new Types.ObjectId(userId),
            title: title.trim(),
            message: message.trim(),
            type,
            entityId: entityId ? new Types.ObjectId(entityId) : null,
            entityType: entityType || null,
            isRead: false,
            readAt: null,
            createdBy: createdByUserId ? new Types.ObjectId(createdByUserId) : null,
            updatedBy: createdByUserId ? new Types.ObjectId(createdByUserId) : null,
            isDeleted: false,
        });
        return await notification.save();
    }
    /**
     * Create multiple notifications in bulk
     */
    static async createBulkNotifications(tenantId, userIds, title, message, type, entityId, entityType, createdByUserId) {
        if (userIds.length === 0)
            return [];
        const tenantObjectId = new Types.ObjectId(tenantId);
        const entityObjectId = entityId ? new Types.ObjectId(entityId) : null;
        const createdByObjectId = createdByUserId ? new Types.ObjectId(createdByUserId) : null;
        const docs = userIds.map(uid => ({
            tenantId: tenantObjectId,
            userId: new Types.ObjectId(uid),
            title: title.trim(),
            message: message.trim(),
            type,
            entityId: entityObjectId,
            entityType: entityType || null,
            isRead: false,
            readAt: null,
            createdBy: createdByObjectId,
            updatedBy: createdByObjectId,
            isDeleted: false,
        }));
        return await Notification.insertMany(docs);
    }
    /**
     * Notify all active users under a tenant
     */
    static async notifyTenantUsers(tenantId, title, message, type, entityId, entityType, createdByUserId) {
        try {
            const activeUsers = await User.find({
                tenantId: new Types.ObjectId(tenantId),
                status: UserStatus.ACTIVE,
                isDeleted: false,
            });
            const userIds = activeUsers.map(u => u._id.toString());
            return await this.createBulkNotifications(tenantId, userIds, title, message, type, entityId, entityType, createdByUserId);
        }
        catch (error) {
            console.error('Failed to notify tenant users:', error);
            return [];
        }
    }
    /**
     * Get notifications for a user (tenant and user isolated)
     */
    static async getNotificationsForUser(userId, tenantId, filters) {
        const query = {
            tenantId: new Types.ObjectId(tenantId),
            userId: new Types.ObjectId(userId),
            isDeleted: false,
        };
        if (filters.isRead !== undefined) {
            query.isRead = filters.isRead;
        }
        const [notifications, total] = await Promise.all([
            Notification.find(query)
                .sort({ createdAt: -1 })
                .limit(filters.limit)
                .skip(filters.skip),
            Notification.countDocuments(query),
        ]);
        return { notifications, total };
    }
    /**
     * Mark a specific notification as read (with strict ownership check)
     */
    static async markAsRead(id, userId, tenantId) {
        return await Notification.findOneAndUpdate({
            _id: new Types.ObjectId(id),
            userId: new Types.ObjectId(userId),
            tenantId: new Types.ObjectId(tenantId),
            isDeleted: false,
        }, {
            isRead: true,
            readAt: new Date(),
            updatedBy: new Types.ObjectId(userId),
        }, { new: true });
    }
    /**
     * Mark all unread notifications of a user as read (with tenant/user checks)
     */
    static async markAllAsRead(userId, tenantId) {
        await Notification.updateMany({
            userId: new Types.ObjectId(userId),
            tenantId: new Types.ObjectId(tenantId),
            isRead: false,
            isDeleted: false,
        }, {
            isRead: true,
            readAt: new Date(),
            updatedBy: new Types.ObjectId(userId),
        });
    }
    /**
     * Soft-delete a notification (with strict ownership check)
     */
    static async deleteNotification(id, userId, tenantId) {
        return await Notification.findOneAndUpdate({
            _id: new Types.ObjectId(id),
            userId: new Types.ObjectId(userId),
            tenantId: new Types.ObjectId(tenantId),
            isDeleted: false,
        }, {
            isDeleted: true,
            updatedBy: new Types.ObjectId(userId),
        }, { new: true });
    }
    /**
     * Notify staff, managers, and admins of an operational alert for an outlet
     */
    static async notifyOutletOperationalAlert(tenantId, outletId, title, message, entityId, entityType) {
        try {
            const activeUsers = await User.find({
                tenantId: new Types.ObjectId(tenantId),
                status: UserStatus.ACTIVE,
                isDeleted: false,
                $or: [
                    { outletId: new Types.ObjectId(outletId) },
                    { outletIds: new Types.ObjectId(outletId) },
                    { role: { $in: ['SUPER_ADMIN', 'RESTAURANT_OWNER'] } }
                ]
            });
            const userIds = activeUsers.map(u => u._id.toString());
            return await this.createBulkNotifications(tenantId, userIds, title, message, NotificationType.OPERATIONAL_ALERT, entityId, entityType);
        }
        catch (error) {
            console.error('Failed to notify outlet operational alert:', error);
            return [];
        }
    }
}
