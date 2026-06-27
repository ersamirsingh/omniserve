import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import { OrderItemStatus } from '../constants/table-states.constants.js';

export interface IAddonItem {
  addonId: Types.ObjectId;
  name: string;
  price: number;
}

export interface IDineInOrderItem extends Document {
  tenantId: Types.ObjectId;
  outletId: Types.ObjectId;
  orderId: Types.ObjectId;
  sessionId: Types.ObjectId;
  menuItemId: Types.ObjectId;
  variantId: Types.ObjectId | null;
  name: string;
  description?: string;
  category?: string;
  quantity: number;
  unitPrice: number;
  addons: IAddonItem[];
  addonsTotal: number;
  totalPrice: number;
  notes?: string;
  status: OrderItemStatus;
  guestId: Types.ObjectId | null;
  seatId: Types.ObjectId | null;
  preparedAt: Date | null;
  servedAt: Date | null;
  cancelledAt: Date | null;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const addonItemSchema = new Schema<IAddonItem>(
  {
    addonId: { type: Schema.Types.ObjectId, required: true },
    name:    { type: String, required: true, trim: true },
    price:   { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const dineInOrderItemSchema = new Schema<IDineInOrderItem>(
  {
    tenantId:          { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    outletId:          { type: Schema.Types.ObjectId, ref: 'Outlet', required: true },
    orderId:           { type: Schema.Types.ObjectId, ref: 'DineInOrder', required: true },
    sessionId:         { type: Schema.Types.ObjectId, ref: 'DineInSession', required: true },
    menuItemId:        { type: Schema.Types.ObjectId, required: true },
    variantId:         { type: Schema.Types.ObjectId, default: null },
    name:              { type: String, required: true, trim: true, maxlength: 200 },
    description:       { type: String, trim: true, maxlength: 500 },
    category:          { type: String, trim: true },
    quantity:          { type: Number, required: true, min: 1 },
    unitPrice:         { type: Number, required: true, min: 0 },
    addons:            [addonItemSchema],
    addonsTotal:       { type: Number, default: 0, min: 0 },
    totalPrice:        { type: Number, required: true, min: 0 },
    notes:             { type: String, trim: true, maxlength: 300 },
    status:            { type: String, enum: Object.values(OrderItemStatus), default: OrderItemStatus.PENDING },
    guestId:           { type: Schema.Types.ObjectId, ref: 'DineInGuest', default: null },
    seatId:            { type: Schema.Types.ObjectId, ref: 'DineInSeat', default: null },
    preparedAt:        { type: Date, default: null },
    servedAt:          { type: Date, default: null },
    cancelledAt:       { type: Date, default: null },
    cancellationReason:{ type: String, trim: true, maxlength: 200 },
  },
  { timestamps: true, versionKey: false }
);

dineInOrderItemSchema.index({ orderId: 1, status: 1 });
dineInOrderItemSchema.index({ sessionId: 1 });
dineInOrderItemSchema.index({ tenantId: 1, outletId: 1, status: 1 });
dineInOrderItemSchema.index({ menuItemId: 1 });

const DineInOrderItem: Model<IDineInOrderItem> = mongoose.model<IDineInOrderItem>('DineInOrderItem', dineInOrderItemSchema);
export default DineInOrderItem;
