import mongoose, { Document, Model, Schema, Types } from "mongoose";
import {
  IntegrationProcessingStatus,
  IntegrationProvider,
} from "../types/integration.type.js";

export interface IExternalOrder extends Document {
  tenantId: Types.ObjectId;
  outletId: Types.ObjectId | null;
  connectionId: Types.ObjectId | null;
  provider: IntegrationProvider;
  externalOrderId: string;
  externalDisplayId: string | null;
  internalOrderId: Types.ObjectId | null;
  status: IntegrationProcessingStatus;
  rawPayload: unknown;
  canonicalPayload: unknown | null;
  failureReason: string | null;
  retryCount: number;
  maxRetryCount: number;
  nextRetryAt: Date | null;
  dlqReason: string | null;
  receivedAt: Date;
  processedAt: Date | null;
  isSandbox?: boolean;
  sandboxVersion?: string;
  sessionId?: Types.ObjectId | null;
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const externalOrderSchema = new Schema<IExternalOrder>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: [true, "Tenant is required"],
    },
    outletId: {
      type: Schema.Types.ObjectId,
      ref: "Outlet",
      default: null,
    },
    connectionId: {
      type: Schema.Types.ObjectId,
      ref: "ChannelConnection",
      default: null,
    },
    provider: {
      type: String,
      required: [true, "Provider is required"],
      enum: Object.values(IntegrationProvider),
      trim: true,
      uppercase: true,
    },
    externalOrderId: {
      type: String,
      required: [true, "External order ID is required"],
      trim: true,
    },
    externalDisplayId: {
      type: String,
      trim: true,
      default: null,
    },
    internalOrderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    status: {
      type: String,
      required: [true, "Status is required"],
      enum: Object.values(IntegrationProcessingStatus),
      default: IntegrationProcessingStatus.RECEIVED,
    },
    rawPayload: {
      type: Schema.Types.Mixed,
      required: [true, "Raw payload is required"],
    },
    canonicalPayload: {
      type: Schema.Types.Mixed,
      default: null,
    },
    failureReason: {
      type: String,
      default: null,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    maxRetryCount: {
      type: Number,
      default: 3,
    },
    nextRetryAt: {
      type: Date,
      default: null,
    },
    dlqReason: {
      type: String,
      default: null,
    },
    receivedAt: {
      type: Date,
      default: Date.now,
    },
    processedAt: {
      type: Date,
      default: null,
    },
    isSandbox: {
      type: Boolean,
      default: false,
    },
    sandboxVersion: {
      type: String,
      default: "v1",
    },
    sessionId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
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

externalOrderSchema.index(
  { tenantId: 1, provider: 1, externalOrderId: 1 },
  { unique: true }
);
externalOrderSchema.index({ tenantId: 1, status: 1 });
externalOrderSchema.index({ internalOrderId: 1 });
externalOrderSchema.index({ nextRetryAt: 1, status: 1 });
externalOrderSchema.index({ isDeleted: 1 });

externalOrderSchema.pre("find", function () {
  this.where({ isDeleted: false });
});

externalOrderSchema.pre("findOne", function () {
  this.where({ isDeleted: false });
});

const ExternalOrder: Model<IExternalOrder> =
  mongoose.model<IExternalOrder>("ExternalOrder", externalOrderSchema);

export default ExternalOrder;
