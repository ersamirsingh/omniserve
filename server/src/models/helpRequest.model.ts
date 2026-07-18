import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IHelpRequest extends Document {
  tenantId?: Types.ObjectId | null;
  userId: Types.ObjectId;
  userRole: string;
  description: string;
  screenshot?: string;
  restaurantId?: Types.ObjectId | null;
  restaurantName?: string | null;
  outletId?: Types.ObjectId | null;
  outletName?: string | null;
  context: {
    pageRoute: string;
    timestamp: Date;
    errorLogSnippet?: string;
  };
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  resolutionNote?: string;
  resolvedAt?: Date;
  resolvedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const helpRequestSchema = new Schema<IHelpRequest>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', default: null },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userRole: { type: String, required: true },
    description: { type: String, required: true },
    screenshot: { type: String, default: null },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', default: null },
    restaurantName: { type: String, default: null },
    outletId: { type: Schema.Types.ObjectId, ref: 'Outlet', default: null },
    outletName: { type: String, default: null },
    context: {
      pageRoute: { type: String, required: true },
      timestamp: { type: Date, required: true },
      errorLogSnippet: { type: String, default: null }
    },
    status: {
      type: String,
      enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED'],
      default: 'OPEN'
    },
    resolutionNote: { type: String, default: null },
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true }
);

const HelpRequest: Model<IHelpRequest> = mongoose.models.HelpRequest || mongoose.model<IHelpRequest>('HelpRequest', helpRequestSchema);
export default HelpRequest;
