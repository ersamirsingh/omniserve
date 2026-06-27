import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import { DineInPaymentMethod, DineInPaymentStatus } from '../constants/table-states.constants.js';
import crypto from 'crypto';

export interface IDineInSplitPayment extends Document {
  tenantId: Types.ObjectId;
  outletId: Types.ObjectId;
  billId: Types.ObjectId;
  sessionId: Types.ObjectId;
  guestId: Types.ObjectId | null;
  seatId: Types.ObjectId | null;
  guestName?: string;
  splitIndex: number;
  amount: number;
  method: DineInPaymentMethod;
  status: DineInPaymentStatus;
  transactionId: string;
  gatewayResponse: Record<string, unknown> | null;
  paidAt: Date | null;
  failedAt: Date | null;
  failureReason?: string;
  refundedAt: Date | null;
  refundTransactionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const dineInSplitPaymentSchema = new Schema<IDineInSplitPayment>(
  {
    tenantId:         { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    outletId:         { type: Schema.Types.ObjectId, ref: 'Outlet', required: true },
    billId:           { type: Schema.Types.ObjectId, ref: 'DineInBill', required: true },
    sessionId:        { type: Schema.Types.ObjectId, ref: 'DineInSession', required: true },
    guestId:          { type: Schema.Types.ObjectId, ref: 'DineInGuest', default: null },
    seatId:           { type: Schema.Types.ObjectId, ref: 'DineInSeat', default: null },
    guestName:        { type: String, trim: true, maxlength: 100 },
    splitIndex:       { type: Number, required: true, min: 0 },
    amount:           { type: Number, required: true, min: 0 },
    method:           { type: String, enum: Object.values(DineInPaymentMethod), required: true },
    status:           { type: String, enum: Object.values(DineInPaymentStatus), default: DineInPaymentStatus.PENDING },
    transactionId:    { type: String, trim: true },
    gatewayResponse:  { type: Schema.Types.Mixed, default: null },
    paidAt:           { type: Date, default: null },
    failedAt:         { type: Date, default: null },
    failureReason:    { type: String, trim: true, maxlength: 300 },
    refundedAt:       { type: Date, default: null },
    refundTransactionId:{ type: String, trim: true },
  },
  { timestamps: true, versionKey: false }
);

dineInSplitPaymentSchema.index({ billId: 1, status: 1 });
dineInSplitPaymentSchema.index({ sessionId: 1 });
dineInSplitPaymentSchema.index({ tenantId: 1, outletId: 1, status: 1 });
dineInSplitPaymentSchema.index({ transactionId: 1 }, { unique: true, sparse: true });
dineInSplitPaymentSchema.index({ guestId: 1 }, { sparse: true });

dineInSplitPaymentSchema.pre('save', function (next) {
  if (!this.transactionId) {
    this.transactionId = `TXN-${crypto.randomBytes(12).toString('hex').toUpperCase()}`;
  }
  next();
});

const DineInSplitPayment: Model<IDineInSplitPayment> = mongoose.model<IDineInSplitPayment>('DineInSplitPayment', dineInSplitPaymentSchema);
export default DineInSplitPayment;
