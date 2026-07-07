import mongoose, { Document, Model, Schema } from "mongoose";
import { ISubscriptionUsage } from "../modules/subscription/subscription.interface.js";

export interface ISubscriptionUsageDocument extends ISubscriptionUsage, Document {}

const subscriptionUsageSchema = new Schema<ISubscriptionUsageDocument>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: [true, "Tenant ID is required"],
    },
    month: {
      type: Number,
      required: [true, "Month is required"],
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: [true, "Year is required"],
    },
    ordersUsed: {
      type: Number,
      default: 0,
      min: 0,
    },
    employeesUsed: {
      type: Number,
      default: 0,
      min: 0,
    },
    outletsUsed: {
      type: Number,
      default: 0,
      min: 0,
    },
    storageUsed: {
      type: Number,
      default: 0,
      min: 0,
    },
    apiCalls: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

subscriptionUsageSchema.index({ tenantId: 1, month: 1, year: 1 }, { unique: true });

const SubscriptionUsageModel: Model<ISubscriptionUsageDocument> =
  mongoose.models.SubscriptionUsage ||
  mongoose.model<ISubscriptionUsageDocument>("SubscriptionUsage", subscriptionUsageSchema);

export default SubscriptionUsageModel;
