import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import { SplitType, DineInPaymentStatus } from '../constants/table-states.constants.js';
import crypto from 'crypto';

export interface IBillLineItem {
  orderItemId: Types.ObjectId;
  menuItemId: Types.ObjectId;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface IDineInBill extends Document {
  tenantId: Types.ObjectId;
  outletId: Types.ObjectId;
  sessionId: Types.ObjectId;
  tableId: Types.ObjectId;
  invoiceNumber: string;
  lineItems: IBillLineItem[];
  subtotal: number;
  tax: number;
  cgst: number;
  sgst: number;
  igst: number;
  serviceCharge: number;
  serviceChargeRate: number;
  discount: number;
  couponCode?: string;
  couponDiscount: number;
  tip: number;
  roundOff: number;
  totalAmount: number;
  splitType: SplitType;
  splitCount: number;
  paymentStatus: DineInPaymentStatus;
  paidAmount: number;
  pendingAmount: number;
  printCount: number;
  requestedAt: Date;
  paidAt: Date | null;
  notes?: string;
  generatedBy: Types.ObjectId | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const billLineItemSchema = new Schema<IBillLineItem>(
  {
    orderItemId: { type: Schema.Types.ObjectId, required: true },
    menuItemId:  { type: Schema.Types.ObjectId, required: true },
    name:        { type: String, required: true, trim: true },
    quantity:    { type: Number, required: true, min: 1 },
    unitPrice:   { type: Number, required: true, min: 0 },
    totalPrice:  { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const dineInBillSchema = new Schema<IDineInBill>(
  {
    tenantId:          { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    outletId:          { type: Schema.Types.ObjectId, ref: 'Outlet', required: true },
    sessionId:         { type: Schema.Types.ObjectId, ref: 'DineInSession', required: true },
    tableId:           { type: Schema.Types.ObjectId, ref: 'DineInTable', required: true },
    invoiceNumber:     { type: String, trim: true, uppercase: true },
    lineItems:         [billLineItemSchema],
    subtotal:          { type: Number, required: true, min: 0 },
    tax:               { type: Number, default: 0, min: 0 },
    cgst:              { type: Number, default: 0, min: 0 },
    sgst:              { type: Number, default: 0, min: 0 },
    igst:              { type: Number, default: 0, min: 0 },
    serviceCharge:     { type: Number, default: 0, min: 0 },
    serviceChargeRate: { type: Number, default: 5, min: 0 },
    discount:          { type: Number, default: 0, min: 0 },
    couponCode:        { type: String, trim: true, uppercase: true },
    couponDiscount:    { type: Number, default: 0, min: 0 },
    tip:               { type: Number, default: 0, min: 0 },
    roundOff:          { type: Number, default: 0 },
    totalAmount:       { type: Number, required: true, min: 0 },
    splitType:         { type: String, enum: Object.values(SplitType), default: SplitType.NO_SPLIT },
    splitCount:        { type: Number, default: 1, min: 1 },
    paymentStatus:     { type: String, enum: Object.values(DineInPaymentStatus), default: DineInPaymentStatus.PENDING },
    paidAmount:        { type: Number, default: 0, min: 0 },
    pendingAmount:     { type: Number, default: 0 },
    printCount:        { type: Number, default: 0 },
    requestedAt:       { type: Date, default: Date.now },
    paidAt:            { type: Date, default: null },
    notes:             { type: String, trim: true, maxlength: 500 },
    generatedBy:       { type: Schema.Types.ObjectId, ref: 'User', default: null },
    isDeleted:         { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false }
);

dineInBillSchema.index({ sessionId: 1 });
dineInBillSchema.index({ tenantId: 1, outletId: 1, paymentStatus: 1 });
dineInBillSchema.index({ tenantId: 1, createdAt: -1 });
dineInBillSchema.index({ invoiceNumber: 1 }, { unique: true, sparse: true });

dineInBillSchema.pre('save', function (next) {
  if (!this.invoiceNumber) {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
    this.invoiceNumber = `INV-${ts}-${rand}`;
  }
  next();
});

dineInBillSchema.pre('find', function () { this.where({ isDeleted: false }); });
dineInBillSchema.pre('findOne', function () { this.where({ isDeleted: false }); });

const DineInBill: Model<IDineInBill> = mongoose.model<IDineInBill>('DineInBill', dineInBillSchema);
export default DineInBill;
