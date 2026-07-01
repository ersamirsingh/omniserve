import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IDiningArea extends Document {
  tenantId: Types.ObjectId;
  outletId: Types.ObjectId;
  name: string;
  description?: string;
  displayOrder?: number;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const diningAreaSchema = new Schema<IDiningArea>(
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
    name: {
      type: String,
      required: [true, 'Dining area name is required'],
      trim: true,
      maxlength: [100, 'Dining area name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [255, 'Description cannot exceed 255 characters'],
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
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

diningAreaSchema.index({ tenantId: 1 });
diningAreaSchema.index({ outletId: 1 });
diningAreaSchema.index({ tenantId: 1, outletId: 1, isActive: 1 });
diningAreaSchema.index({ isDeleted: 1 });

diningAreaSchema.pre('find', function () {
  this.where({ isDeleted: false });
});

diningAreaSchema.pre('findOne', function () {
  this.where({ isDeleted: false });
});

const DiningArea: Model<IDiningArea> = mongoose.model<IDiningArea>('DiningArea', diningAreaSchema);
export default DiningArea;
