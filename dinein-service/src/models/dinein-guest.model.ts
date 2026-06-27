import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import crypto from 'crypto';

export interface IDineInGuest extends Document {
  tenantId: Types.ObjectId;
  outletId: Types.ObjectId;
  sessionId: Types.ObjectId;
  tableId: Types.ObjectId;
  seatId: Types.ObjectId | null;
  guestToken: string;
  name?: string;
  phone?: string;
  customerId: Types.ObjectId | null;
  isHost: boolean;
  isAnonymous: boolean;
  socketId?: string;
  deviceInfo?: string;
  joinedAt: Date;
  leftAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const dineInGuestSchema = new Schema<IDineInGuest>(
  {
    tenantId:   { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    outletId:   { type: Schema.Types.ObjectId, ref: 'Outlet', required: true },
    sessionId:  { type: Schema.Types.ObjectId, ref: 'DineInSession', required: true },
    tableId:    { type: Schema.Types.ObjectId, ref: 'DineInTable', required: true },
    seatId:     { type: Schema.Types.ObjectId, ref: 'DineInSeat', default: null },
    guestToken: { type: String, unique: true, trim: true },
    name:       { type: String, trim: true, maxlength: 100 },
    phone:      { type: String, trim: true, maxlength: 20 },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', default: null },
    isHost:     { type: Boolean, default: false },
    isAnonymous:{ type: Boolean, default: true },
    socketId:   { type: String, trim: true },
    deviceInfo: { type: String, trim: true, maxlength: 200 },
    joinedAt:   { type: Date, default: Date.now },
    leftAt:     { type: Date, default: null },
    isActive:   { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false }
);

dineInGuestSchema.index({ sessionId: 1, isActive: 1 });
dineInGuestSchema.index({ guestToken: 1 }, { unique: true });
dineInGuestSchema.index({ customerId: 1 }, { sparse: true });

dineInGuestSchema.pre('save', function (next) {
  if (!this.guestToken) {
    this.guestToken = `GST-${crypto.randomBytes(12).toString('hex').toUpperCase()}`;
  }
  next();
});

const DineInGuest: Model<IDineInGuest> = mongoose.model<IDineInGuest>('DineInGuest', dineInGuestSchema);
export default DineInGuest;
