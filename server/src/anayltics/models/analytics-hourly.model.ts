import mongoose, { Document, Schema, Types } from "mongoose";

export interface IAnalyticsHourly extends Document {
  tenantId: Types.ObjectId;

  outletId: Types.ObjectId;

  reportDate: Date;

  hour: number;

  totalOrders: number;

  totalRevenue: number;

  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IAnalyticsHourly>(
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

    hour: {
      type: Number,
      required: true,
      min: 0,
      max: 23,
    },

    totalOrders: {
      type: Number,
      default: 0,
    },

    totalRevenue: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

schema.index({
  tenantId: 1,
  outletId: 1,
  reportDate: 1,
  hour: 1,
});

export default mongoose.model<IAnalyticsHourly>(
  "AnalyticsHourly",
  schema
);