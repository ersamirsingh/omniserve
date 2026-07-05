import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export type ReservationStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'HOLD'
  | 'SEATED'
  | 'COMPLETED'
  | 'NO_SHOW'
  | 'CANCELLED';

export interface IReservation extends Document {
  tenantId: Types.ObjectId;
  outletId: Types.ObjectId;
  /** Assigned table (optional until seated) */
  tableId?: Types.ObjectId | null;
  /** Dining area the guest prefers */
  diningAreaId?: Types.ObjectId | null;
  /** Customer reference (optional — walk-ins may not have an account) */
  customerId?: Types.ObjectId | null;
  /** Guest name for display on the floor map */
  guestName: string;
  guestPhone?: string;
  guestEmail?: string;
  partySize: number;
  scheduledAt: Date;
  status: ReservationStatus;
  confirmedAt?: Date | null;
  seatedAt?: Date | null;
  completedAt?: Date | null;
  cancelledAt?: Date | null;
  noShowAt?: Date | null;
  cancellationReason?: string;
  specialRequests?: string;
  /** Internal notes from staff */
  notes?: string;
  /** QR session created when guest is seated */
  sessionId?: Types.ObjectId | null;
  seatNumber?: string | null;
  /** Waiter pre-assigned to this reservation */
  assignedWaiterId?: Types.ObjectId | null;
  createdBy?: Types.ObjectId | null;
  updatedBy?: Types.ObjectId | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const reservationSchema = new Schema<IReservation>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: [true, 'Tenant is required'],
    },
    outletId: {
      type: Schema.Types.ObjectId,
      ref: 'Outlet',
      required: [true, 'Outlet is required'],
    },
    tableId: {
      type: Schema.Types.ObjectId,
      ref: 'Table',
      default: null,
    },
    diningAreaId: {
      type: Schema.Types.ObjectId,
      ref: 'DiningArea',
      default: null,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
    },
    guestName: {
      type: String,
      required: [true, 'Guest name is required'],
      trim: true,
      maxlength: [120, 'Guest name cannot exceed 120 characters'],
    },
    guestPhone: {
      type: String,
      trim: true,
    },
    guestEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    partySize: {
      type: Number,
      required: [true, 'Party size is required'],
      min: [1, 'Party size must be at least 1'],
    },
    scheduledAt: {
      type: Date,
      required: [true, 'Scheduled time is required'],
    },
    status: {
      type: String,
      enum: {
        values: ['PENDING', 'CONFIRMED', 'HOLD', 'SEATED', 'COMPLETED', 'NO_SHOW', 'CANCELLED'],
        message: 'Invalid reservation status: {VALUE}',
      },
      default: 'PENDING',
    },
    confirmedAt: { type: Date, default: null },
    seatedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    noShowAt: { type: Date, default: null },
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: [255, 'Cancellation reason cannot exceed 255 characters'],
    },
    specialRequests: {
      type: String,
      trim: true,
      maxlength: [500, 'Special requests cannot exceed 500 characters'],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'QRSession',
      default: null,
    },
    seatNumber: {
      type: String,
      default: null,
      trim: true,
    },
    assignedWaiterId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Indexes for common query patterns
reservationSchema.index({ tenantId: 1, outletId: 1, scheduledAt: 1 });
reservationSchema.index({ tenantId: 1, outletId: 1, status: 1 });
reservationSchema.index({ customerId: 1 });
reservationSchema.index({ tableId: 1, scheduledAt: 1 });
reservationSchema.index({ isDeleted: 1 });

reservationSchema.pre('find', function () {
  this.where({ isDeleted: false });
});

reservationSchema.pre('findOne', function () {
  this.where({ isDeleted: false });
});

const Reservation: Model<IReservation> = mongoose.model<IReservation>('Reservation', reservationSchema);
export default Reservation;
