import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import { OrderSource, OrderStatus, PaymentStatus } from '../enums/enums.js';

export interface IDiningContext {
  tableId?: Types.ObjectId | null;
  tableNumber?: string | null;
  seatNumber?: string | null;
  sessionId?: Types.ObjectId | null;
}

export interface IOrder extends Document {
  tenantId: Types.ObjectId;
  outletId: Types.ObjectId;
  customerId: Types.ObjectId;
  orderNumber: string;
  source: OrderSource;
  subtotal: number;
  tax: number;
  deliveryFee: number;
  discount: number;
  totalAmount: number;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  acceptedAt: Date | null;
  preparedAt: Date | null;
  readyAt: Date | null;
  pickedUpAt: Date | null;
  deliveredAt: Date | null;
  cancelledAt: Date | null;
  cancellationReason?: string;
  notes?: string;
  waiterId?: Types.ObjectId | null;
  kitchenPriority?: 'NEW' | 'RUSH' | 'DELAYED' | 'CRITICAL' | 'VIP' | 'LARGE_PARTY' | 'HIGH_VALUE';
  diningContext?: IDiningContext | null;
  isSandbox?: boolean;
  sandboxVersion?: string;
  sessionId?: Types.ObjectId | null;
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<IOrder>(
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
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer is required'],
    },
    orderNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },
    source: {
      type: String,
      enum: {
        values: Object.values(OrderSource),
        message: 'Invalid order source: {VALUE}',
      },
      required: [true, 'Order source is required'],
    },
    subtotal: {
      type: Number,
      required: [true, 'Subtotal is required'],
      min: [0, 'Subtotal cannot be negative'],
    },
    tax: {
      type: Number,
      default: 0,
      min: [0, 'Tax cannot be negative'],
    },
    deliveryFee: {
      type: Number,
      default: 0,
      min: [0, 'Delivery fee cannot be negative'],
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, 'Discount cannot be negative'],
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Total amount cannot be negative'],
    },
    orderStatus: {
      type: String,
      enum: {
        values: Object.values(OrderStatus),
        message: 'Invalid order status: {VALUE}',
      },
      default: OrderStatus.PENDING,
    },
    paymentStatus: {
      type: String,
      enum: {
        values: Object.values(PaymentStatus),
        message: 'Invalid payment status: {VALUE}',
      },
      default: PaymentStatus.PENDING,
    },
    acceptedAt: { type: Date, default: null },
    preparedAt: { type: Date, default: null },
    readyAt: { type: Date, default: null },
    pickedUpAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: [255, 'Cancellation reason cannot exceed 255 characters'],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
    waiterId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    kitchenPriority: {
      type: String,
      enum: {
        values: ['NEW', 'RUSH', 'DELAYED', 'CRITICAL', 'VIP', 'LARGE_PARTY', 'HIGH_VALUE'],
        message: 'Invalid kitchen priority: {VALUE}',
      },
      default: 'NEW',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    diningContext: {
      tableId: { type: Schema.Types.ObjectId, ref: 'Table', default: null },
      tableNumber: { type: String, default: null },
      seatNumber: { type: String, default: null },
      sessionId: { type: Schema.Types.ObjectId, ref: 'QRSession', default: null }
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    isSandbox: {
      type: Boolean,
      default: false,
    },
    sandboxVersion: {
      type: String,
      default: "v1",
    },
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: "SimulationSession",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

orderSchema.index({ customerId: 1 });
orderSchema.index({ outletId: 1 });
orderSchema.index({ tenantId: 1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ tenantId: 1, outletId: 1, orderStatus: 1 });
orderSchema.index({ tenantId: 1, createdAt: -1 });
orderSchema.index({ orderNumber: 1 }, { sparse: true });
orderSchema.index({ isDeleted: 1 });

// Auto-generate order number before save
orderSchema.pre('save', async function (this: IOrder) {
  if (!this.orderNumber) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.orderNumber = `ORD-${timestamp}-${random}`;
  }
});

orderSchema.pre('find', function () {
  this.where({ isDeleted: false });
});

orderSchema.pre('findOne', function () {
  this.where({ isDeleted: false });
});

const Order: Model<IOrder> = mongoose.model<IOrder>('Order', orderSchema);
export default Order;
