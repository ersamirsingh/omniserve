import mongoose, { Document, Model, Schema } from "mongoose";
import { IInvoice } from "../modules/subscription/subscription.interface.js";
import { InvoiceStatus } from "../modules/subscription/subscription.enum.js";

export interface IInvoiceDocument extends IInvoice, Document {}

const invoiceSchema = new Schema<IInvoiceDocument>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: [true, "Tenant ID is required"],
    },
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: "RestaurantSubscription",
      required: [true, "Subscription ID is required"],
    },
    invoiceNumber: {
      type: String,
      required: [true, "Invoice number is required"],
      unique: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount cannot be negative"],
    },
    currency: {
      type: String,
      default: "INR",
      uppercase: true,
      trim: true,
    },
    tax: {
      type: Number,
      default: 0,
      min: [0, "Tax cannot be negative"],
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, "Discount cannot be negative"],
    },
    total: {
      type: Number,
      required: [true, "Total amount is required"],
      min: [0, "Total amount cannot be negative"],
    },
    status: {
      type: String,
      enum: {
        values: Object.values(InvoiceStatus),
        message: "Invalid invoice status: {VALUE}",
      },
      default: InvoiceStatus.PENDING,
    },
    paymentMethod: {
      type: String,
      default: null,
    },
    paymentReference: {
      type: String,
      default: null,
    },
    invoiceUrl: {
      type: String,
      default: null,
    },
    paidAt: {
      type: Date,
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

invoiceSchema.index({ tenantId: 1 });
invoiceSchema.index({ subscriptionId: 1 });
invoiceSchema.index({ isDeleted: 1 });

invoiceSchema.pre("find", function () {
  this.where({ isDeleted: false });
});

invoiceSchema.pre("findOne", function () {
  this.where({ isDeleted: false });
});

const InvoiceModel: Model<IInvoiceDocument> =
  mongoose.models.Invoice || mongoose.model<IInvoiceDocument>("Invoice", invoiceSchema);

export default InvoiceModel;
