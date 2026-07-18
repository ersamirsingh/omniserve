import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface ICoupon extends Document {
  tenantId?: Types.ObjectId | null;
  outletId?: Types.ObjectId | null;
  code: string;
  discountType: "PERCENTAGE" | "FLAT";
  discountValue: number;
  minAmount: number;
  maxDiscountAmount?: number | null;
  expirationDate?: Date | null;
  isActive: boolean;
  status: "ACTIVE" | "HELD" | "EXPIRED";
  isRedeemed?: boolean;
  redeemedTenants?: Types.ObjectId[];
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const couponSchema = new Schema<ICoupon>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      default: null,
    },
    outletId: {
      type: Schema.Types.ObjectId,
      ref: "Outlet",
      default: null,
    },
    code: {
      type: String,
      required: [true, "Coupon code is required"],
      trim: true,
      uppercase: true,
      maxlength: [50, "Coupon code cannot exceed 50 characters"],
    },
    discountType: {
      type: String,
      enum: {
        values: ["PERCENTAGE", "FLAT"],
        message: "Invalid discount type: {VALUE}",
      },
      required: [true, "Discount type is required"],
    },
    discountValue: {
      type: Number,
      required: [true, "Discount value is required"],
      min: [0, "Discount value cannot be negative"],
    },
    minAmount: {
      type: Number,
      default: 0,
      min: [0, "Minimum amount cannot be negative"],
    },
    maxDiscountAmount: {
      type: Number,
      default: null,
      min: [0, "Maximum discount amount cannot be negative"],
    },
    expirationDate: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "HELD", "EXPIRED"],
      default: "ACTIVE",
    },
    isRedeemed: {
      type: Boolean,
      default: false,
    },
    redeemedTenants: {
      type: [Schema.Types.ObjectId],
      ref: "Tenant",
      default: [],
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

couponSchema.index({ tenantId: 1, code: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
couponSchema.index({ isDeleted: 1 });

couponSchema.pre("find", function () {
  this.where({ isDeleted: false });
});

couponSchema.pre("findOne", function () {
  this.where({ isDeleted: false });
});

const Coupon: Model<ICoupon> = mongoose.model<ICoupon>("Coupon", couponSchema);
export default Coupon;
