import mongoose, { Document, Model, Schema, Types } from "mongoose";
import { IRestaurantSubscription } from "../modules/subscription/subscription.interface.js";
import {
  SubscriptionStatus as SaaSStatus,
  BillingCycle,
  PaymentProvider
} from "../modules/subscription/subscription.enum.js";
import { SubscriptionPlan } from "./enums.js";

export interface IRestaurantSubscriptionDocument extends Document {
  tenantId: Types.ObjectId;
  restaurantId: Types.ObjectId;
  planId: Types.ObjectId;
  plan: SubscriptionPlan;
  amount: number;
  status: SaaSStatus;
  billingCycle: BillingCycle;
  startDate: Date;
  endDate: Date;
  nextBillingDate: Date;
  cancelAtPeriodEnd: boolean;
  trialEndsAt: Date | null;
  graceEndsAt: Date | null;
  renewalEnabled: boolean;
  paymentProvider: PaymentProvider;
  paymentCustomerId?: string;
  paymentSubscriptionId?: string;
  invoiceIds: Types.ObjectId[];
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ISubscription = IRestaurantSubscriptionDocument;

const restaurantSubscriptionSchema = new Schema<IRestaurantSubscriptionDocument>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: [true, "Tenant ID is required"],
    },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
      required: [true, "Restaurant ID is required"],
    },
    planId: {
      type: Schema.Types.ObjectId,
      ref: "SubscriptionPlan",
      required: [true, "Plan ID is required"],
    },
    plan: {
      type: String,
      enum: {
        values: Object.values(SubscriptionPlan),
        message: "Invalid subscription plan: {VALUE}",
      },
      default: SubscriptionPlan.FREE,
    },
    amount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: {
        values: Object.values(SaaSStatus),
        message: "Invalid subscription status: {VALUE}",
      },
      default: SaaSStatus.TRIAL,
    },
    billingCycle: {
      type: String,
      enum: {
        values: Object.values(BillingCycle),
        message: "Invalid billing cycle: {VALUE}",
      },
      default: BillingCycle.MONTHLY,
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
    },
    nextBillingDate: {
      type: Date,
      required: [true, "Next billing date is required"],
    },
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },
    trialEndsAt: {
      type: Date,
      default: null,
    },
    graceEndsAt: {
      type: Date,
      default: null,
    },
    renewalEnabled: {
      type: Boolean,
      default: true,
    },
    paymentProvider: {
      type: String,
      enum: {
        values: Object.values(PaymentProvider),
        message: "Invalid payment provider: {VALUE}",
      },
      default: PaymentProvider.MANUAL,
    },
    paymentCustomerId: {
      type: String,
      default: null,
    },
    paymentSubscriptionId: {
      type: String,
      default: null,
    },
    invoiceIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Invoice",
      },
    ],
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

restaurantSubscriptionSchema.index({ tenantId: 1 });
restaurantSubscriptionSchema.index({ restaurantId: 1 });
restaurantSubscriptionSchema.index({ tenantId: 1, status: 1 });
restaurantSubscriptionSchema.index({ endDate: 1, status: 1 });
restaurantSubscriptionSchema.index({ isDeleted: 1 });

restaurantSubscriptionSchema.pre("find", function () {
  this.where({ isDeleted: false });
});

restaurantSubscriptionSchema.pre("findOne", function () {
  this.where({ isDeleted: false });
});

const RestaurantSubscriptionModel: Model<IRestaurantSubscriptionDocument> =
  mongoose.models.RestaurantSubscription ||
  mongoose.model<IRestaurantSubscriptionDocument>(
    "RestaurantSubscription",
    restaurantSubscriptionSchema
  );

export default RestaurantSubscriptionModel;
export const Subscription = RestaurantSubscriptionModel;
