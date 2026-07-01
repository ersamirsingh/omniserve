import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IBillSplitDetail {
  customerId?: Types.ObjectId | null;
  seatNumber?: string;
  itemId?: Types.ObjectId;
  amount: number;
  isPaid: boolean;
  paymentId?: Types.ObjectId | null;
}

export interface IBillSession extends Document {
  tenantId: Types.ObjectId;
  outletId: Types.ObjectId;
  tableId: Types.ObjectId;
  sessionId: Types.ObjectId;
  orderIds: Types.ObjectId[];
  totalAmount: number;
  subtotal: number;
  tax: number;
  discount: number;
  tip: number;
  status: 'OPEN' | 'REQUESTED' | 'PARTIAL_PAYMENT' | 'SETTLED';
  splitType: 'NONE' | 'EQUAL' | 'BY_SEAT' | 'BY_ITEM' | 'CUSTOM';
  splits: IBillSplitDetail[];
  outstandingBalance: number;
  requestedAt?: Date | null;
  settledAt?: Date | null;
  notes?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const billSessionSchema = new Schema<IBillSession>(
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
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'QRSession',
      required: [true, 'QR Session is required'],
    },
    orderIds: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Order' }],
      default: [],
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Total amount cannot be negative'],
      default: 0,
    },
    subtotal: {
      type: Number,
      default: 0,
      min: [0, 'Subtotal cannot be negative'],
    },
    tax: {
      type: Number,
      default: 0,
      min: [0, 'Tax cannot be negative'],
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, 'Discount cannot be negative'],
    },
    tip: {
      type: Number,
      default: 0,
      min: [0, 'Tip cannot be negative'],
    },
    status: {
      type: String,
      enum: {
        values: ['OPEN', 'REQUESTED', 'PARTIAL_PAYMENT', 'SETTLED'],
        message: 'Invalid bill status: {VALUE}',
      },
      default: 'OPEN',
    },
    splitType: {
      type: String,
      enum: {
        values: ['NONE', 'EQUAL', 'BY_SEAT', 'BY_ITEM', 'CUSTOM'],
        message: 'Invalid split type: {VALUE}',
      },
      default: 'NONE',
    },
    splits: [
      {
        customerId: { type: Schema.Types.ObjectId, ref: 'Customer', default: null },
        seatNumber: { type: String, default: null },
        itemId: { type: Schema.Types.ObjectId, ref: 'MenuItem', default: null },
        amount: { type: Number, required: true },
        isPaid: { type: Boolean, default: false },
        paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', default: null },
      },
    ],
    outstandingBalance: {
      type: Number,
      default: 0,
      min: [0, 'Outstanding balance cannot be negative'],
    },
    requestedAt: {
      type: Date,
      default: null,
    },
    settledAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
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

billSessionSchema.index({ tenantId: 1 });
billSessionSchema.index({ outletId: 1 });
billSessionSchema.index({ sessionId: 1 });
billSessionSchema.index({ tableId: 1, sessionId: 1 });
billSessionSchema.index({ isDeleted: 1 });

billSessionSchema.pre('find', function () {
  this.where({ isDeleted: false });
});

billSessionSchema.pre('findOne', function () {
  this.where({ isDeleted: false });
});

const BillSession: Model<IBillSession> = mongoose.model<IBillSession>('BillSession', billSessionSchema);
export default BillSession;
