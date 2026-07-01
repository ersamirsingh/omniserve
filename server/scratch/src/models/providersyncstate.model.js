import mongoose, { Schema } from "mongoose";
import { IntegrationProvider } from "../types/integration.type.js";
const providerSyncStateSchema = new Schema({
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
    provider: {
        type: String,
        required: [true, "Provider is required"],
        enum: Object.values(IntegrationProvider),
        trim: true,
        uppercase: true,
    },
    lastMenuSyncAt: {
        type: Date,
        default: null,
    },
    lastInventorySyncAt: {
        type: Date,
        default: null,
    },
    lastStatusSyncAt: {
        type: Date,
        default: null,
    },
    lastSuccessAt: {
        type: Date,
        default: null,
    },
    lastFailureAt: {
        type: Date,
        default: null,
    },
    syncHealth: {
        type: String,
        enum: ["HEALTHY", "DEGRADED", "FAILED"],
        default: "HEALTHY",
    },
    failureCount: {
        type: Number,
        default: 0,
    },
    consecutiveFailures: {
        type: Number,
        default: 0,
    },
    circuitOpenUntil: {
        type: Date,
        default: null,
    },
}, {
    timestamps: true,
    versionKey: false,
});
// Indexes
providerSyncStateSchema.index({ tenantId: 1, outletId: 1, provider: 1 }, { unique: true });
const ProviderSyncState = mongoose.model("ProviderSyncState", providerSyncStateSchema);
export default ProviderSyncState;
