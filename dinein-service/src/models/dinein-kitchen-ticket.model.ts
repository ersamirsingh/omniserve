import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import { KitchenTicketStatus } from '../constants/table-states.constants.js';
import crypto from 'crypto';

export interface IKitchenTicketItem {
  orderItemId: Types.ObjectId;
  menuItemId: Types.ObjectId;
  name: string;
  quantity: number;
  notes?: string;
  addons: string[];
  status: KitchenTicketStatus;
  preparedAt: Date | null;
}

export interface IDineInKitchenTicket extends Document {
  tenantId: Types.ObjectId;
  outletId: Types.ObjectId;
  orderId: Types.ObjectId;
  sessionId: Types.ObjectId;
  tableId: Types.ObjectId;
  tableNumber: string;
  kotNumber: string;
  items: IKitchenTicketItem[];
  status: KitchenTicketStatus;
  priority: number;
  notes?: string;
  acceptedAt: Date | null;
  preparingAt: Date | null;
  readyAt: Date | null;
  servedAt: Date | null;
  cancelledAt: Date | null;
  preparationTimeMinutes: number | null;
  acceptedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const kitchenItemSchema = new Schema<IKitchenTicketItem>(
  {
    orderItemId:{ type: Schema.Types.ObjectId, required: true },
    menuItemId: { type: Schema.Types.ObjectId, required: true },
    name:       { type: String, required: true, trim: true },
    quantity:   { type: Number, required: true, min: 1 },
    notes:      { type: String, trim: true, maxlength: 200 },
    addons:     [{ type: String, trim: true }],
    status:     { type: String, enum: Object.values(KitchenTicketStatus), default: KitchenTicketStatus.PENDING },
    preparedAt: { type: Date, default: null },
  },
  { _id: false }
);

const dineInKitchenTicketSchema = new Schema<IDineInKitchenTicket>(
  {
    tenantId:               { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    outletId:               { type: Schema.Types.ObjectId, ref: 'Outlet', required: true },
    orderId:                { type: Schema.Types.ObjectId, ref: 'DineInOrder', required: true },
    sessionId:              { type: Schema.Types.ObjectId, ref: 'DineInSession', required: true },
    tableId:                { type: Schema.Types.ObjectId, ref: 'DineInTable', required: true },
    tableNumber:            { type: String, required: true, trim: true },
    kotNumber:              { type: String, trim: true, uppercase: true },
    items:                  [kitchenItemSchema],
    status:                 { type: String, enum: Object.values(KitchenTicketStatus), default: KitchenTicketStatus.PENDING },
    priority:               { type: Number, default: 0 },
    notes:                  { type: String, trim: true, maxlength: 300 },
    acceptedAt:             { type: Date, default: null },
    preparingAt:            { type: Date, default: null },
    readyAt:                { type: Date, default: null },
    servedAt:               { type: Date, default: null },
    cancelledAt:            { type: Date, default: null },
    preparationTimeMinutes: { type: Number, default: null },
    acceptedBy:             { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, versionKey: false }
);

dineInKitchenTicketSchema.index({ tenantId: 1, outletId: 1, status: 1 });
dineInKitchenTicketSchema.index({ orderId: 1 });
dineInKitchenTicketSchema.index({ outletId: 1, status: 1, createdAt: -1 });
dineInKitchenTicketSchema.index({ kotNumber: 1 }, { unique: true, sparse: true });

dineInKitchenTicketSchema.pre('save', function (next) {
  if (!this.kotNumber) {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
    this.kotNumber = `KOT-${ts}-${rand}`;
  }
  next();
});

const DineInKitchenTicket: Model<IDineInKitchenTicket> = mongoose.model<IDineInKitchenTicket>('DineInKitchenTicket', dineInKitchenTicketSchema);
export default DineInKitchenTicket;
