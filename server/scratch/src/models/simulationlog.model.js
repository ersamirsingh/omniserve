import mongoose, { Schema } from "mongoose";
const simulationLogSchema = new Schema({
    tenantId: {
        type: Schema.Types.ObjectId,
        ref: "Tenant",
        required: [true, "Tenant is required"],
    },
    sessionId: {
        type: Schema.Types.ObjectId,
        ref: "SimulationSession",
        required: [true, "SimulationSession is required"],
    },
    jobId: {
        type: Schema.Types.ObjectId,
        default: null,
    },
    externalOrderId: {
        type: String,
        default: null,
    },
    eventType: {
        type: String,
        required: [true, "Event type is required"],
        enum: [
            "SESSION_STARTED",
            "PAYLOAD_GENERATED",
            "ORDER_SENT",
            "ORDER_ACCEPTED",
            "ORDER_FAILED",
            "OUTBOX_CREATED",
            "SYNCJOB_CREATED",
            "CONNECTOR_COMPLETED",
            "SESSION_COMPLETED",
        ],
    },
    details: {
        type: Schema.Types.Mixed,
        default: {},
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
    isSandbox: {
        type: Boolean,
        default: true,
    },
    sandboxVersion: {
        type: String,
        default: "v1",
    },
}, {
    timestamps: true,
    versionKey: false,
});
simulationLogSchema.index({ sessionId: 1 });
simulationLogSchema.index({ sessionId: 1, timestamp: -1 });
const SimulationLog = mongoose.model("SimulationLog", simulationLogSchema);
export default SimulationLog;
