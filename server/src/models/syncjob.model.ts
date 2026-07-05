import mongoose, { Document, Model, Schema, Types } from "mongoose";
import {
  IntegrationProvider,
  SyncJobStatus,
  SyncJobType,
} from "../types/integration.type.js";

export interface ISyncJob extends Document {
  tenantId: Types.ObjectId;
  outletId: Types.ObjectId | null;
  connectionId: Types.ObjectId | null;
  provider: IntegrationProvider;
  type: SyncJobType;
  status: SyncJobStatus;
  idempotencyKey: string | null;
  payload: unknown;
  responsePayload: unknown | null;
  errorMessage: string | null;
  failureReason: string | null;
  eventId: Types.ObjectId | null;
  correlationId: string | null;
  retryCount: number;
  maxRetryCount: number;
  nextRetryAt: Date | null;
  dlqReason: string | null;
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

const syncJobSchema = new Schema<ISyncJob>(
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
    type: {
      type: String,
      required: [true, "Sync job type is required"],
      enum: Object.values(SyncJobType),
    },
    status: {
      type: String,
      required: [true, "Sync job status is required"],
      enum: Object.values(SyncJobStatus),
      default: SyncJobStatus.PENDING,
    },
    idempotencyKey: {
      type: String,
      trim: true,
      default: null,
    },
    payload: {
      type: Schema.Types.Mixed,
      required: [true, "Payload is required"],
    },
    responsePayload: {
      type: Schema.Types.Mixed,
      default: null,
    },
    errorMessage: {
      type: String,
      default: null,
      trim: true,
    },
    failureReason: {
      type: String,
      default: null,
      trim: true,
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
      trim: true,
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "IntegrationEventQueue",
      default: null,
    },
    correlationId: {
      type: String,
      trim: true,
      default: null,
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

syncJobSchema.index({ tenantId: 1, status: 1 });
syncJobSchema.index({ tenantId: 1, provider: 1, type: 1 });
syncJobSchema.index({ nextRetryAt: 1, status: 1 });
syncJobSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });
syncJobSchema.index({ isDeleted: 1 });

syncJobSchema.pre("find", function () {
  this.where({ isDeleted: false });
});

syncJobSchema.pre("findOne", function () {
  this.where({ isDeleted: false });
});

const SyncJob: Model<ISyncJob> = mongoose.model<ISyncJob>("SyncJob", syncJobSchema);

export default SyncJob;
