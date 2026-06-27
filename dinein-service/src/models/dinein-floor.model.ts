import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import { SectionType } from '../constants/table-states.constants.js';

export interface IDineInFloor extends Document {
  tenantId: Types.ObjectId;
  outletId: Types.ObjectId;
  name: string;
  floorNumber: number;
  description?: string;
  isActive: boolean;
  isDeleted: boolean;
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const dineInFloorSchema = new Schema<IDineInFloor>(
  {
    tenantId:    { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    outletId:    { type: Schema.Types.ObjectId, ref: 'Outlet', required: true },
    name:        { type: String, required: true, trim: true, maxlength: 100 },
    floorNumber: { type: Number, required: true, min: 0 },
    description: { type: String, trim: true, maxlength: 300 },
    isActive:    { type: Boolean, default: true },
    isDeleted:   { type: Boolean, default: false },
    createdBy:   { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy:   { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, versionKey: false }
);

dineInFloorSchema.index({ tenantId: 1, outletId: 1, isActive: 1 });
dineInFloorSchema.index({ tenantId: 1, outletId: 1, floorNumber: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
dineInFloorSchema.index({ isDeleted: 1 });

dineInFloorSchema.pre('find', function () { this.where({ isDeleted: false }); });
dineInFloorSchema.pre('findOne', function () { this.where({ isDeleted: false }); });

const DineInFloor: Model<IDineInFloor> = mongoose.model<IDineInFloor>('DineInFloor', dineInFloorSchema);
export default DineInFloor;
