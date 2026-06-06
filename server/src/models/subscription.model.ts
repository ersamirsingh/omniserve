import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import { SubscriptionPlan, UserStatus } from '../enums/enums.js';

export interface ISubscription extends Document {
  tenantId: Types.ObjectId;
  plan: SubscriptionPlan;
  amount: number;
  startDate: Date;
  endDate: Date;
  status: UserStatus;
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema<ISubscription>(
  {
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
        values: Object.values(UserStatus),
        message: 'Invalid subscription status: {VALUE}',
      },
      default: UserStatus.ACTIVE,
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
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

subscriptionSchema.index({ tenantId: 1 });
subscriptionSchema.index({ tenantId: 1, status: 1 });
subscriptionSchema.index({ endDate: 1 });
subscriptionSchema.index({ isDeleted: 1 });

subscriptionSchema.pre('find', function () {
  this.where({ isDeleted: false });
});

subscriptionSchema.pre('findOne', function () {
  this.where({ isDeleted: false });
});

const Subscription: Model<ISubscription> = mongoose.model<ISubscription>(
  'Subscription',
  subscriptionSchema
);
export default Subscription;
