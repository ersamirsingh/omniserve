import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IAnalyticsDaily extends Document {
  tenantId: Types.ObjectId;
  outletId: Types.ObjectId;

  reportDate: Date;

  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;

  totalRevenue: number;
  totalDiscount: number;
  totalTax: number;

  grossProfit: number;
  netProfit: number;

  averageOrderValue: number;

  totalCustomers: number;
  newCustomers: number;
  repeatCustomers: number;

  retentionRate: number;

  peakHour?: number;

  createdAt: Date;
  updatedAt: Date;
}

const analyticsDailySchema = new Schema<IAnalyticsDaily>(
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
    },

    reportDate: {
      type: Date,
      required: true,
    },

    totalOrders: {
      type: Number,
      default: 0,
    },

    completedOrders: {
      type: Number,
      default: 0,
    },

    cancelledOrders: {
      type: Number,
      default: 0,
    },

    totalRevenue: {
      type: Number,
      default: 0,
    },

    totalDiscount: {
      type: Number,
      default: 0,
    },

    totalTax: {
      type: Number,
      default: 0,
    },

    grossProfit: {
      type: Number,
      default: 0,
    },

    netProfit: {
      type: Number,
      default: 0,
    },

    averageOrderValue: {
      type: Number,
      default: 0,
    },

    totalCustomers: {
      type: Number,
      default: 0,
    },

    newCustomers: {
      type: Number,
      default: 0,
    },

    repeatCustomers: {
      type: Number,
      default: 0,
    },

    retentionRate: {
      type: Number,
      default: 0,
    },

    peakHour: {
      type: Number,
      min: 0,
      max: 23,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

analyticsDailySchema.index(
  { tenantId: 1, outletId: 1, reportDate: 1 },
  { unique: true }
);

export default mongoose.model<IAnalyticsDaily>(
  "AnalyticsDaily",
  analyticsDailySchema
);