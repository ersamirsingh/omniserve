import mongoose, { Schema } from "mongoose";
import { IntegrationProvider } from "../types/integration.type.js";
const channelMenuItemMappingSchema = new Schema({
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
    menuItemId: {
        type: Schema.Types.ObjectId,
        ref: "MenuItem",
        required: [true, "Menu item is required"],
    },
    connectionId: {
        type: Schema.Types.ObjectId,
        ref: "ChannelConnection",
        default: null,
    },
    provider: {
        type: String,
        required: [true, "Provider is required"],
        enum: Object.values(IntegrationProvider),
        trim: true,
        uppercase: true,
    },
    externalItemId: {
        type: String,
        required: [true, "External item ID is required"],
        trim: true,
    },
    externalItemName: {
        type: String,
        trim: true,
    },
    priceOverride: {
        type: Number,
        default: null,
        min: [0, "Price override cannot be negative"],
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    metadata: {
        type: Schema.Types.Mixed,
        default: null,
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
channelMenuItemMappingSchema.index({ tenantId: 1, outletId: 1, provider: 1, externalItemId: 1 }, { unique: true });
channelMenuItemMappingSchema.index({ tenantId: 1, menuItemId: 1, provider: 1 });
channelMenuItemMappingSchema.index({ connectionId: 1 });
channelMenuItemMappingSchema.index({ isDeleted: 1 });
channelMenuItemMappingSchema.pre("find", function () {
    this.where({ isDeleted: false });
});
channelMenuItemMappingSchema.pre("findOne", function () {
    this.where({ isDeleted: false });
});
const ChannelMenuItemMapping = mongoose.model("ChannelMenuItemMapping", channelMenuItemMappingSchema);
export default ChannelMenuItemMapping;
