import mongoose, { Types } from 'mongoose';
import Notification, { INotification } from "../../models/notification.model.js";
import User from "../../models/user.model.js";
import { NotificationType, UserStatus } from "../../models/enums.js";

export class NotificationService {
  /**
   * Create a single notification
   */
  static async createNotification(
    tenantId: string,
    userId: string,
    title: string,
    message: string,
    type: NotificationType,
    entityId?: string,
    entityType?: string,
    createdByUserId?: string
  ): Promise<INotification> {
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
  static async createBulkNotifications(
    tenantId: string,
    userIds: string[],
    title: string,
    message: string,
    type: NotificationType,
    entityId?: string,
    entityType?: string,
    createdByUserId?: string
  ): Promise<INotification[]> {
    if (userIds.length === 0) return [];

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
  static async notifyTenantUsers(
    tenantId: string,
    title: string,
    message: string,
    type: NotificationType,
    entityId?: string,
    entityType?: string,
    createdByUserId?: string
  ): Promise<INotification[]> {
    try {
      // Guard: if the DB connection is closed (e.g. during test teardown), skip silently.
      // readyState: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
      if (mongoose.connection.readyState !== 1) {
        return [];
      }

      const activeUsers = await User.find({
        tenantId: new Types.ObjectId(tenantId),
        status: UserStatus.ACTIVE,
        isDeleted: false,
      });

      const userIds = activeUsers.map(u => u._id.toString());
      return await this.createBulkNotifications(
        tenantId,
        userIds,
        title,
        message,
        type,
        entityId,
        entityType,
        createdByUserId
      );
    } catch (error) {
      console.error('Failed to notify tenant users:', error);
      return [];
    }
  }

  /**
   * Get notifications for a user (tenant and user isolated)
   */
  static async getNotificationsForUser(
    userId: string,
    tenantId: string | undefined | null,
    filters: { isRead?: boolean; limit: number; skip: number },
    userRole?: string
  ): Promise<{ notifications: INotification[]; total: number }> {
    const query: any = {
      userId: new Types.ObjectId(userId),
      isDeleted: false,
    };
    if (userRole !== 'SYSTEM_ADMIN') {
      if (tenantId) {
        query.tenantId = new Types.ObjectId(tenantId);
      } else {
        query.tenantId = null;
      }
    }

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
  static async markAsRead(
    id: string,
    userId: string,
    tenantId: string | undefined | null,
    userRole?: string
  ): Promise<INotification | null> {
    const query: any = {
      _id: new Types.ObjectId(id),
      userId: new Types.ObjectId(userId),
      isDeleted: false,
    };
    if (userRole !== 'SYSTEM_ADMIN') {
      if (tenantId) {
        query.tenantId = new Types.ObjectId(tenantId);
      } else {
        query.tenantId = null;
      }
    }
    return await Notification.findOneAndUpdate(
      query,
      {
        isRead: true,
        readAt: new Date(),
        updatedBy: new Types.ObjectId(userId),
      },
      { new: true }
    );
  }

  /**
   * Mark all unread notifications of a user as read (with tenant/user checks)
   */
  static async markAllAsRead(
    userId: string,
    tenantId: string | undefined | null,
    userRole?: string
  ): Promise<void> {
    const query: any = {
      userId: new Types.ObjectId(userId),
      isRead: false,
      isDeleted: false,
    };
    if (userRole !== 'SYSTEM_ADMIN') {
      if (tenantId) {
        query.tenantId = new Types.ObjectId(tenantId);
      } else {
        query.tenantId = null;
      }
    }
    await Notification.updateMany(
      query,
      {
        isRead: true,
        readAt: new Date(),
        updatedBy: new Types.ObjectId(userId),
      }
    );
  }

  /**
   * Soft-delete a notification (with strict ownership check)
   */
  static async deleteNotification(
    id: string,
    userId: string,
    tenantId: string | undefined | null,
    userRole?: string
  ): Promise<INotification | null> {
    const query: any = {
      _id: new Types.ObjectId(id),
      userId: new Types.ObjectId(userId),
      isDeleted: false,
    };
    if (userRole !== 'SYSTEM_ADMIN') {
      if (tenantId) {
        query.tenantId = new Types.ObjectId(tenantId);
      } else {
        query.tenantId = null;
      }
    }
    return await Notification.findOneAndUpdate(
      query,
      {
        isDeleted: true,
        updatedBy: new Types.ObjectId(userId),
      },
      { new: true }
    );
  }

  /**
   * Notify staff, managers, and admins of an operational alert for an outlet
   */
  static async notifyOutletOperationalAlert(
    tenantId: string,
    outletId: string,
    title: string,
    message: string,
    entityId?: string,
    entityType?: string
  ): Promise<INotification[]> {
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
      return await this.createBulkNotifications(
        tenantId,
        userIds,
        title,
        message,
        NotificationType.OPERATIONAL_ALERT,
        entityId,
        entityType
      );
    } catch (error) {
      console.error('Failed to notify outlet operational alert:', error);
      return [];
    }
  }
}
