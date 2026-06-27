import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import { QRSessionStatus } from '../constants/table-states.constants.js';
import crypto from 'crypto';

export interface IDineInQRSession extends Document {
  tenantId: Types.ObjectId;
  outletId: Types.ObjectId;
  tableId: Types.ObjectId;
  sessionId: Types.ObjectId | null;
  token: string;
  qrCodeData: string;
  qrCodeImageUrl?: string;
  status: QRSessionStatus;
  scansCount: number;
  devicesJoined: number;
  maxDevices: number;
  expiresAt: Date;
  lastScannedAt: Date | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const dineInQRSessionSchema = new Schema<IDineInQRSession>(
  {
    tenantId:       { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    outletId:       { type: Schema.Types.ObjectId, ref: 'Outlet', required: true },
    tableId:        { type: Schema.Types.ObjectId, ref: 'DineInTable', required: true },
    sessionId:      { type: Schema.Types.ObjectId, ref: 'DineInSession', default: null },
    token:          { type: String, unique: true, trim: true },
    qrCodeData:     { type: String, required: true },
    qrCodeImageUrl: { type: String, trim: true },
    status:         { type: String, enum: Object.values(QRSessionStatus), default: QRSessionStatus.ACTIVE },
    scansCount:     { type: Number, default: 0 },
    devicesJoined:  { type: Number, default: 0 },
    maxDevices:     { type: Number, default: 20 },
    expiresAt:      { type: Date, required: true },
    lastScannedAt:  { type: Date, default: null },
    isDeleted:      { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false }
);

// TTL index — MongoDB auto-deletes expired QR sessions
dineInQRSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
dineInQRSessionSchema.index({ token: 1 }, { unique: true });
dineInQRSessionSchema.index({ tableId: 1, status: 1 });
dineInQRSessionSchema.index({ sessionId: 1 }, { sparse: true });
dineInQRSessionSchema.index({ isDeleted: 1 });

dineInQRSessionSchema.pre('save', function (next) {
  if (!this.token) {
    this.token = `QRS-${crypto.randomBytes(16).toString('hex').toUpperCase()}`;
  }
  next();
});

const DineInQRSession: Model<IDineInQRSession> = mongoose.model<IDineInQRSession>('DineInQRSession', dineInQRSessionSchema);
export default DineInQRSession;
