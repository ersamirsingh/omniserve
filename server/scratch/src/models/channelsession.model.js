import mongoose, { Schema } from "mongoose";
import crypto from "crypto";
const channelSessionSchema = new Schema({
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
}, {
    timestamps: true,
    versionKey: false,
});
// Indexes
channelSessionSchema.index({ tenantId: 1 });
channelSessionSchema.index({ outletId: 1 });
channelSessionSchema.index({ isDeleted: 1 });
// Generate unique sessionToken pre-save if not provided
channelSessionSchema.pre("save", function (next) {
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
const ChannelSession = mongoose.model("ChannelSession", channelSessionSchema);
export default ChannelSession;
