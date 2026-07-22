import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IIdempotencyKey extends Document {
  key: string;
  tenantId: Types.ObjectId;
  responseBody: any;
  statusCode: number;
  createdAt: Date;
}

const idempotencyKeySchema = new Schema<IIdempotencyKey>({
  key: { type: String, required: true },
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
  responseBody: { type: Schema.Types.Mixed, required: true },
  statusCode: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now, expires: 86400 }
});

idempotencyKeySchema.index({ key: 1, tenantId: 1 }, { unique: true });

export default mongoose.models.IdempotencyKey || mongoose.model<IIdempotencyKey>('IdempotencyKey', idempotencyKeySchema);
