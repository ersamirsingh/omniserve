import mongoose, { Document, Model, Schema, Types } from "mongoose";
import crypto from "crypto";

export interface IChannelSession extends Document {
  tenantId: Types.ObjectId;
  outletId: Types.ObjectId;
  sessionToken: string;
  channel: "WEBSITE" | "QR" | "SWIGGY" | "ZOMATO" | "WHATSAPP";
  menuViewedAt?: Date | null;
  firstItemViewedAt?: Date | null;
  firstAddToCartAt?: Date | null;
  checkoutStartedAt?: Date | null;
  checkoutCompletedAt?: Date | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  referrer?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const channelSessionSchema = new Schema<IChannelSession>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: [true, "Tenant is required"],
    },
    outletId: {
      type: Schema.Types.ObjectId,
      ref: "Outlet",
      required: [true, "Outlet is required"],
    },
    sessionToken: {
      type: String,
      unique: true,
      trim: true,
    },
    channel: {
      type: String,
      enum: {
        values: ["WEBSITE", "QR", "SWIGGY", "ZOMATO", "WHATSAPP"],
        message: "Invalid channel: {VALUE}",
      },
      required: [true, "Channel is required"],
    },
    menuViewedAt: { type: Date, default: null },
    firstItemViewedAt: { type: Date, default: null },
    firstAddToCartAt: { type: Date, default: null },
    checkoutStartedAt: { type: Date, default: null },
    checkoutCompletedAt: { type: Date, default: null },
    ipAddress: { type: String, trim: true, default: null },
    userAgent: { type: String, trim: true, default: null },
    referrer: { type: String, trim: true, default: null },
    utmSource: { type: String, trim: true, default: null },
    utmMedium: { type: String, trim: true, default: null },
    utmCampaign: { type: String, trim: true, default: null },
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

channelSessionSchema.index({ tenantId: 1 });
channelSessionSchema.index({ outletId: 1 });
channelSessionSchema.index({ isDeleted: 1 });

channelSessionSchema.pre("save", function (this: IChannelSession, next) {
  if (!this.sessionToken) {
    this.sessionToken = "CH-SESS-" + crypto.randomBytes(16).toString("hex").toUpperCase();
  }
  next();
});

channelSessionSchema.pre("find", function () {
  this.where({ isDeleted: false });
});

channelSessionSchema.pre("findOne", function () {
  this.where({ isDeleted: false });
});

const ChannelSession: Model<IChannelSession> = mongoose.model<IChannelSession>(
  "ChannelSession",
  channelSessionSchema
);

export default ChannelSession;
