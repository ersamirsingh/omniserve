import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface ICartItem {
  menuItemId: Types.ObjectId;
  variantId?: Types.ObjectId | null;
  addons: {
    addonId: Types.ObjectId;
    quantity: number;
  }[];
  quantity: number;
  notes?: string | null;
}

export interface ICart extends Document {
  tenantId: Types.ObjectId;
  outletId: Types.ObjectId;
  sessionToken: string;
  customerId?: Types.ObjectId | null;
  items: ICartItem[];
  status: "ACTIVE" | "CONVERTED" | "ABANDONED" | "EXPIRED";
  lastActivityAt: Date;
  abandonedAt?: Date | null;
  isRecovered: boolean;
  recoveredAt?: Date | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const cartItemSchema = new Schema<ICartItem>(
  {
    menuItemId: {
      type: Schema.Types.ObjectId,
      ref: "MenuItem",
      required: [true, "MenuItem ID is required"],
    },
    variantId: {
      type: Schema.Types.ObjectId,
      ref: "Variant",
      default: null,
    },
    addons: [
      {
        addonId: {
          type: Schema.Types.ObjectId,
          ref: "Addon",
          required: [true, "Addon ID is required"],
        },
        quantity: {
          type: Number,
          required: [true, "Addon quantity is required"],
          min: 1,
          default: 1,
        },
      },
    ],
    quantity: {
      type: Number,
      required: [true, "Item quantity is required"],
      min: 1,
      default: 1,
    },
    notes: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { _id: false }
);

const cartSchema = new Schema<ICart>(
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
      required: [true, "Session token is required"],
      trim: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },
    items: {
      type: [cartItemSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ["ACTIVE", "CONVERTED", "ABANDONED", "EXPIRED"],
      default: "ACTIVE",
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
    },
    abandonedAt: {
      type: Date,
      default: null,
    },
    isRecovered: {
      type: Boolean,
      default: false,
    },
    recoveredAt: {
      type: Date,
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

// Indexes
cartSchema.index({ tenantId: 1 });
cartSchema.index({ sessionToken: 1 });
cartSchema.index({ customerId: 1 });
cartSchema.index({ status: 1 });
cartSchema.index({ isDeleted: 1 });

cartSchema.pre("find", function () {
  this.where({ isDeleted: false });
});

cartSchema.pre("findOne", function () {
  this.where({ isDeleted: false });
});

const Cart: Model<ICart> = mongoose.model<ICart>("Cart", cartSchema);

export default Cart;
