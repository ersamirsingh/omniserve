import mongoose, { Schema } from 'mongoose';
import { AuditAction } from '../enums/enums.js';
const auditLogSchema = new Schema({
    tenantId: {
        type: Schema.Types.ObjectId,
        ref: 'Tenant',
        required: [true, 'Tenant is required'],
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User is required'],
    },
    action: {
        type: String,
        required: [true, 'Action is required'],
        trim: true,
        enum: {
            values: Object.values(AuditAction),
            message: 'Invalid action: {VALUE}',
        },
    },
    entityType: {
        type: String,
        required: [true, 'Entity type is required'],
        trim: true,
    },
    entityId: {
        type: Schema.Types.ObjectId,
        required: [true, 'Entity ID is required'],
    },
    oldData: {
        type: Schema.Types.Mixed,
        default: null,
    },
    newData: {
        type: Schema.Types.Mixed,
        default: null,
    },
    ipAddress: {
        type: String,
        trim: true,
    },
    userAgent: {
        type: String,
        trim: true,
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
    versionKey: false,
});
auditLogSchema.index({ tenantId: 1 });
auditLogSchema.index({ userId: 1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ tenantId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1 });
// TTL: auto-delete audit logs after 365 days
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 31_536_000 });
const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
