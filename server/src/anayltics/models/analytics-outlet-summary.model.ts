import mongoose, { Document, Schema, Types } from "mongoose";

export interface IAnalyticsOutletSummary extends Document {
  tenantId: Types.ObjectId;

  outletId: Types.ObjectId;

  totalOrders: number;

  totalRevenue: number;

  totalCustomers: number;

  averageOrderValue: number;

  averageCustomerSpend: number;

  grossProfit: number;

  lastCalculatedAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IAnalyticsOutletSummary>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },

    outletId: {
      type: Schema.Types.ObjectId,
      ref: "Outlet",
      required: true,
      unique: true,
    },

    totalOrders: {
      type: Number,
      default: 0,
    },

    totalRevenue: {
      type: Number,
      default: 0,
    },

    totalCustomers: {
      type: Number,
      default: 0,
    },

    averageOrderValue: {
      type: Number,
      default: 0,
    },

    averageCustomerSpend: {
      type: Number,
      default: 0,
    },

    grossProfit: {
      type: Number,
      default: 0,
    },

    lastCalculatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export default mongoose.model<IAnalyticsOutletSummary>(
  "AnalyticsOutletSummary",
  schema
);