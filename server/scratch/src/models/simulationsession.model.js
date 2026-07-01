import mongoose, { Schema } from "mongoose";
const simulationJobSchema = new Schema({
    status: {
        type: String,
        enum: ["PENDING", "RUNNING", "COMPLETED", "FAILED", "CANCELLED"],
        default: "PENDING",
    },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    processedOrders: { type: Number, default: 0 },
    failedOrders: { type: Number, default: 0 },
    currentIteration: { type: Number, default: 0 },
    totalIterations: { type: Number, default: 1 },
});
const simulationSessionSchema = new Schema({
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
        trim: true,
    },
    status: {
        type: String,
        enum: ["RUNNING", "COMPLETED", "FAILED", "CANCELLED"],
        default: "RUNNING",
    },
    startedAt: { type: Date, default: Date.now },
    finishedAt: { type: Date, default: null },
    totalOrders: { type: Number, default: 0 },
    successCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    mappingFailures: { type: Number, default: 0 },
    validationFailures: { type: Number, default: 0 },
    averageLatency: { type: Number, default: 0 },
    jobs: [simulationJobSchema],
    isSandbox: { type: Boolean, default: true },
    sandboxVersion: { type: String, default: "v1" },
}, {
    timestamps: true,
    versionKey: false,
});
const SimulationSession = mongoose.model("SimulationSession", simulationSessionSchema);
export default SimulationSession;
