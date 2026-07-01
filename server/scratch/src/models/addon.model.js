import mongoose, { Schema } from "mongoose";
const addonSchema = new Schema({
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
    name: {
        type: String,
        required: [true, "Addon name is required"],
        trim: true,
        maxlength: [100, "Addon name cannot exceed 100 characters"],
    },
    price: {
        type: Number,
        required: [true, "Price is required"],
        min: [0, "Price cannot be negative"],
    },
    isAvailable: {
        type: Boolean,
        default: true,
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
addonSchema.index({ menuItemId: 1 });
addonSchema.index({ tenantId: 1 });
addonSchema.index({ menuItemId: 1, isAvailable: 1 });
addonSchema.index({ isDeleted: 1 });
addonSchema.pre("find", function () {
    this.where({ isDeleted: false });
});
addonSchema.pre("findOne", function () {
    this.where({ isDeleted: false });
});
const Addon = mongoose.model("Addon", addonSchema);
export default Addon;
