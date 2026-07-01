import mongoose, { Document, Model, Schema, Types } from "mongoose";
import {
  IntegrationEventDirection,
  IntegrationEventStatus,
  IntegrationProvider,
} from "../types/integration.type.js";

export interface IIntegrationEvent extends Document {
  tenantId: Types.ObjectId;
  outletId: Types.ObjectId | null;
  connectionId: Types.ObjectId | null;
  provider: IntegrationProvider;
  direction: IntegrationEventDirection;
  eventType: string;
  externalEventId: string | null;
  externalOrderId: string | null;
  externalOrderRef: Types.ObjectId | null;
  status: IntegrationEventStatus;
  payload: unknown;
  responsePayload: unknown | null;
  errorMessage: string | null;
  retryCount: number;
  maxRetryCount: number;
  nextRetryAt: Date | null;
  dlqReason: string | null;
  processedAt: Date | null;
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const integrationEventSchema = new Schema<IIntegrationEvent>(
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
    direction: {
      type: String,
      enum: Object.values(IntegrationEventDirection),
      required: [true, "Direction is required"],
    },
    eventType: {
      type: String,
      required: [true, "Event type is required"],
      trim: true,
    },
    externalEventId: {
      type: String,
      trim: true,
      default: null,
    },
    externalOrderId: {
      type: String,
      trim: true,
      default: null,
    },
    externalOrderRef: {
      type: Schema.Types.ObjectId,
      ref: "ExternalOrder",
      default: null,
    },
    status: {
      type: String,
      enum: Object.values(IntegrationEventStatus),
      default: IntegrationEventStatus.PENDING,
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
      trim: true,
      default: null,
    },
    retryCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxRetryCount: {
      type: Number,
      default: 3,
      min: 0,
    },
    nextRetryAt: {
      type: Date,
      default: null,
    },
    dlqReason: {
      type: String,
      trim: true,
      default: null,
    },
    processedAt: {
      type: Date,
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

integrationEventSchema.index({ tenantId: 1, provider: 1, externalEventId: 1 }, { sparse: true });
integrationEventSchema.index({ tenantId: 1, status: 1 });
integrationEventSchema.index({ externalOrderRef: 1 });
integrationEventSchema.index({ nextRetryAt: 1, status: 1 });
integrationEventSchema.index({ createdAt: -1 });
integrationEventSchema.index({ isDeleted: 1 });

integrationEventSchema.pre("find", function () {
  this.where({ isDeleted: false });
});

integrationEventSchema.pre("findOne", function () {
  this.where({ isDeleted: false });
});

const IntegrationEvent: Model<IIntegrationEvent> =
  mongoose.model<IIntegrationEvent>("IntegrationEvent", integrationEventSchema);

export default IntegrationEvent;
