import mongoose, { Schema } from "mongoose";
import { IntegrationConnectionStatus, IntegrationProvider, } from "../types/integration.type.js";
const channelConnectionSchema = new Schema({
    tenantId: {
        type: Schema.Types.ObjectId,
        ref: "Tenant",
        required: [true, "Tenant is required"],
    },
    provider: {
        type: String,
        required: [true, "Provider is required"],
        enum: Object.values(IntegrationProvider),
        trim: true,
        uppercase: true,
    },
    name: {
        type: String,
        required: [true, "Connection name is required"],
        trim: true,
        maxlength: [100, "Connection name cannot exceed 100 characters"],
    },
    status: {
        type: String,
        enum: Object.values(IntegrationConnectionStatus),
        default: IntegrationConnectionStatus.ACTIVE,
    },
    credentialsEncrypted: {
        type: String,
        default: null,
        select: false,
    },
    webhookSecretEncrypted: {
        type: String,
        default: null,
        select: false,
    },
    capabilities: {
        inboundOrders: { type: Boolean, default: true },
        statusSync: { type: Boolean, default: true },
        menuSync: { type: Boolean, default: true },
        inventorySync: { type: Boolean, default: true },
        deliverySync: { type: Boolean, default: true },
        paymentSync: { type: Boolean, default: true },
        customerSync: { type: Boolean, default: true },
        reviewSync: { type: Boolean, default: true },
    },
    settings: {
        autoAcceptOrders: { type: Boolean, default: false },
        syncMenu: { type: Boolean, default: false },
        syncInventory: { type: Boolean, default: false },
        syncOrderStatus: { type: Boolean, default: true },
        maxRetryCount: { type: Number, default: 3, min: 0 },
    },
    lastSyncAt: {
        type: Date,
        default: null,
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
channelConnectionSchema.index({ tenantId: 1, provider: 1, name: 1 }, { unique: true });
channelConnectionSchema.index({ tenantId: 1, status: 1 });
channelConnectionSchema.index({ isDeleted: 1 });
channelConnectionSchema.pre("find", function () {
    this.where({ isDeleted: false });
});
channelConnectionSchema.pre("findOne", function () {
    this.where({ isDeleted: false });
});
const ChannelConnection = mongoose.model("ChannelConnection", channelConnectionSchema);
export default ChannelConnection;
