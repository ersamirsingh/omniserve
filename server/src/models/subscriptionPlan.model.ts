import mongoose, { Document, Model, Schema } from "mongoose";
import { ISubscriptionPlan } from "../modules/subscription/subscription.interface.js";

export interface ISubscriptionPlanDocument extends ISubscriptionPlan, Document {}

const subscriptionPlanSchema = new Schema<ISubscriptionPlanDocument>(
  {
    name: {
      type: String,
      required: [true, "Plan name is required"],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, "Plan slug is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      default: "",
    },
    monthlyPrice: {
      type: Number,
      required: [true, "Monthly price is required"],
      min: [0, "Monthly price cannot be negative"],
    },
    yearlyPrice: {
      type: Number,
      required: [true, "Yearly price is required"],
      min: [0, "Yearly price cannot be negative"],
    },
    currency: {
      type: String,
      default: "INR",
      uppercase: true,
      trim: true,
    },
    trialDays: {
      type: Number,
      default: 14,
      min: [0, "Trial days cannot be negative"],
    },
    features: {
      inventory: { type: Boolean, default: false },
      crm: { type: Boolean, default: false },
      analytics: { type: Boolean, default: false },
      finance: { type: Boolean, default: false },
      kitchenDisplay: { type: Boolean, default: false },
      waiterApp: { type: Boolean, default: false },
      qrOrdering: { type: Boolean, default: false },
      reports: { type: Boolean, default: false },
      apiAccess: { type: Boolean, default: false },
      whiteLabel: { type: Boolean, default: false },
    },
    limits: {
      outlets: { type: Number, default: 1 },
      employees: { type: Number, default: 5 },
      monthlyOrders: { type: Number, default: 100 },
      menuItems: { type: Number, default: 100 },
      storageGB: { type: Number, default: 1 },
    },
    isPopular: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
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

subscriptionPlanSchema.index({ isActive: 1, isDeleted: 1 });

subscriptionPlanSchema.pre("find", function () {
  this.where({ isDeleted: false });
});

subscriptionPlanSchema.pre("findOne", function () {
  this.where({ isDeleted: false });
});

const SubscriptionPlanModel: Model<ISubscriptionPlanDocument> =
  mongoose.models.SubscriptionPlan ||
  mongoose.model<ISubscriptionPlanDocument>("SubscriptionPlan", subscriptionPlanSchema);

export default SubscriptionPlanModel;
