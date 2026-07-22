import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import crypto from 'crypto';

export type TableOperationalStatus = 'AVAILABLE' | 'HELD' | 'RESERVED' | 'OCCUPIED' | 'ORDERING' | 'DINING' | 'BILL_REQUESTED' | 'PAYMENT_PENDING' | 'CLEANING';

export interface ITable extends Document {
  tenantId: Types.ObjectId;
  outletId: Types.ObjectId;
  diningAreaId?: Types.ObjectId | null;
  tableNumber: string;
  seatCount: number;
  qrToken: string;
  status: 'ACTIVE' | 'INACTIVE';
  operationalStatus: TableOperationalStatus;
  activeSessionId?: Types.ObjectId | null;
  reservedSessionId?: Types.ObjectId | null;
  lastSessionId?: Types.ObjectId | null;
  defaultWaiterId?: Types.ObjectId | null;
  layout?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    rotation?: number;
    shape?: 'ROUND' | 'RECTANGLE' | 'SQUARE' | 'round' | 'rectangle' | 'square';
    zIndex?: number;
    labelPosition?: 'TOP' | 'BOTTOM' | 'LEFT' | 'RIGHT' | 'CENTER';
  };
  isMerged?: boolean;
  mergedWithTableIds?: Types.ObjectId[];
  metadata?: {
    floor?: string;
    notes?: string;
  };
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const tableSchema = new Schema<ITable>(
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
    diningAreaId: {
      type: Schema.Types.ObjectId,
      ref: 'DiningArea',
      default: null,
    },
    tableNumber: {
      type: String,
      required: [true, 'Table number is required'],
      trim: true,
    },
    seatCount: {
      type: Number,
      required: [true, 'Seat count is required'],
      min: [1, 'Seat count must be at least 1'],
    },
    qrToken: {
      type: String,
      unique: true,
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: ['ACTIVE', 'INACTIVE'],
        message: 'Invalid table status: {VALUE}',
      },
      default: 'ACTIVE',
    },
    operationalStatus: {
      type: String,
      enum: {
        values: ['AVAILABLE', 'HELD', 'RESERVED', 'OCCUPIED', 'ORDERING', 'DINING', 'BILL_REQUESTED', 'PAYMENT_PENDING', 'CLEANING'],
        message: 'Invalid operational status: {VALUE}',
      },
      default: 'AVAILABLE',
    },
    activeSessionId: {
      type: Schema.Types.ObjectId,
      ref: 'QRSession',
      default: null,
    },
    reservedSessionId: {
      type: Schema.Types.ObjectId,
      ref: 'Reservation',
      default: null,
    },
    lastSessionId: {
      type: Schema.Types.ObjectId,
      ref: 'QRSession',
      default: null,
    },
    defaultWaiterId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    layout: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
      width: { type: Number, default: 100 },
      height: { type: Number, default: 100 },
      rotation: { type: Number, default: 0 },
      shape: {
        type: String,
        enum: ['ROUND', 'RECTANGLE', 'SQUARE', 'round', 'rectangle', 'square'],
        default: 'SQUARE',
      },
      zIndex: { type: Number, default: 0 },
      labelPosition: {
        type: String,
        enum: ['TOP', 'BOTTOM', 'LEFT', 'RIGHT', 'CENTER'],
        default: 'CENTER',
      },
    },
    isMerged: {
      type: Boolean,
      default: false,
    },
    mergedWithTableIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Table',
      },
    ],
    metadata: {
      floor: { type: String, trim: true },
      notes: { type: String, trim: true },
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

tableSchema.index({ tenantId: 1 });
tableSchema.index({ outletId: 1 });
tableSchema.index({ tenantId: 1, outletId: 1, tableNumber: 1 });
tableSchema.index({ isDeleted: 1 });

tableSchema.pre('save', function (this: ITable, next) {
  if (!this.qrToken) {
    this.qrToken = crypto.randomBytes(16).toString('hex');
  }
  next();
});

tableSchema.pre('find', function () {
  this.where({ isDeleted: false });
});

tableSchema.pre('findOne', function () {
  this.where({ isDeleted: false });
});

const Table: Model<ITable> = mongoose.model<ITable>('Table', tableSchema);
export default Table;
