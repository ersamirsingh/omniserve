import mongoose, { Schema } from "mongoose";
const orderItemSchema = new Schema({
    orderId: {
        type: Schema.Types.ObjectId,
        ref: "Order",
        required: [true, "Order is required"],
    },
    tenantId: {
        type: Schema.Types.ObjectId,
        ref: "Tenant",
        required: [true, "Tenant is required"],
    },
    menuItemId: {
        type: Schema.Types.ObjectId,
        ref: "MenuItem",
        required: [true, "Menu item is required"],
    },
    variantId: {
        type: Schema.Types.ObjectId,
        ref: "Variant",
        default: null,
    },
    addons: [
        {
            addonId: { type: Schema.Types.ObjectId, ref: "Addon" },
            name: { type: String },
            price: { type: Number },
        },
    ],
    name: {
        type: String,
        required: [true, "Item name is required"],
        trim: true,
    },
    quantity: {
        type: Number,
        required: [true, "Quantity is required"],
        min: [1, "Quantity must be at least 1"],
    },
    unitPrice: {
        type: Number,
        required: [true, "Unit price is required"],
        min: [0, "Unit price cannot be negative"],
    },
    totalPrice: {
        type: Number,
        required: [true, "Total price is required"],
        min: [0, "Total price cannot be negative"],
    },
    notes: {
        type: String,
        trim: true,
        maxlength: [255, "Notes cannot exceed 255 characters"],
    },
    course: {
        type: String,
        enum: {
            values: ['IMMEDIATE', 'STARTERS', 'MAINS', 'DESSERTS'],
            message: 'Invalid course: {VALUE}',
        },
        default: 'IMMEDIATE',
    },
    holdStatus: {
        type: String,
        enum: {
            values: ['HELD', 'FIRE_REQUESTED', 'FIRED'],
            message: 'Invalid hold status: {VALUE}',
        },
        default: 'FIRED',
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
}, {
    timestamps: true,
    versionKey: false,
});
orderItemSchema.index({ orderId: 1 });
orderItemSchema.index({ menuItemId: 1 });
orderItemSchema.index({ tenantId: 1 });
orderItemSchema.index({ isDeleted: 1 });
// Auto-calculate totalPrice before save
orderItemSchema.pre("save", async function () {
    this.totalPrice = this.quantity * this.unitPrice;
});
orderItemSchema.pre("find", function () {
    this.where({ isDeleted: false });
});
orderItemSchema.pre("findOne", function () {
    this.where({ isDeleted: false });
});
const OrderItem = mongoose.model("OrderItem", orderItemSchema);
export default OrderItem;
