import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import { SubscriptionPlan, UserStatus } from '../enums/enums.js';

export interface ITenant extends Document {
  name: string;
  slug: string;
  ownerId: Types.ObjectId;
  subscriptionPlan: SubscriptionPlan;
  status: UserStatus;
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const tenantSchema = new Schema<ITenant>(
  {
    name: {
      type: String,
      required: [true, 'Tenant name is required'],
      trim: true,
      maxlength: [100, 'Tenant name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      lowercase: true,
      trim: true,
      match: [
        /^[a-z0-9-]+$/,
        'Slug can only contain lowercase letters, numbers, and hyphens',
      ],
      maxlength: [100, 'Slug cannot exceed 100 characters'],
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner is required'],
    },
    subscriptionPlan: {
      type: String,
      enum: {
        values: Object.values(SubscriptionPlan),
        message: 'Invalid subscription plan: {VALUE}',
      },
      default: SubscriptionPlan.FREE,
    },
    status: {
      type: String,
      enum: {
        values: Object.values(UserStatus),
        message: 'Invalid tenant status: {VALUE}',
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

tenantSchema.index({ slug: 1 }, { unique: true });
tenantSchema.index({ ownerId: 1 });
tenantSchema.index({ status: 1 });
tenantSchema.index({ isDeleted: 1 });

tenantSchema.pre('find', function () {
  this.where({ isDeleted: false });
});

tenantSchema.pre('findOne', function () {
  this.where({ isDeleted: false });
});

const Tenant: Model<ITenant> = mongoose.model<ITenant>('Tenant', tenantSchema);
export default Tenant;
