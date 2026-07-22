import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IMessage {
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  isError?: boolean;
  routing?: {
    intent: string;
    backend: string;
  };
}

export interface IChatSession extends Document {
  userId: Types.ObjectId;
  tenantId?: Types.ObjectId | null;
  outletId?: Types.ObjectId | null;
  title: string;
  messages: IMessage[];
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  isError: {
    type: Boolean,
    default: false,
  },
  routing: {
    intent: { type: String },
    backend: { type: String },
  },
});

const chatSessionSchema = new Schema<IChatSession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      default: null,
    },
    outletId: {
      type: Schema.Types.ObjectId,
      ref: 'Outlet',
      default: null,
    },
    title: {
      type: String,
      required: true,
      default: 'New Chat',
      trim: true,
    },
    messages: [messageSchema],
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

chatSessionSchema.index({ userId: 1, isDeleted: 1, updatedAt: -1 });

chatSessionSchema.pre('find', function () {
  this.where({ isDeleted: false });
});
chatSessionSchema.pre('findOne', function () {
  this.where({ isDeleted: false });
});

const ChatSession: Model<IChatSession> = mongoose.model<IChatSession>('ChatSession', chatSessionSchema);
export default ChatSession;
