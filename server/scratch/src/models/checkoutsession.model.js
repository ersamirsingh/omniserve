import mongoose, { Schema } from "mongoose";
const checkoutSessionSchema = new Schema({
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
}, {
    timestamps: true,
    versionKey: false,
});
// Indexes
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
const CheckoutSession = mongoose.model("CheckoutSession", checkoutSessionSchema);
export default CheckoutSession;
