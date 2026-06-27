import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import { AuditAction } from '../constants/table-states.constants.js';

export interface IDineInAuditLog extends Document {
  tenantId: Types.ObjectId;
  outletId: Types.ObjectId | null;
  userId: Types.ObjectId | null;
  guestToken?: string;
  action: AuditAction;
  resource: string;
  resourceId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  changes?: string[];
  ipAddress?: string;
  userAgent?: string;
  notes?: string;
  createdAt: Date;
}

const dineInAuditLogSchema = new Schema<IDineInAuditLog>(
  {
    tenantId:  { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    outletId:  { type: Schema.Types.ObjectId, ref: 'Outlet', default: null },
    userId:    { type: Schema.Types.ObjectId, ref: 'User', default: null },
    guestToken:{ type: String, trim: true },
    action:    { type: String, enum: Object.values(AuditAction), required: true },
    resource:  { type: String, required: true, trim: true },
    resourceId:{ type: String, required: true, trim: true },
    before:    { type: Schema.Types.Mixed },
    after:     { type: Schema.Types.Mixed },
    changes:   [{ type: String }],
    ipAddress: { type: String, trim: true },
    userAgent: { type: String, trim: true, maxlength: 500 },
    notes:     { type: String, trim: true, maxlength: 500 },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  }
);

// TTL: Auto-delete audit logs after 90 days
dineInAuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });
dineInAuditLogSchema.index({ tenantId: 1, resource: 1, createdAt: -1 });
dineInAuditLogSchema.index({ tenantId: 1, userId: 1 });
dineInAuditLogSchema.index({ resourceId: 1, resource: 1 });

const DineInAuditLog: Model<IDineInAuditLog> = mongoose.model<IDineInAuditLog>('DineInAuditLog', dineInAuditLogSchema);
export default DineInAuditLog;
