import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import { PaymentMethod, PaymentStatus } from '../enums/enums.js';

export interface IPayment extends Document {
  tenantId: Types.ObjectId;
  orderId: Types.ObjectId;
  transactionId: string;
  paymentMethod: PaymentMethod;
  amount: number;
  currency: string;
  status: PaymentStatus;
  gatewayResponse: Record<string, unknown> | null;
  refundedAt: Date | null;
  refundTransactionId: string | null;
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: [true, 'Tenant is required'],
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Order is required'],
    },
    transactionId: {
      type: String,
      required: [true, 'Transaction ID is required'],
      trim: true,
    },
    paymentMethod: {
      type: String,
      required: [true, 'Payment method is required'],
      enum: {
        values: Object.values(PaymentMethod),
        message: 'Invalid payment method: {VALUE}',
      },
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: Object.values(PaymentStatus),
        message: 'Invalid payment status: {VALUE}',
      },
      default: PaymentStatus.PENDING,
    },
    gatewayResponse: {
      type: Schema.Types.Mixed,
      default: null,
    },
    refundedAt: {
      type: Date,
      default: null,
    },
    refundTransactionId: {
      type: String,
      trim: true,
      default: null,
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

paymentSchema.index({ transactionId: 1 }, { unique: true });
paymentSchema.index({ orderId: 1 });
paymentSchema.index({ tenantId: 1 });
paymentSchema.index({ tenantId: 1, status: 1 });
paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ isDeleted: 1 });

paymentSchema.pre('find', function () {
  this.where({ isDeleted: false });
});

paymentSchema.pre('findOne', function () {
  this.where({ isDeleted: false });
});

const Payment: Model<IPayment> = mongoose.model<IPayment>(
  'Payment',
  paymentSchema
);
export default Payment;
