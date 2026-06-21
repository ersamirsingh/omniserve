import mongoose, { Document, Schema, Types } from "mongoose";

export interface IAnalyticsMenuDaily extends Document {
  tenantId: Types.ObjectId;
  outletId: Types.ObjectId;

  menuItemId: Types.ObjectId;

  reportDate: Date;

  quantitySold: number;

  revenue: number;

  cost: number;

  profit: number;

  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IAnalyticsMenuDaily>(
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

    menuItemId: {
      type: Schema.Types.ObjectId,
      ref: "MenuItem",
      required: true,
    },

    reportDate: {
      type: Date,
      required: true,
    },

    quantitySold: {
      type: Number,
      default: 0,
    },

    revenue: {
      type: Number,
      default: 0,
    },

    cost: {
      type: Number,
      default: 0,
    },

    profit: {
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
  menuItemId: 1,
  reportDate: 1,
});

export default mongoose.model<IAnalyticsMenuDaily>(
  "AnalyticsMenuDaily",
  schema
);