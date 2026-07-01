import mongoose, { Schema } from 'mongoose';
import { SubscriptionPlan, SubscriptionStatus } from '../enums/enums.js';
const subscriptionSchema = new Schema({
    tenantId: {
        type: Schema.Types.ObjectId,
        ref: 'Tenant',
        required: [true, 'Tenant is required'],
    },
    plan: {
        type: String,
        enum: {
            values: Object.values(SubscriptionPlan),
            message: 'Invalid subscription plan: {VALUE}',
        },
        required: [true, 'Plan is required'],
    },
    amount: {
        type: Number,
        required: [true, 'Amount is required'],
        min: [0, 'Amount cannot be negative'],
    },
    startDate: {
        type: Date,
        required: [true, 'Start date is required'],
    },
    endDate: {
        type: Date,
        required: [true, 'End date is required'],
    },
    status: {
        type: String,
        enum: {
            values: Object.values(SubscriptionStatus),
            message: 'Invalid subscription status: {VALUE}',
        },
        default: SubscriptionStatus.ACTIVE,
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    updatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
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
subscriptionSchema.index({ tenantId: 1 });
subscriptionSchema.index({ tenantId: 1, status: 1 }, {
    unique: true,
    partialFilterExpression: { status: 'ACTIVE', isDeleted: false },
});
subscriptionSchema.index({ endDate: 1 });
subscriptionSchema.index({ isDeleted: 1 });
subscriptionSchema.pre('find', function () {
    this.where({ isDeleted: false });
});
subscriptionSchema.pre('findOne', function () {
    this.where({ isDeleted: false });
});
const Subscription = mongoose.model('Subscription', subscriptionSchema);
export default Subscription;
