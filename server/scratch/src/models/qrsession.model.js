import mongoose, { Schema } from 'mongoose';
import crypto from 'crypto';
const qrSessionSchema = new Schema({
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
    sessionToken: {
        type: String,
        unique: true,
        trim: true,
    },
    customerId: {
        type: Schema.Types.ObjectId,
        ref: 'Customer',
        default: null,
    },
    seatNumber: {
        type: String,
        trim: true,
    },
    status: {
        type: String,
        enum: {
            values: ['ACTIVE', 'ORDERING', 'DINING', 'PAYMENT_PENDING', 'CLOSED', 'EXPIRED', 'OPEN', 'ORDERED', 'PAID'],
            message: 'Invalid session status: {VALUE}',
        },
        default: 'ACTIVE',
    },
    joinCode: {
        type: String,
        trim: true,
    },
    qrRefreshToken: {
        type: String,
        trim: true,
    },
    qrRefreshTimestamp: {
        type: Date,
        default: null,
    },
    seats: [
        {
            seatNumber: { type: String, required: true },
            customerId: { type: Schema.Types.ObjectId, ref: 'Customer', default: null },
            joinedAt: { type: Date, default: Date.now },
            deviceToken: { type: String, default: null },
        },
    ],
    waiterId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    openedAt: {
        type: Date,
        default: Date.now,
    },
    closedAt: {
        type: Date,
        default: null,
    },
    menuViewedAt: { type: Date, default: null },
    firstItemAddedAt: { type: Date, default: null },
    checkoutStartedAt: { type: Date, default: null },
    orderPlacedAt: { type: Date, default: null },
    isDeleted: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
    versionKey: false,
});
qrSessionSchema.index({ tenantId: 1 });
qrSessionSchema.index({ outletId: 1 });
qrSessionSchema.index({ tableId: 1, status: 1 });
qrSessionSchema.index({ isDeleted: 1 });
// Generate unique sessionToken pre-save if not provided
qrSessionSchema.pre('save', function (next) {
    if (!this.sessionToken) {
        this.sessionToken = 'SESS-' + crypto.randomBytes(16).toString('hex').toUpperCase();
    }
    next();
});
qrSessionSchema.pre('find', function () {
    this.where({ isDeleted: false });
});
qrSessionSchema.pre('findOne', function () {
    this.where({ isDeleted: false });
});
const QRSession = mongoose.model('QRSession', qrSessionSchema);
export default QRSession;
