import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import { AssistanceType } from '../constants/table-states.constants.js';

export enum AssistanceStatus {
  PENDING    = 'PENDING',
  SEEN       = 'SEEN',
  IN_PROGRESS= 'IN_PROGRESS',
  RESOLVED   = 'RESOLVED',
  CANCELLED  = 'CANCELLED',
}

export interface IDineInAssistanceRequest extends Document {
  tenantId: Types.ObjectId;
  outletId: Types.ObjectId;
  sessionId: Types.ObjectId;
  tableId: Types.ObjectId;
  guestId: Types.ObjectId | null;
  seatId: Types.ObjectId | null;
  type: AssistanceType;
  customMessage?: string;
  status: AssistanceStatus;
  assignedWaiterId: Types.ObjectId | null;
  resolvedBy: Types.ObjectId | null;
  resolvedAt: Date | null;
  responseTimeSeconds: number | null;
  createdAt: Date;
  updatedAt: Date;
}

const dineInAssistanceSchema = new Schema<IDineInAssistanceRequest>(
  {
    tenantId:           { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    outletId:           { type: Schema.Types.ObjectId, ref: 'Outlet', required: true },
    sessionId:          { type: Schema.Types.ObjectId, ref: 'DineInSession', required: true },
    tableId:            { type: Schema.Types.ObjectId, ref: 'DineInTable', required: true },
    guestId:            { type: Schema.Types.ObjectId, ref: 'DineInGuest', default: null },
    seatId:             { type: Schema.Types.ObjectId, ref: 'DineInSeat', default: null },
    type:               { type: String, enum: Object.values(AssistanceType), required: true },
    customMessage:      { type: String, trim: true, maxlength: 300 },
    status:             { type: String, enum: Object.values(AssistanceStatus), default: AssistanceStatus.PENDING },
    assignedWaiterId:   { type: Schema.Types.ObjectId, ref: 'User', default: null },
    resolvedBy:         { type: Schema.Types.ObjectId, ref: 'User', default: null },
    resolvedAt:         { type: Date, default: null },
    responseTimeSeconds:{ type: Number, default: null },
  },
  { timestamps: true, versionKey: false }
);

dineInAssistanceSchema.index({ tenantId: 1, outletId: 1, status: 1 });
dineInAssistanceSchema.index({ sessionId: 1, status: 1 });
dineInAssistanceSchema.index({ tableId: 1, status: 1 });
dineInAssistanceSchema.index({ assignedWaiterId: 1, status: 1 }, { sparse: true });
dineInAssistanceSchema.index({ createdAt: -1 });

const DineInAssistanceRequest: Model<IDineInAssistanceRequest> = mongoose.model<IDineInAssistanceRequest>('DineInAssistanceRequest', dineInAssistanceSchema);
export default DineInAssistanceRequest;
