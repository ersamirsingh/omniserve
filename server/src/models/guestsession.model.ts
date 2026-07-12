import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IGuestSession extends Document {
  qrsessionId: Types.ObjectId;
  guestSessionToken: string;
  name: string;
  phone?: string | null;
  seatNumber?: string | null;
  guestCount: number;
  deviceId?: string | null;
  role: 'HOST' | 'MEMBER';
  status: 'ACTIVE' | 'LEFT';
  joinedAt: Date;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const guestSessionSchema = new Schema<IGuestSession>(
  {
    qrsessionId: {
      type: Schema.Types.ObjectId,
      ref: 'QRSession',
      required: [true, 'QR Session ID is required'],
    },
    guestSessionToken: {
      type: String,
      required: [true, 'Guest Session Token is required'],
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      default: 'Guest',
      trim: true,
    },
    phone: {
      type: String,
      default: null,
      trim: true,
    },
    seatNumber: {
      type: String,
      default: null,
      trim: true,
    },
    guestCount: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
    deviceId: {
      type: String,
      default: null,
      trim: true,
    },
    role: {
      type: String,
      enum: ['HOST', 'MEMBER'],
      default: 'MEMBER',
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'LEFT'],
      default: 'ACTIVE',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IGuestSession>('GuestSession', guestSessionSchema);
