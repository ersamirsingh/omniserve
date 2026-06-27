import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import { SectionType } from '../constants/table-states.constants.js';

export interface IDineInSection extends Document {
  tenantId: Types.ObjectId;
  outletId: Types.ObjectId;
  floorId: Types.ObjectId;
  name: string;
  type: SectionType;
  description?: string;
  capacity?: number;
  displayOrder: number;
  isActive: boolean;
  isDeleted: boolean;
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const dineInSectionSchema = new Schema<IDineInSection>(
  {
    tenantId:     { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    outletId:     { type: Schema.Types.ObjectId, ref: 'Outlet', required: true },
    floorId:      { type: Schema.Types.ObjectId, ref: 'DineInFloor', required: true },
    name:         { type: String, required: true, trim: true, maxlength: 100 },
    type:         { type: String, enum: Object.values(SectionType), default: SectionType.INDOOR },
    description:  { type: String, trim: true, maxlength: 300 },
    capacity:     { type: Number, min: 0 },
    displayOrder: { type: Number, default: 0 },
    isActive:     { type: Boolean, default: true },
    isDeleted:    { type: Boolean, default: false },
    createdBy:    { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy:    { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, versionKey: false }
);

dineInSectionSchema.index({ tenantId: 1, outletId: 1, isActive: 1 });
dineInSectionSchema.index({ floorId: 1, isActive: 1 });
dineInSectionSchema.index({ isDeleted: 1 });

dineInSectionSchema.pre('find', function () { this.where({ isDeleted: false }); });
dineInSectionSchema.pre('findOne', function () { this.where({ isDeleted: false }); });

const DineInSection: Model<IDineInSection> = mongoose.model<IDineInSection>('DineInSection', dineInSectionSchema);
export default DineInSection;
