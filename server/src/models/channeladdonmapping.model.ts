import mongoose, { Document, Model, Schema, Types } from "mongoose";
import { IntegrationProvider } from "../types/integration.type.js";

export interface IChannelAddonMapping extends Document {
  tenantId: Types.ObjectId;
  outletId: Types.ObjectId;
  menuItemId: Types.ObjectId;
  addonId: Types.ObjectId;
  connectionId: Types.ObjectId | null;
  provider: IntegrationProvider;
  externalAddonId: string;
  externalAddonName?: string;
  priceOverride: number | null;
  isActive: boolean;
  metadata: Record<string, unknown> | null;
  isSandbox?: boolean;
  sandboxVersion?: string;
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const channelAddonMappingSchema = new Schema<IChannelAddonMapping>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: [true, "Tenant is required"],
    },
    outletId: {
      type: Schema.Types.ObjectId,
      ref: "Outlet",
      required: [true, "Outlet is required"],
    },
    menuItemId: {
      type: Schema.Types.ObjectId,
      ref: "MenuItem",
      required: [true, "Menu item is required"],
    },
    addonId: {
      type: Schema.Types.ObjectId,
      ref: "Addon",
      required: [true, "Addon is required"],
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
    externalAddonId: {
      type: String,
      required: [true, "External addon ID is required"],
      trim: true,
    },
    externalAddonName: {
      type: String,
      trim: true,
    },
    priceOverride: {
      type: Number,
      default: null,
      min: [0, "Price override cannot be negative"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
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

channelAddonMappingSchema.index(
  { tenantId: 1, outletId: 1, provider: 1, externalAddonId: 1 },
  { unique: true }
);
channelAddonMappingSchema.index({ tenantId: 1, addonId: 1, provider: 1 });
channelAddonMappingSchema.index({ connectionId: 1 });
channelAddonMappingSchema.index({ isDeleted: 1 });

channelAddonMappingSchema.pre("find", function () {
  this.where({ isDeleted: false });
});

channelAddonMappingSchema.pre("findOne", function () {
  this.where({ isDeleted: false });
});

const ChannelAddonMapping: Model<IChannelAddonMapping> =
  mongoose.model<IChannelAddonMapping>(
    "ChannelAddonMapping",
    channelAddonMappingSchema
  );

export default ChannelAddonMapping;
