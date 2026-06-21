import mongoose, { Document, Schema, Types } from "mongoose";

export interface IAnalyticsCustomerDaily extends Document {
  tenantId: Types.ObjectId;

  reportDate: Date;

  totalCustomers: number;

  newCustomers: number;

  repeatCustomers: number;

  retentionRate: number;

  averageCustomerValue: number;

  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IAnalyticsCustomerDaily>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },

    reportDate: {
      type: Date,
      required: true,
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

    averageCustomerValue: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

schema.index(
  { tenantId: 1, reportDate: 1 },
  { unique: true }
);

export default mongoose.model<IAnalyticsCustomerDaily>(
  "AnalyticsCustomerDaily",
  schema
);