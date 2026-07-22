import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface ICheckoutSession extends Document {
  tenantId: Types.ObjectId;
  cartId: Types.ObjectId;
  orderId?: Types.ObjectId | null;
  amount: number;
  status: "PENDING" | "SUCCESS" | "FAILED" | "EXPIRED";
  paymentMethod?: string | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const checkoutSessionSchema = new Schema<ICheckoutSession>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: [true, "Tenant is required"],
    },
    cartId: {
      type: Schema.Types.ObjectId,
      ref: "Cart",
      required: [true, "Cart ref is required"],
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: 0,
    },
    status: {
      type: String,
      enum: ["PENDING", "SUCCESS", "FAILED", "EXPIRED"],
      default: "PENDING",
    },
    paymentMethod: {
      type: String,
      trim: true,
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

checkoutSessionSchema.index({ tenantId: 1 });
checkoutSessionSchema.index({ cartId: 1 });
checkoutSessionSchema.index({ orderId: 1 });
checkoutSessionSchema.index({ isDeleted: 1 });

checkoutSessionSchema.pre("find", function () {
  this.where({ isDeleted: false });
});

checkoutSessionSchema.pre("findOne", function () {
  this.where({ isDeleted: false });
});

const CheckoutSession: Model<ICheckoutSession> = mongoose.model<ICheckoutSession>(
  "CheckoutSession",
  checkoutSessionSchema
);

export default CheckoutSession;
