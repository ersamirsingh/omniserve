import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import crypto from 'crypto';

export interface IQRSessionSeat {
  seatNumber: string;
  customerId?: Types.ObjectId | null;
  joinedAt: Date;
  deviceToken?: string;
}

export type QRSessionStatus = 'ACTIVE' | 'ORDERING' | 'DINING' | 'PAYMENT_PENDING' | 'CLOSED' | 'EXPIRED' | 'OPEN' | 'ORDERED' | 'PAID';

export interface IQRSession extends Document {
  tenantId: Types.ObjectId;
  outletId: Types.ObjectId;
  tableId: Types.ObjectId;
  sessionToken: string;
  customerId?: Types.ObjectId | null;
  seatNumber?: string;
  status: QRSessionStatus;
  joinCode?: string;
  qrRefreshToken?: string;
  qrRefreshTimestamp?: Date | null;
  seats: IQRSessionSeat[];
  waiterId?: Types.ObjectId | null;
  openedAt: Date;
  closedAt?: Date | null;
  menuViewedAt?: Date | null;
  firstItemAddedAt?: Date | null;
  checkoutStartedAt?: Date | null;
  orderPlacedAt?: Date | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const qrSessionSchema = new Schema<IQRSession>(
  {
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
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

qrSessionSchema.index({ tenantId: 1 });
qrSessionSchema.index({ outletId: 1 });
qrSessionSchema.index({ tableId: 1, status: 1 });
qrSessionSchema.index({ isDeleted: 1 });

// Generate unique sessionToken pre-save if not provided
qrSessionSchema.pre('save', function (this: IQRSession, next) {
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

const QRSession: Model<IQRSession> = mongoose.model<IQRSession>('QRSession', qrSessionSchema);
export default QRSession;
