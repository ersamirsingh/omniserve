import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICopilotSyncState extends Document {
  serviceName: string;
  lastSyncedAt: Date;
  status: string;
  recordsSynced: number;
}

const copilotSyncStateSchema = new Schema<ICopilotSyncState>(
  {
    serviceName: {
      type: String,
      required: true,
      unique: true,
    },
    lastSyncedAt: {
      type: Date,
      required: true,
      default: () => new Date(0),
    },
    status: {
      type: String,
      default: 'IDLE',
    },
    recordsSynced: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const CopilotSyncState: Model<ICopilotSyncState> = mongoose.model<ICopilotSyncState>('CopilotSyncState', copilotSyncStateSchema);
export default CopilotSyncState;
