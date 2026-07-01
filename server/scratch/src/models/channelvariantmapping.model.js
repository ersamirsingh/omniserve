import mongoose, { Schema } from "mongoose";
import { IntegrationProvider } from "../types/integration.type.js";
const channelVariantMappingSchema = new Schema({
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
    variantId: {
        type: Schema.Types.ObjectId,
        ref: "Variant",
        required: [true, "Variant is required"],
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
    externalVariantId: {
        type: String,
        required: [true, "External variant ID is required"],
        trim: true,
    },
    externalVariantName: {
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
channelVariantMappingSchema.index({ tenantId: 1, outletId: 1, provider: 1, externalVariantId: 1 }, { unique: true });
channelVariantMappingSchema.index({ tenantId: 1, variantId: 1, provider: 1 });
channelVariantMappingSchema.index({ connectionId: 1 });
channelVariantMappingSchema.index({ isDeleted: 1 });
channelVariantMappingSchema.pre("find", function () {
    this.where({ isDeleted: false });
});
channelVariantMappingSchema.pre("findOne", function () {
    this.where({ isDeleted: false });
});
const ChannelVariantMapping = mongoose.model("ChannelVariantMapping", channelVariantMappingSchema);
export default ChannelVariantMapping;
