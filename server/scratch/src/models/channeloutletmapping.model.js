import mongoose, { Schema } from "mongoose";
import { IntegrationProvider } from "../types/integration.type.js";
const channelOutletMappingSchema = new Schema({
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
    externalMerchantId: {
        type: String,
        trim: true,
        default: null,
    },
    externalOutletId: {
        type: String,
        required: [true, "External outlet ID is required"],
        trim: true,
    },
    externalOutletName: {
        type: String,
        trim: true,
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
channelOutletMappingSchema.index({ tenantId: 1, provider: 1, externalOutletId: 1 }, { unique: true });
channelOutletMappingSchema.index({ tenantId: 1, outletId: 1, provider: 1 });
channelOutletMappingSchema.index({ connectionId: 1 });
channelOutletMappingSchema.index({ isDeleted: 1 });
channelOutletMappingSchema.pre("find", function () {
    this.where({ isDeleted: false });
});
channelOutletMappingSchema.pre("findOne", function () {
    this.where({ isDeleted: false });
});
const ChannelOutletMapping = mongoose.model("ChannelOutletMapping", channelOutletMappingSchema);
export default ChannelOutletMapping;
