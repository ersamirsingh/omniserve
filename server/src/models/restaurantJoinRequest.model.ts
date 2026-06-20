import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import { RestaurantJoinRequestStatus, UserRole } from '../enums/enums.js';

export interface IJoinRequestMessage {
  senderId: Types.ObjectId | null;
  senderEmail?: string;
  message: string;
  createdAt: Date;
}

export interface IRestaurantJoinRequest extends Document {
  tenantId: Types.ObjectId;
  restaurantId: Types.ObjectId;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  requestedRole: UserRole;
  status: RestaurantJoinRequestStatus;
  inviteTokenHash: string;
  inviteLink: string;
  linkSentAt: Date | null;
  expiresAt: Date;
  messages: IJoinRequestMessage[];
  requestedBy: Types.ObjectId;
  acceptedBy: Types.ObjectId | null;
  decidedBy: Types.ObjectId | null;
  decidedAt: Date | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const joinRequestMessageSchema = new Schema<IJoinRequestMessage>(
  {
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    senderEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const restaurantJoinRequestSchema = new Schema<IRestaurantJoinRequest>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: [true, 'Tenant is required'],
    },
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: [true, 'Restaurant is required'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    firstName: {
      type: String,
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters'],
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters'],
    },
    phone: {
      type: String,
      trim: true,
      match: [/^\+?[\d\s\-().]{7,20}$/, 'Please provide a valid phone number'],
    },
    requestedRole: {
      type: String,
      enum: {
        values: Object.values(UserRole),
        message: 'Invalid user role: {VALUE}',
      },
      required: [true, 'Requested role is required'],
    },
    status: {
      type: String,
      enum: {
        values: Object.values(RestaurantJoinRequestStatus),
        message: 'Invalid join request status: {VALUE}',
      },
      default: RestaurantJoinRequestStatus.PENDING,
    },
    inviteTokenHash: {
      type: String,
      required: [true, 'Invite token hash is required'],
      select: false,
    },
    inviteLink: {
      type: String,
      required: [true, 'Invite link is required'],
      trim: true,
    },
    linkSentAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiry date is required'],
    },
    messages: {
      type: [joinRequestMessageSchema],
      default: [],
    },
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Requester is required'],
    },
    acceptedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    decidedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    decidedAt: {
      type: Date,
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

restaurantJoinRequestSchema.index({ tenantId: 1, restaurantId: 1, status: 1 });
restaurantJoinRequestSchema.index(
  { tenantId: 1, restaurantId: 1, email: 1, requestedRole: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: RestaurantJoinRequestStatus.PENDING, isDeleted: false } }
);
restaurantJoinRequestSchema.index(
  { tenantId: 1, restaurantId: 1, requestedRole: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: {
      requestedRole: UserRole.RESTAURANT_OWNER,
      status: RestaurantJoinRequestStatus.PENDING,
      isDeleted: false,
    },
  }
);
restaurantJoinRequestSchema.index({ expiresAt: 1 });
restaurantJoinRequestSchema.index({ isDeleted: 1 });

restaurantJoinRequestSchema.pre('find', function () {
  this.where({ isDeleted: false });
});

restaurantJoinRequestSchema.pre('findOne', function () {
  this.where({ isDeleted: false });
});

const RestaurantJoinRequest: Model<IRestaurantJoinRequest> = mongoose.model<IRestaurantJoinRequest>(
  'RestaurantJoinRequest',
  restaurantJoinRequestSchema
);

export default RestaurantJoinRequest;
