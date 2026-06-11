import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import { UserStatus, WeekDay } from '../enums/enums.js';

export interface IOperatingHours {
  day: WeekDay;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

export interface IOutlet extends Document {
  restaurantId: Types.ObjectId;
  tenantId: Types.ObjectId;
  name: string;
  phone?: string;
  email?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  operatingHours: IOperatingHours[];
  status: UserStatus;
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const operatingHoursSchema = new Schema<IOperatingHours>(
  {
    day: {
      type: String,
      required: true,
      enum: Object.values(WeekDay),
    },
    openTime: {
      type: String,
      required: true,
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:MM format'],
    },
    closeTime: {
      type: String,
      required: true,
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:MM format'],
    },
    isClosed: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const outletSchema = new Schema<IOutlet>(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: [true, 'Restaurant is required'],
    },
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: [true, 'Tenant is required'],
    },
    name: {
      type: String,
      required: [true, 'Outlet name is required'],
      trim: true,
      maxlength: [100, 'Outlet name cannot exceed 100 characters'],
    },
    phone: {
      type: String,
      trim: true,
      match: [/^\+?[\d\s\-().]{7,20}$/, 'Please provide a valid phone number'],
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
    },
    pincode: {
      type: String,
      required: [true, 'Pincode is required'],
      trim: true,
      match: [/^\d{6}$/, 'Please provide a valid 6-digit pincode'],
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
        validate: {
          validator: (v: number[]) => {
            if (!v || v.length !== 2) return false;
            const lng = v[0];
            const lat = v[1];
            return (
              lng !== undefined &&
              lat !== undefined &&
              lng >= -180 &&
              lng <= 180 &&
              lat >= -90 &&
              lat <= 90
            );
          },
          message:
            'Coordinates must be [longitude, latitude] within valid ranges',
        },
      },
    },
    operatingHours: {
      type: [operatingHoursSchema],
      default: [],
    },
    status: {
      type: String,
      enum: {
        values: Object.values(UserStatus),
        message: 'Invalid outlet status: {VALUE}',
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

outletSchema.index({ location: '2dsphere' });
outletSchema.index({ tenantId: 1 });
outletSchema.index({ restaurantId: 1 });
outletSchema.index({ tenantId: 1, status: 1 });
outletSchema.index({ city: 1, state: 1 });
outletSchema.index({ isDeleted: 1 });

outletSchema.pre('find', function () {
  this.where({ isDeleted: false });
});

outletSchema.pre('findOne', function () {
  this.where({ isDeleted: false });
});

const Outlet: Model<IOutlet> = mongoose.model<IOutlet>('Outlet', outletSchema);
export default Outlet;
