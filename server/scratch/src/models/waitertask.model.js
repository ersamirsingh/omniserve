import mongoose, { Schema } from 'mongoose';
const waiterTaskSchema = new Schema({
    tenantId: {
        type: Schema.Types.ObjectId,
        ref: 'Tenant',
        required: [true, 'Tenant is required'],
    },
    outletId: {
        type: Schema.Types.ObjectId,
        ref: 'Outlet',
        required: [true, 'Outlet is required'],
    },
    tableId: {
        type: Schema.Types.ObjectId,
        ref: 'Table',
        required: [true, 'Table is required'],
    },
    sessionId: {
        type: Schema.Types.ObjectId,
        ref: 'QRSession',
        required: [true, 'QR Session is required'],
    },
    taskType: {
        type: String,
        enum: {
            values: ['SERVE_FOOD', 'WATER', 'TISSUE', 'SPOON', 'BILL', 'CLEANING', 'CUSTOM'],
            message: 'Invalid task type: {VALUE}',
        },
        required: [true, 'Task type is required'],
    },
    status: {
        type: String,
        enum: {
            values: ['CREATED', 'ASSIGNED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ESCALATED'],
            message: 'Invalid task status: {VALUE}',
        },
        default: 'CREATED',
    },
    priority: {
        type: String,
        enum: {
            values: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
            message: 'Invalid task priority: {VALUE}',
        },
        default: 'MEDIUM',
    },
    source: {
        type: String,
        required: [true, 'Source is required'],
    },
    metadata: {
        type: Schema.Types.Mixed,
        default: {},
    },
    assignedWaiterId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    seatNumber: {
        type: String,
        default: null,
        trim: true,
    },
    associatedOrderId: {
        type: Schema.Types.ObjectId,
        ref: 'Order',
        default: null,
    },
    slaLimitMs: {
        type: Number,
        default: 300000, // 5 minutes default
    },
    assignedAt: {
        type: Date,
        default: null,
    },
    acknowledgedAt: {
        type: Date,
        default: null,
    },
    inProgressAt: {
        type: Date,
        default: null,
    },
    completedAt: {
        type: Date,
        default: null,
    },
    cancelledAt: {
        type: Date,
        default: null,
    },
    escalatedAt: {
        type: Date,
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
waiterTaskSchema.index({ tenantId: 1 });
waiterTaskSchema.index({ outletId: 1, status: 1 });
waiterTaskSchema.index({ sessionId: 1 });
waiterTaskSchema.index({ isDeleted: 1 });
waiterTaskSchema.pre('find', function () {
    this.where({ isDeleted: false });
});
waiterTaskSchema.pre('findOne', function () {
    this.where({ isDeleted: false });
});
const WaiterTask = mongoose.model('WaiterTask', waiterTaskSchema);
export default WaiterTask;
