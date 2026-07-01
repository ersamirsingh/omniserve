import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export type ShiftName = 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';
export type ShiftStatus = 'OPEN' | 'CLOSED';

export interface IShift extends Document {
  tenantId: Types.ObjectId;
  outletId: Types.ObjectId;
  shiftName: ShiftName;
  status: ShiftStatus;
  openedBy: Types.ObjectId;
  closedBy?: Types.ObjectId | null;
  openedAt: Date;
  closedAt?: Date | null;
  handoverNotes?: string;
  statistics: {
    totalRevenue: number;
    ordersProcessedCount: number;
    turnoverCount: number;
    avgDiningDurationMs: number;
    slaComplianceRate: number;
  };
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const shiftSchema = new Schema<IShift>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: [true, 'Tenant is required'],
    },
    outletId: {
      type: Schema.Types.ObjectId,
      ref: 'Outlet',
      required: [true, 'Outlet is required'],
    },
    shiftName: {
      type: String,
      enum: {
        values: ['MORNING', 'AFTERNOON', 'EVENING', 'NIGHT'],
        message: 'Invalid shift name: {VALUE}',
      },
      required: [true, 'Shift name is required'],
    },
    status: {
      type: String,
      enum: {
        values: ['OPEN', 'CLOSED'],
        message: 'Invalid shift status: {VALUE}',
      },
      default: 'OPEN',
    },
    openedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User opening shift is required'],
    },
    closedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    openedAt: {
      type: Date,
      default: Date.now,
    },
    closedAt: {
      type: Date,
      default: null,
    },
    handoverNotes: {
      type: String,
      default: '',
      trim: true,
    },
    statistics: {
      totalRevenue: { type: Number, default: 0 },
      ordersProcessedCount: { type: Number, default: 0 },
      turnoverCount: { type: Number, default: 0 },
      avgDiningDurationMs: { type: Number, default: 0 },
      slaComplianceRate: { type: Number, default: 100 },
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

shiftSchema.index({ tenantId: 1 });
shiftSchema.index({ outletId: 1, status: 1 });
shiftSchema.index({ isDeleted: 1 });

shiftSchema.pre('find', function () {
  this.where({ isDeleted: false });
});

shiftSchema.pre('findOne', function () {
  this.where({ isDeleted: false });
});

const Shift: Model<IShift> = mongoose.model<IShift>('Shift', shiftSchema);
export default Shift;
