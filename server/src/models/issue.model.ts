import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IIssueComment {
  authorId: Types.ObjectId;
  authorName: string;
  message: string;
  createdAt: Date;
}

export interface IIssue extends Document {
  title: string;
  description: string;
  type: 'SUPPORT_QUERY' | 'CRASH_REPORT' | 'SYSTEM_DETECTED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  tenantId?: Types.ObjectId | null;
  restaurantId?: Types.ObjectId | null;
  outletId?: Types.ObjectId | null;
  reporterName?: string;
  reporterEmail?: string;
  reporterId?: Types.ObjectId | null;
  assigneeId?: Types.ObjectId | null;
  trackingCode?: string;
  screenshot?: string;
  comments: IIssueComment[];
  createdAt: Date;
  updatedAt: Date;
}

const issueCommentSchema = new Schema<IIssueComment>(
  {
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, required: true },
    message: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const issueSchema = new Schema<IIssue>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    type: {
      type: String,
      enum: ['SUPPORT_QUERY', 'CRASH_REPORT', 'SYSTEM_DETECTED'],
      default: 'SUPPORT_QUERY',
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
    },
    status: {
      type: String,
      enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
      default: 'OPEN',
    },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', default: null },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', default: null },
    outletId: { type: Schema.Types.ObjectId, ref: 'Outlet', default: null },
    reporterName: { type: String, default: '' },
    reporterEmail: { type: String, default: '' },
    reporterId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    assigneeId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    trackingCode: { type: String, default: null },
    screenshot: { type: String, default: null },
    comments: { type: [issueCommentSchema], default: [] },
  },
  { timestamps: true }
);

const Issue: Model<IIssue> = mongoose.models.Issue || mongoose.model<IIssue>('Issue', issueSchema);
export default Issue;
