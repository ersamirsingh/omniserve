import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import { ReservationStatus } from '../constants/table-states.constants.js';
import crypto from 'crypto';

export interface IDineInReservation extends Document {
  tenantId: Types.ObjectId;
  outletId: Types.ObjectId;
  tableId: Types.ObjectId | null;
  reservationCode: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerId: Types.ObjectId | null;
  partySize: number;
  reservedAt: Date;
  reservedFor: Date;
  expiresAt: Date;
  notes?: string;
  specialRequests?: string;
  status: ReservationStatus;
  confirmedAt: Date | null;
  seatedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  cancellationReason?: string;
  sessionId: Types.ObjectId | null;
  confirmedBy: Types.ObjectId | null;
  isDeleted: boolean;
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const dineInReservationSchema = new Schema<IDineInReservation>(
  {
    tenantId:           { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    outletId:           { type: Schema.Types.ObjectId, ref: 'Outlet', required: true },
    tableId:            { type: Schema.Types.ObjectId, ref: 'DineInTable', default: null },
    reservationCode:    { type: String, trim: true, uppercase: true },
    customerName:       { type: String, required: true, trim: true, maxlength: 100 },
    customerPhone:      { type: String, required: true, trim: true, maxlength: 20 },
    customerEmail:      { type: String, trim: true, lowercase: true, maxlength: 150 },
    customerId:         { type: Schema.Types.ObjectId, ref: 'Customer', default: null },
    partySize:          { type: Number, required: true, min: 1 },
    reservedAt:         { type: Date, default: Date.now },
    reservedFor:        { type: Date, required: true },
    expiresAt:          { type: Date, required: true },
    notes:              { type: String, trim: true, maxlength: 500 },
    specialRequests:    { type: String, trim: true, maxlength: 500 },
    status:             { type: String, enum: Object.values(ReservationStatus), default: ReservationStatus.PENDING },
    confirmedAt:        { type: Date, default: null },
    seatedAt:           { type: Date, default: null },
    completedAt:        { type: Date, default: null },
    cancelledAt:        { type: Date, default: null },
    cancellationReason: { type: String, trim: true, maxlength: 300 },
    sessionId:          { type: Schema.Types.ObjectId, ref: 'DineInSession', default: null },
    confirmedBy:        { type: Schema.Types.ObjectId, ref: 'User', default: null },
    isDeleted:          { type: Boolean, default: false },
    createdBy:          { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy:          { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, versionKey: false }
);

dineInReservationSchema.index({ tenantId: 1, outletId: 1, reservedFor: 1, status: 1 });
dineInReservationSchema.index({ tableId: 1, reservedFor: 1 }, { sparse: true });
dineInReservationSchema.index({ reservationCode: 1 }, { unique: true, sparse: true });
dineInReservationSchema.index({ customerId: 1 }, { sparse: true });
dineInReservationSchema.index({ expiresAt: 1, status: 1 });
dineInReservationSchema.index({ isDeleted: 1 });

dineInReservationSchema.pre('save', function (next) {
  if (!this.reservationCode) {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
    this.reservationCode = `RES-${ts}-${rand}`;
  }
  next();
});

dineInReservationSchema.pre('find', function () { this.where({ isDeleted: false }); });
dineInReservationSchema.pre('findOne', function () { this.where({ isDeleted: false }); });

const DineInReservation: Model<IDineInReservation> = mongoose.model<IDineInReservation>('DineInReservation', dineInReservationSchema);
export default DineInReservation;
