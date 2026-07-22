import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface ISystemAdminInvite extends Document {
  email: string;
  invitedBy: Types.ObjectId;
  token: string;
  status: "PENDING" | "ACCEPTED" | "REVOKED";
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const systemAdminInviteSchema = new Schema<ISystemAdminInvite>(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Inviter is required"],
    },
    token: {
      type: String,
      required: [true, "Token hash is required"],
      unique: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "REVOKED"],
      default: "PENDING",
    },
    expiresAt: {
      type: Date,
      required: [true, "Expiration date is required"],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

systemAdminInviteSchema.index({ email: 1 });
systemAdminInviteSchema.index({ expiresAt: 1 });

const SystemAdminInvite: Model<ISystemAdminInvite> =
  mongoose.models.SystemAdminInvite ||
  mongoose.model<ISystemAdminInvite>("SystemAdminInvite", systemAdminInviteSchema);

export default SystemAdminInvite;
