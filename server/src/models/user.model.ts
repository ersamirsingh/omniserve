import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import { UserRole, UserStatus } from '../enums/enums.js';

export interface IUser extends Document {
  tenantId: Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  lastLogin: Date | null;
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  // virtuals
  fullName: string;
}

const userSchema = new Schema<IUser>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: [true, 'Tenant is required'],
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    phone: {
      type: String,
      trim: true,
      match: [/^\+?[\d\s\-().]{7,20}$/, 'Please provide a valid phone number'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
      select: false,
    },
    role: {
      type: String,
      enum: {
        values: Object.values(UserRole),
        message: 'Invalid user role: {VALUE}',
      },
      required: [true, 'Role is required'],
    },
    status: {
      type: String,
      enum: {
        values: Object.values(UserStatus),
        message: 'Invalid user status: {VALUE}',
      },
      default: UserStatus.ACTIVE,
    },
    lastLogin: {
      type: Date,
      default: null,
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

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ tenantId: 1 });
userSchema.index({ tenantId: 1, role: 1 });
userSchema.index({ tenantId: 1, status: 1 });
userSchema.index({ isDeleted: 1 });

userSchema.virtual('fullName').get(function (this: IUser) {
  return `${this.firstName} ${this.lastName}`;
});

userSchema.pre('find', function () {
  this.where({ isDeleted: false });
});

userSchema.pre('findOne', function () {
  this.where({ isDeleted: false });
});

const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);
export default User;
