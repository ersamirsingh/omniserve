import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import { SessionStatus } from '../constants/table-states.constants.js';
import crypto from 'crypto';

export interface IDineInSession extends Document {
  tenantId: Types.ObjectId;
  outletId: Types.ObjectId;
  tableId: Types.ObjectId;
  sessionCode: string;
  qrToken: string;
  status: SessionStatus;
  guestCount: number;
  waiterId: Types.ObjectId | null;
  hostUserId: Types.ObjectId | null;
  activeOrderIds: Types.ObjectId[];
  billId: Types.ObjectId | null;
  notes?: string;
  openedAt: Date;
  closedAt: Date | null;
  abandonedAt: Date | null;
  durationMinutes: number | null;
  isDeleted: boolean;
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const dineInSessionSchema = new Schema<IDineInSession>(
  {
    tenantId:       { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    outletId:       { type: Schema.Types.ObjectId, ref: 'Outlet', required: true },
    tableId:        { type: Schema.Types.ObjectId, ref: 'DineInTable', required: true },
    sessionCode:    { type: String, unique: true, trim: true, uppercase: true },
    qrToken:        { type: String, unique: true, trim: true },
    status:         { type: String, enum: Object.values(SessionStatus), default: SessionStatus.ACTIVE },
    guestCount:     { type: Number, default: 0, min: 0 },
    waiterId:       { type: Schema.Types.ObjectId, ref: 'User', default: null },
    hostUserId:     { type: Schema.Types.ObjectId, ref: 'User', default: null },
    activeOrderIds: [{ type: Schema.Types.ObjectId, ref: 'DineInOrder' }],
    billId:         { type: Schema.Types.ObjectId, ref: 'DineInBill', default: null },
    notes:          { type: String, trim: true, maxlength: 500 },
    openedAt:       { type: Date, default: Date.now },
    closedAt:       { type: Date, default: null },
    abandonedAt:    { type: Date, default: null },
    durationMinutes:{ type: Number, default: null },
    isDeleted:      { type: Boolean, default: false },
    createdBy:      { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy:      { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, versionKey: false }
);

dineInSessionSchema.index({ tableId: 1, status: 1 });
dineInSessionSchema.index({ tenantId: 1, outletId: 1, status: 1 });
dineInSessionSchema.index({ tenantId: 1, outletId: 1, openedAt: -1 });
dineInSessionSchema.index({ waiterId: 1, status: 1 }, { sparse: true });
dineInSessionSchema.index({ isDeleted: 1 });

dineInSessionSchema.pre('save', function (next) {
  if (!this.sessionCode) {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
    this.sessionCode = `SES-${ts}-${rand}`;
  }
  if (!this.qrToken) {
    this.qrToken = `QR-${crypto.randomBytes(16).toString('hex').toUpperCase()}`;
  }
  next();
});

dineInSessionSchema.pre('find', function () { this.where({ isDeleted: false }); });
dineInSessionSchema.pre('findOne', function () { this.where({ isDeleted: false }); });

const DineInSession: Model<IDineInSession> = mongoose.model<IDineInSession>('DineInSession', dineInSessionSchema);
export default DineInSession;
