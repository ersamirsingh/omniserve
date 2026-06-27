import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import { SeatStatus } from '../constants/table-states.constants.js';

export interface IDineInSeat extends Document {
  tenantId: Types.ObjectId;
  outletId: Types.ObjectId;
  tableId: Types.ObjectId;
  sessionId: Types.ObjectId | null;
  seatNumber: string;
  status: SeatStatus;
  guestId: Types.ObjectId | null;
  guestName?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const dineInSeatSchema = new Schema<IDineInSeat>(
  {
    tenantId:   { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    outletId:   { type: Schema.Types.ObjectId, ref: 'Outlet', required: true },
    tableId:    { type: Schema.Types.ObjectId, ref: 'DineInTable', required: true },
    sessionId:  { type: Schema.Types.ObjectId, ref: 'DineInSession', default: null },
    seatNumber: { type: String, required: true, trim: true },
    status:     { type: String, enum: Object.values(SeatStatus), default: SeatStatus.EMPTY },
    guestId:    { type: Schema.Types.ObjectId, ref: 'DineInGuest', default: null },
    guestName:  { type: String, trim: true, maxlength: 100 },
    isActive:   { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false }
);

dineInSeatSchema.index({ tableId: 1, sessionId: 1 });
dineInSeatSchema.index({ tableId: 1, seatNumber: 1 }, { unique: true });
dineInSeatSchema.index({ guestId: 1 }, { sparse: true });

const DineInSeat: Model<IDineInSeat> = mongoose.model<IDineInSeat>('DineInSeat', dineInSeatSchema);
export default DineInSeat;
