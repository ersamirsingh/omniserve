import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IDineInTableMerge extends Document {
  tenantId: Types.ObjectId;
  outletId: Types.ObjectId;
  primaryTableId: Types.ObjectId;
  mergedTableIds: Types.ObjectId[];
  sessionId: Types.ObjectId;
  combinedCapacity: number;
  mergedAt: Date;
  splitAt: Date | null;
  splitBy: Types.ObjectId | null;
  mergedBy: Types.ObjectId | null;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const dineInTableMergeSchema = new Schema<IDineInTableMerge>(
  {
    tenantId:        { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    outletId:        { type: Schema.Types.ObjectId, ref: 'Outlet', required: true },
    primaryTableId:  { type: Schema.Types.ObjectId, ref: 'DineInTable', required: true },
    mergedTableIds:  [{ type: Schema.Types.ObjectId, ref: 'DineInTable' }],
    sessionId:       { type: Schema.Types.ObjectId, ref: 'DineInSession', required: true },
    combinedCapacity:{ type: Number, required: true, min: 1 },
    mergedAt:        { type: Date, default: Date.now },
    splitAt:         { type: Date, default: null },
    splitBy:         { type: Schema.Types.ObjectId, ref: 'User', default: null },
    mergedBy:        { type: Schema.Types.ObjectId, ref: 'User', default: null },
    notes:           { type: String, trim: true, maxlength: 300 },
    isActive:        { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false }
);

dineInTableMergeSchema.index({ primaryTableId: 1, isActive: 1 });
dineInTableMergeSchema.index({ sessionId: 1 });
dineInTableMergeSchema.index({ outletId: 1, isActive: 1 });

const DineInTableMerge: Model<IDineInTableMerge> = mongoose.model<IDineInTableMerge>('DineInTableMerge', dineInTableMergeSchema);
export default DineInTableMerge;
