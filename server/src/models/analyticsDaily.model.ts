import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IAnalyticsDaily extends Document {
  tenantId: Types.ObjectId;
  outletId: Types.ObjectId;
  reportDate: Date;
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  cancelledOrders: number;
  newCustomers: number;
  repeatCustomers: number;
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const analyticsDailySchema = new Schema<IAnalyticsDaily>(
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
    reportDate: {
      type: Date,
      required: [true, "Report date is required"],
    },
    totalOrders: {
      type: Number,
      default: 0,
      min: [0, "Total orders cannot be negative"],
    },
    totalRevenue: {
      type: Number,
      default: 0,
      min: [0, "Total revenue cannot be negative"],
    },
    averageOrderValue: {
      type: Number,
      default: 0,
      min: [0, "Average order value cannot be negative"],
    },
    cancelledOrders: {
      type: Number,
      default: 0,
      min: 0,
    },
    newCustomers: {
      type: Number,
      default: 0,
      min: 0,
    },
    repeatCustomers: {
      type: Number,
      default: 0,
      min: 0,
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

analyticsDailySchema.index(
  { tenantId: 1, outletId: 1, reportDate: 1 },
  { unique: true }
);
analyticsDailySchema.index({ tenantId: 1, reportDate: -1 });
analyticsDailySchema.index({ outletId: 1, reportDate: -1 });
analyticsDailySchema.index({ isDeleted: 1 });

analyticsDailySchema.pre("find", function () {
  this.where({ isDeleted: false });
});

analyticsDailySchema.pre("findOne", function () {
  this.where({ isDeleted: false });
});

const AnalyticsDaily: Model<IAnalyticsDaily> =
  mongoose.model<IAnalyticsDaily>("AnalyticsDaily", analyticsDailySchema);
export default AnalyticsDaily;
