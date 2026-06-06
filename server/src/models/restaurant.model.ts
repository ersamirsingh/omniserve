import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import { UserStatus } from '../enums/enums.js';

export interface IRestaurant extends Document {
  tenantId: Types.ObjectId;
  name: string;
  brandName?: string;
  gstNumber?: string;
  logoUrl?: string;
  description?: string;
  status: UserStatus;
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const restaurantSchema = new Schema<IRestaurant>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: [true, 'Tenant is required'],
    },
    name: {
      type: String,
      required: [true, 'Restaurant name is required'],
      trim: true,
      maxlength: [100, 'Restaurant name cannot exceed 100 characters'],
    },
    brandName: {
      type: String,
      trim: true,
      maxlength: [100, 'Brand name cannot exceed 100 characters'],
    },
    gstNumber: {
      type: String,
      trim: true,
      uppercase: true,
      match: [
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
        'Please provide a valid GST number',
      ],
    },
    logoUrl: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    status: {
      type: String,
      enum: {
        values: Object.values(UserStatus),
        message: 'Invalid restaurant status: {VALUE}',
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

restaurantSchema.index({ tenantId: 1 });
restaurantSchema.index({ tenantId: 1, status: 1 });
restaurantSchema.index({ name: 'text', brandName: 'text' });
restaurantSchema.index({ isDeleted: 1 });

restaurantSchema.pre('find', function () {
  this.where({ isDeleted: false });
});

restaurantSchema.pre('findOne', function () {
  this.where({ isDeleted: false });
});

const Restaurant: Model<IRestaurant> = mongoose.model<IRestaurant>(
  'Restaurant',
  restaurantSchema
);
export default Restaurant;
