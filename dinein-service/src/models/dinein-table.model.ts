import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import { TableStatus, TableShape } from '../constants/table-states.constants.js';

export interface ITablePosition {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export interface IDineInTable extends Document {
  tenantId: Types.ObjectId;
  outletId: Types.ObjectId;
  floorId: Types.ObjectId;
  sectionId: Types.ObjectId;
  tableNumber: string;
  displayName?: string;
  capacity: number;
  minCapacity: number;
  shape: TableShape;
  status: TableStatus;
  position: ITablePosition;
  qrToken: string;
  activeSessionId: Types.ObjectId | null;
  mergedWith: Types.ObjectId[];
  isMerged: boolean;
  mergedIntoTableId: Types.ObjectId | null;
  lockedBy: Types.ObjectId | null;
  lockedAt: Date | null;
  lockedReason?: string;
  tags: string[];
  isActive: boolean;
  isDeleted: boolean;
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const tablePositionSchema = new Schema<ITablePosition>(
  {
    x:        { type: Number, default: 0 },
    y:        { type: Number, default: 0 },
    width:    { type: Number, default: 80 },
    height:   { type: Number, default: 80 },
    rotation: { type: Number, default: 0 },
  },
  { _id: false }
);

const dineInTableSchema = new Schema<IDineInTable>(
  {
    tenantId:         { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    outletId:         { type: Schema.Types.ObjectId, ref: 'Outlet', required: true },
    floorId:          { type: Schema.Types.ObjectId, ref: 'DineInFloor', required: true },
    sectionId:        { type: Schema.Types.ObjectId, ref: 'DineInSection', required: true },
    tableNumber:      { type: String, required: true, trim: true, uppercase: true },
    displayName:      { type: String, trim: true, maxlength: 50 },
    capacity:         { type: Number, required: true, min: 1, max: 100 },
    minCapacity:      { type: Number, default: 1, min: 1 },
    shape:            { type: String, enum: Object.values(TableShape), default: TableShape.SQUARE },
    status:           { type: String, enum: Object.values(TableStatus), default: TableStatus.AVAILABLE },
    position:         { type: tablePositionSchema, default: () => ({}) },
    qrToken:          { type: String, unique: true, trim: true },
    activeSessionId:  { type: Schema.Types.ObjectId, ref: 'DineInSession', default: null },
    mergedWith:       [{ type: Schema.Types.ObjectId, ref: 'DineInTable' }],
    isMerged:         { type: Boolean, default: false },
    mergedIntoTableId:{ type: Schema.Types.ObjectId, ref: 'DineInTable', default: null },
    lockedBy:         { type: Schema.Types.ObjectId, ref: 'User', default: null },
    lockedAt:         { type: Date, default: null },
    lockedReason:     { type: String, trim: true, maxlength: 200 },
    tags:             [{ type: String, trim: true }],
    isActive:         { type: Boolean, default: true },
    isDeleted:        { type: Boolean, default: false },
    createdBy:        { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy:        { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, versionKey: false }
);

// Critical indexes for 50K+ table scale
dineInTableSchema.index({ tenantId: 1, outletId: 1, status: 1 });       // Floor map queries
dineInTableSchema.index({ tenantId: 1, outletId: 1, tableNumber: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
dineInTableSchema.index({ floorId: 1, status: 1 });                     // Per-floor queries
dineInTableSchema.index({ sectionId: 1, status: 1 });                   // Per-section queries
dineInTableSchema.index({ activeSessionId: 1 }, { sparse: true });
dineInTableSchema.index({ qrToken: 1 }, { unique: true, sparse: true });
dineInTableSchema.index({ isDeleted: 1, isActive: 1 });
dineInTableSchema.index({ tenantId: 1, outletId: 1, isDeleted: 1 });

import crypto from 'crypto';
dineInTableSchema.pre('save', function (next) {
  if (!this.qrToken) {
    this.qrToken = `TBL-${crypto.randomBytes(12).toString('hex').toUpperCase()}`;
  }
  next();
});

dineInTableSchema.pre('find', function () { this.where({ isDeleted: false }); });
dineInTableSchema.pre('findOne', function () { this.where({ isDeleted: false }); });

const DineInTable: Model<IDineInTable> = mongoose.model<IDineInTable>('DineInTable', dineInTableSchema);
export default DineInTable;
