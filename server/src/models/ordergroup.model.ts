import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IOrderGroup extends Document {
  tenantId: Types.ObjectId;
  outletId: Types.ObjectId;
  tableId: Types.ObjectId;
  groupName?: string;
  sessionId: Types.ObjectId;
  customerIds: Types.ObjectId[];
  orderIds: Types.ObjectId[];
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const orderGroupSchema = new Schema<IOrderGroup>(
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
    tableId: {
      type: Schema.Types.ObjectId,
      ref: 'Table',
      required: [true, 'Table is required'],
    },
    groupName: {
      type: String,
      trim: true,
      maxlength: [100, 'Group name cannot exceed 100 characters'],
    },
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'QRSession',
      required: [true, 'QR Session is required'],
    },
    customerIds: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Customer' }],
      default: [],
    },
    orderIds: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Order' }],
      default: [],
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

orderGroupSchema.index({ tenantId: 1 });
orderGroupSchema.index({ outletId: 1 });
orderGroupSchema.index({ sessionId: 1 });
orderGroupSchema.index({ tableId: 1, sessionId: 1 });
orderGroupSchema.index({ isDeleted: 1 });

orderGroupSchema.pre('find', function () {
  this.where({ isDeleted: false });
});

orderGroupSchema.pre('findOne', function () {
  this.where({ isDeleted: false });
});

const OrderGroup: Model<IOrderGroup> = mongoose.model<IOrderGroup>('OrderGroup', orderGroupSchema);
export default OrderGroup;
