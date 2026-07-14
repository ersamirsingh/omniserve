import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface ITableLock extends Document {
  tableId: Types.ObjectId;
  ipAddress: string;
  lockedAt: Date;
  expiresAt: Date;
}

const tableLockSchema = new Schema<ITableLock>({
  tableId: { type: Schema.Types.ObjectId, ref: 'Table', required: true },
  ipAddress: { type: String, required: true },
  lockedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true }
});

tableLockSchema.index({ tableId: 1 }, { unique: true });
tableLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Native Mongoose TTL index

const TableLock: Model<ITableLock> = mongoose.models.TableLock || mongoose.model<ITableLock>('TableLock', tableLockSchema);
export default TableLock;
