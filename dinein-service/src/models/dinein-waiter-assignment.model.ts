import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IDineInWaiterAssignment extends Document {
  tenantId: Types.ObjectId;
  outletId: Types.ObjectId;
  tableId: Types.ObjectId;
  sessionId: Types.ObjectId;
  waiterId: Types.ObjectId;
  assignedBy: Types.ObjectId | null;
  assignedAt: Date;
  handedOffAt: Date | null;
  handedOffTo: Types.ObjectId | null;
  handOffReason?: string;
  isActive: boolean;
  tableCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const dineInWaiterAssignmentSchema = new Schema<IDineInWaiterAssignment>(
  {
    tenantId:     { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    outletId:     { type: Schema.Types.ObjectId, ref: 'Outlet', required: true },
    tableId:      { type: Schema.Types.ObjectId, ref: 'DineInTable', required: true },
    sessionId:    { type: Schema.Types.ObjectId, ref: 'DineInSession', required: true },
    waiterId:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assignedBy:   { type: Schema.Types.ObjectId, ref: 'User', default: null },
    assignedAt:   { type: Date, default: Date.now },
    handedOffAt:  { type: Date, default: null },
    handedOffTo:  { type: Schema.Types.ObjectId, ref: 'User', default: null },
    handOffReason:{ type: String, trim: true, maxlength: 300 },
    isActive:     { type: Boolean, default: true },
    tableCount:   { type: Number, default: 1 },
  },
  { timestamps: true, versionKey: false }
);

dineInWaiterAssignmentSchema.index({ waiterId: 1, isActive: 1 });
dineInWaiterAssignmentSchema.index({ tableId: 1, isActive: 1 });
dineInWaiterAssignmentSchema.index({ sessionId: 1 });
dineInWaiterAssignmentSchema.index({ outletId: 1, isActive: 1 });

const DineInWaiterAssignment: Model<IDineInWaiterAssignment> = mongoose.model<IDineInWaiterAssignment>('DineInWaiterAssignment', dineInWaiterAssignmentSchema);
export default DineInWaiterAssignment;
