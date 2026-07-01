import mongoose, { Schema } from "mongoose";
const inventorySchema = new Schema({
    outletId: {
        type: Schema.Types.ObjectId,
        ref: "Outlet",
        required: [true, "Outlet is required"],
    },
    menuItemId: {
        type: Schema.Types.ObjectId,
        ref: "MenuItem",
        required: [true, "Menu item is required"],
    },
    tenantId: {
        type: Schema.Types.ObjectId,
        ref: "Tenant",
        required: [true, "Tenant is required"],
    },
    quantity: {
        type: Number,
        required: [true, "Quantity is required"],
        min: [0, "Quantity cannot be negative"],
        default: 0,
    },
    threshold: {
        type: Number,
        required: [true, "Threshold is required"],
        min: [0, "Threshold cannot be negative"],
        default: 10,
    },
    isLowStock: {
        type: Boolean,
        default: false,
    },
    isSandbox: {
        type: Boolean,
        default: false,
    },
    sandboxVersion: {
        type: String,
        default: "v1",
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
// One inventory record per menu item per outlet
inventorySchema.index({ menuItemId: 1, outletId: 1 }, { unique: true });
inventorySchema.index({ menuItemId: 1 });
inventorySchema.index({ outletId: 1 });
inventorySchema.index({ tenantId: 1 });
inventorySchema.index({ quantity: 1, threshold: 1 }); // for low-stock queries
inventorySchema.index({ isDeleted: 1 });
// Auto-flag low stock before save
inventorySchema.pre("save", async function () {
    this.isLowStock = this.quantity <= this.threshold;
});
inventorySchema.pre("find", function () {
    this.where({ isDeleted: false });
});
inventorySchema.pre("findOne", function () {
    this.where({ isDeleted: false });
});
const Inventory = mongoose.model("Inventory", inventorySchema);
export default Inventory;
