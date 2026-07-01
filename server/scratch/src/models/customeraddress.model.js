import mongoose, { Schema } from "mongoose";
const customerAddressSchema = new Schema({
    tenantId: {
        type: Schema.Types.ObjectId,
        ref: "Tenant",
        required: [true, "Tenant is required"],
    },
    customerId: {
        type: Schema.Types.ObjectId,
        ref: "Customer",
        required: [true, "Customer ref is required"],
    },
    label: {
        type: String,
        trim: true,
        maxlength: [50, "Label cannot exceed 50 characters"],
        default: "Home",
    },
    line1: {
        type: String,
        required: [true, "Line 1 is required"],
        trim: true,
    },
    line2: {
        type: String,
        trim: true,
    },
    city: {
        type: String,
        required: [true, "City is required"],
        trim: true,
    },
    state: {
        type: String,
        required: [true, "State is required"],
        trim: true,
    },
    pincode: {
        type: String,
        required: [true, "Pincode is required"],
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
            default: [0, 0], // longitude, latitude
        },
    },
    isDefault: {
        type: Boolean,
        default: false,
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
    versionKey: false,
});
// Indexes
customerAddressSchema.index({ tenantId: 1 });
customerAddressSchema.index({ customerId: 1 });
customerAddressSchema.index({ isDeleted: 1 });
customerAddressSchema.pre("find", function () {
    this.where({ isDeleted: false });
});
customerAddressSchema.pre("findOne", function () {
    this.where({ isDeleted: false });
});
const CustomerAddress = mongoose.model("CustomerAddress", customerAddressSchema);
export default CustomerAddress;
