import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import { NotificationType } from '../enums/enums.js';

export interface INotification extends Document {
  tenantId: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  readAt: Date | null;
  entityId: Types.ObjectId | null;
  entityType: string | null;
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: [true, 'Tenant is required'],
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
    },
    type: {
      type: String,
      required: [true, 'Notification type is required'],
      enum: {
        values: Object.values(NotificationType),
        message: 'Invalid notification type: {VALUE}',
      },
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
    entityId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    entityType: {
      type: String,
      trim: true,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ tenantId: 1 });
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ isDeleted: 1 });

notificationSchema.pre('find', function () {
  this.where({ isDeleted: false });
});

notificationSchema.pre('findOne', function () {
  this.where({ isDeleted: false });
});

const Notification: Model<INotification> = mongoose.model<INotification>(
  'Notification',
  notificationSchema
);
export default Notification;
