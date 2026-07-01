import mongoose, { Schema } from "mongoose";
const refreshTokenSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: [true, "User is required"],
    },
    tenantId: {
        type: Schema.Types.ObjectId,
        ref: "Tenant",
        required: [true, "Tenant is required"],
    },
    token: {
        type: String,
        required: [true, "Token is required"],
        select: false,
    },
    expiresAt: {
        type: Date,
        required: [true, "Expiration date is required"],
    },
    isRevoked: {
        type: Boolean,
        default: false,
    },
    revokedAt: {
        type: Date,
        default: null,
    },
    ipAddress: {
        type: String,
        trim: true,
    },
    userAgent: {
        type: String,
        trim: true,
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
}, {
    timestamps: true,
    versionKey: false,
});
// TTL index: MongoDB auto-removes expired tokens
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
refreshTokenSchema.index({ userId: 1 });
refreshTokenSchema.index({ token: 1 });
refreshTokenSchema.index({ userId: 1, isRevoked: 1 });
const RefreshToken = mongoose.model("RefreshToken", refreshTokenSchema);
export default RefreshToken;
