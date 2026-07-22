import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IAddress {
  _id: Types.ObjectId;
  label?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  location: {
    type: "Point";
    coordinates: [number, number];
  };
  isDefault: boolean;
}

export interface ICustomer extends Document {
  tenantId: Types.ObjectId;
  firstName: string;
  lastName?: string;
  email?: string;
  phone: string;
  address: IAddress[];
  totalOrders: number;
  totalSpent: number;
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;

  fullName: string;
}

const addressSchema = new Schema<IAddress>(
  {
    label: {
      type: String,
      trim: true,
      maxlength: [50, "Label cannot exceed 50 characters"],
    },
    line1: { type: String, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: {
      type: String,
      trim: true,
      match: [/^\d{6}$/, "Please provide a valid 6-digit pincode"],
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true }
);

const customerSchema = new Schema<ICustomer>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: [true, "Tenant is required"],
    },
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      maxlength: [50, "First name cannot exceed 50 characters"],
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: [50, "Last name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
      sparse: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      match: [/^\+?[\d\s\-().]{7,20}$/, "Please provide a valid phone number"],
    },
    address: {
      type: [addressSchema],
      default: [],
    },
    totalOrders: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalSpent: {
      type: Number,
      default: 0,
      min: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
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

customerSchema.index({ email: 1, tenantId: 1 }, { sparse: true });
customerSchema.index({ phone: 1, tenantId: 1 });
customerSchema.index({ tenantId: 1 });
customerSchema.index({ isDeleted: 1 });

customerSchema.virtual("fullName").get(function (this: ICustomer) {
  return `${this.firstName} ${this.lastName ?? ""}`.trim();
});

customerSchema.pre("find", function () {
  this.where({ isDeleted: false });
});

customerSchema.pre("findOne", function () {
  this.where({ isDeleted: false });
});

const Customer: Model<ICustomer> = mongoose.model<ICustomer>(
  "Customer",
  customerSchema
);
export default Customer;
