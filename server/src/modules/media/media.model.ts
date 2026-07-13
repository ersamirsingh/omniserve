import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IMedia extends Document {
  tenantId: Types.ObjectId;
  outletId?: Types.ObjectId | null;
  publicId: string;
  secureUrl: string;
  folder: string;
  format: string;
  width?: number | null;
  height?: number | null;
  bytes?: number | null;
  version?: string | null;
  uploadedAt: Date;
  createdBy: Types.ObjectId | null;
  isDeleted: boolean;
  deletedAt?: Date | null;
}

const mediaSchema = new Schema<IMedia>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: [true, "Tenant ID is required"],
    },
    outletId: {
      type: Schema.Types.ObjectId,
      ref: "Outlet",
      default: null,
    },
    publicId: {
      type: String,
      required: [true, "Public ID is required"],
      unique: true,
      trim: true,
    },
    secureUrl: {
      type: String,
      required: [true, "Secure URL is required"],
      trim: true,
    },
    folder: {
      type: String,
      required: [true, "Folder path is required"],
      trim: true,
    },
    format: {
      type: String,
      required: [true, "Format is required"],
      trim: true,
    },
    width: {
      type: Number,
      default: null,
    },
    height: {
      type: Number,
      default: null,
    },
    bytes: {
      type: Number,
      default: null,
    },
    version: {
      type: String,
      default: null,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

mediaSchema.index({ tenantId: 1 });
mediaSchema.index({ isDeleted: 1 });

mediaSchema.pre("find", function () {
  this.where({ isDeleted: false });
});

mediaSchema.pre("findOne", function () {
  this.where({ isDeleted: false });
});

const Media: Model<IMedia> = mongoose.model<IMedia>("Media", mediaSchema);
export default Media;
