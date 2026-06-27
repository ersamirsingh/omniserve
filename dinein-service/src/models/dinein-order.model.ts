import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import { DineInOrderStatus } from '../constants/table-states.constants.js';
import crypto from 'crypto';

export interface IOrderTaxBreakdown {
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

export interface IDineInOrder extends Document {
  tenantId: Types.ObjectId;
  outletId: Types.ObjectId;
  sessionId: Types.ObjectId;
  tableId: Types.ObjectId;
  sectionId: Types.ObjectId;
  orderNumber: string;
  guestId: Types.ObjectId | null;
  waiterId: Types.ObjectId | null;
  status: DineInOrderStatus;
  subtotal: number;
  taxBreakdown: IOrderTaxBreakdown;
  tax: number;
  discount: number;
  serviceCharge: number;
  tip: number;
  totalAmount: number;
  notes?: string;
  kotNumber?: string;
  placedAt: Date | null;
  confirmedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  cancellationReason?: string;
  isDeleted: boolean;
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const taxBreakdownSchema = new Schema<IOrderTaxBreakdown>(
  {
    cgst:  { type: Number, default: 0 },
    sgst:  { type: Number, default: 0 },
    igst:  { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  { _id: false }
);

const dineInOrderSchema = new Schema<IDineInOrder>(
  {
    tenantId:          { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    outletId:          { type: Schema.Types.ObjectId, ref: 'Outlet', required: true },
    sessionId:         { type: Schema.Types.ObjectId, ref: 'DineInSession', required: true },
    tableId:           { type: Schema.Types.ObjectId, ref: 'DineInTable', required: true },
    sectionId:         { type: Schema.Types.ObjectId, ref: 'DineInSection', required: true },
    orderNumber:       { type: String, trim: true, uppercase: true },
    guestId:           { type: Schema.Types.ObjectId, ref: 'DineInGuest', default: null },
    waiterId:          { type: Schema.Types.ObjectId, ref: 'User', default: null },
    status:            { type: String, enum: Object.values(DineInOrderStatus), default: DineInOrderStatus.DRAFT },
    subtotal:          { type: Number, required: true, min: 0, default: 0 },
    taxBreakdown:      { type: taxBreakdownSchema, default: () => ({}) },
    tax:               { type: Number, default: 0, min: 0 },
    discount:          { type: Number, default: 0, min: 0 },
    serviceCharge:     { type: Number, default: 0, min: 0 },
    tip:               { type: Number, default: 0, min: 0 },
    totalAmount:       { type: Number, default: 0, min: 0 },
    notes:             { type: String, trim: true, maxlength: 500 },
    kotNumber:         { type: String, trim: true },
    placedAt:          { type: Date, default: null },
    confirmedAt:       { type: Date, default: null },
    completedAt:       { type: Date, default: null },
    cancelledAt:       { type: Date, default: null },
    cancellationReason:{ type: String, trim: true, maxlength: 300 },
    isDeleted:         { type: Boolean, default: false },
    createdBy:         { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy:         { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, versionKey: false }
);

// Optimized indexes for millions of orders
dineInOrderSchema.index({ sessionId: 1, status: 1 });
dineInOrderSchema.index({ tenantId: 1, outletId: 1, status: 1 });
dineInOrderSchema.index({ tenantId: 1, createdAt: -1 });
dineInOrderSchema.index({ tableId: 1, status: 1 });
dineInOrderSchema.index({ orderNumber: 1 }, { unique: true, sparse: true });
dineInOrderSchema.index({ waiterId: 1, status: 1 }, { sparse: true });
dineInOrderSchema.index({ isDeleted: 1 });

dineInOrderSchema.pre('save', function (next) {
  if (!this.orderNumber) {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
    this.orderNumber = `DIN-${ts}-${rand}`;
  }
  next();
});

dineInOrderSchema.pre('find', function () { this.where({ isDeleted: false }); });
dineInOrderSchema.pre('findOne', function () { this.where({ isDeleted: false }); });

const DineInOrder: Model<IDineInOrder> = mongoose.model<IDineInOrder>('DineInOrder', dineInOrderSchema);
export default DineInOrder;
