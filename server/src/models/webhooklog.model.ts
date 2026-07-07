import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import { WebhookProvider, WebhookStatus } from "./enums.js";

export interface IWebhookLog extends Document {
  tenantId: Types.ObjectId;
  provider: WebhookProvider;
  eventType: string;
  payload: Record<string, unknown>;
  processed: boolean;
  processedAt: Date | null;
  retryCount: number;
  errorMessage: string | null;
  httpStatusCode: number | null;
  signature?: string;
  status: WebhookStatus;
  externalEventId: string | null;
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const webhookLogSchema = new Schema<IWebhookLog>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: [true, 'Tenant is required'],
    },
    provider: {
      type: String,
      required: [true, 'Provider is required'],
      trim: true,
      enum: {
        values: Object.values(WebhookProvider),
        message: 'Invalid webhook provider: {VALUE}',
      },
    },
    eventType: {
      type: String,
      required: [true, 'Event type is required'],
      trim: true,
    },
    payload: {
      type: Schema.Types.Mixed,
      required: [true, 'Payload is required'],
    },
    processed: {
      type: Boolean,
      default: false,
    },
    processedAt: {
      type: Date,
      default: null,
    },
    retryCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    errorMessage: {
      type: String,
      trim: true,
      default: null,
    },
    httpStatusCode: {
      type: Number,
      default: null,
    },
    signature: {
      type: String,
      trim: true,
      select: false,
      default: null,
    },
    status: {
      type: String,
      enum: {
        values: Object.values(WebhookStatus),
        message: 'Invalid webhook status: {VALUE}',
      },
      default: WebhookStatus.PENDING,
    },
    externalEventId: {
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

webhookLogSchema.index({ tenantId: 1 });
webhookLogSchema.index({ provider: 1, eventType: 1 });
webhookLogSchema.index({ processed: 1 });
webhookLogSchema.index({ tenantId: 1, processed: 1 });
webhookLogSchema.index({ createdAt: -1 });
// TTL: auto-delete webhook logs after 90 days
webhookLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7_776_000 });
webhookLogSchema.index({ tenantId: 1, provider: 1, externalEventId: 1 }, { unique: true, sparse: true });
webhookLogSchema.index({ isDeleted: 1 });

webhookLogSchema.pre('find', function () {
  this.where({ isDeleted: false });
});

webhookLogSchema.pre('findOne', function () {
  this.where({ isDeleted: false });
});

const WebhookLog: Model<IWebhookLog> = mongoose.model<IWebhookLog>(
  'WebhookLog',
  webhookLogSchema
);
export default WebhookLog;
