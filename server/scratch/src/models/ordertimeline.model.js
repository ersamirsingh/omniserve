import mongoose, { Schema } from "mongoose";
const orderTimelineSchema = new Schema({
    tenantId: {
        type: Schema.Types.ObjectId,
        ref: "Tenant",
        required: [true, "Tenant is required"],
    },
    orderId: {
        type: Schema.Types.ObjectId,
        ref: "Order",
        required: false,
        default: null,
    },
    qrsessionId: {
        type: Schema.Types.ObjectId,
        ref: "QRSession",
        required: false,
        default: null,
    },
    status: {
        type: String,
        required: [true, "Status is required"],
        trim: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
    sourceSystem: {
        type: String,
        required: [true, "Source system is required"],
        trim: true,
    },
    notes: {
        type: String,
        trim: true,
    },
    isSandbox: {
        type: Boolean,
        default: false,
    },
    sandboxVersion: {
        type: String,
        default: "v1",
    },
    sessionId: {
        type: Schema.Types.ObjectId,
        ref: "SimulationSession",
        default: null,
    },
    audit: {
        triggeredByType: {
            type: String,
            enum: ['CUSTOMER', 'WAITER', 'KITCHEN', 'MANAGER', 'SYSTEM', 'PAYMENT'],
            required: false,
        },
        triggeredById: { type: Schema.Types.ObjectId, required: false },
        sourceChannel: { type: String, required: false },
        traceId: { type: String, required: false },
        correlationId: { type: String, required: false },
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
    versionKey: false,
});
// Indexes
orderTimelineSchema.index({ tenantId: 1 });
orderTimelineSchema.index({ orderId: 1, timestamp: 1 });
orderTimelineSchema.index({ isDeleted: 1 });
orderTimelineSchema.pre("find", function () {
    this.where({ isDeleted: false });
});
orderTimelineSchema.pre("findOne", function () {
    this.where({ isDeleted: false });
});
const OrderTimeline = mongoose.model("OrderTimeline", orderTimelineSchema);
export default OrderTimeline;
