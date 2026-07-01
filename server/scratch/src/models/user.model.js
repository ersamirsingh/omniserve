import mongoose, { Schema } from 'mongoose';
import { UserRole, UserStatus } from '../enums/enums.js';
const userSchema = new Schema({
    tenantId: {
        type: Schema.Types.ObjectId,
        ref: 'Tenant',
        required: [true, 'Tenant is required'],
    },
    restaurantId: {
        type: Schema.Types.ObjectId,
        ref: 'Restaurant',
        default: null,
    },
    outletId: {
        type: Schema.Types.ObjectId,
        ref: 'Outlet',
        default: null,
    },
    outletIds: {
        type: [{ type: Schema.Types.ObjectId, ref: 'Outlet' }],
        default: [],
    },
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
        maxlength: [50, 'First name cannot exceed 50 characters'],
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
        maxlength: [50, 'Last name cannot exceed 50 characters'],
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    phone: {
        type: String,
        trim: true,
        match: [/^\+?[\d\s\-().]{7,20}$/, 'Please provide a valid phone number'],
    },
    passwordHash: {
        type: String,
        required: [true, 'Password is required'],
        select: false,
    },
    role: {
        type: String,
        enum: {
            values: Object.values(UserRole),
            message: 'Invalid user role: {VALUE}',
        },
        required: [true, 'Role is required'],
    },
    pendingRole: {
        type: String,
        enum: {
            values: Object.values(UserRole),
            message: 'Invalid pending user role: {VALUE}',
        },
        default: null,
    },
    pendingRestaurantId: {
        type: Schema.Types.ObjectId,
        ref: 'Restaurant',
        default: null,
    },
    pendingOutletId: {
        type: Schema.Types.ObjectId,
        ref: 'Outlet',
        default: null,
    },
    pendingOutletIds: {
        type: [{ type: Schema.Types.ObjectId, ref: 'Outlet' }],
        default: [],
    },
    invitationLink: {
        type: String,
        trim: true,
        default: null,
    },
    invitationExpiresAt: {
        type: Date,
        default: null,
    },
    invitationAccepted: {
        type: Boolean,
        default: true,
    },
    status: {
        type: String,
        enum: {
            values: Object.values(UserStatus),
            message: 'Invalid user status: {VALUE}',
        },
        default: UserStatus.ACTIVE,
    },
    lastLogin: {
        type: Date,
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
    profileImage: {
        type: String,
        default: null,
    },
    address: {
        type: String,
        default: null,
    },
    idProof: {
        type: String,
        default: null,
    },
    idProofStatus: {
        type: String,
        enum: ['NONE', 'PENDING', 'VERIFIED', 'REJECTED'],
        default: 'NONE',
    },
}, {
    timestamps: true,
    versionKey: false,
});
userSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
userSchema.index({ tenantId: 1 });
userSchema.index({ tenantId: 1, restaurantId: 1 });
userSchema.index({ tenantId: 1, outletId: 1 });
userSchema.index({ tenantId: 1, role: 1 });
userSchema.index({ tenantId: 1, status: 1 });
userSchema.index({ isDeleted: 1 });
userSchema.index({ tenantId: 1, restaurantId: 1, role: 1 }, {
    unique: true,
    partialFilterExpression: {
        role: UserRole.RESTAURANT_OWNER,
        isDeleted: false,
        restaurantId: { $type: 'objectId' },
    },
});
userSchema.index({ tenantId: 1, pendingRestaurantId: 1, pendingRole: 1 }, {
    unique: true,
    partialFilterExpression: {
        pendingRole: UserRole.RESTAURANT_OWNER,
        isDeleted: false,
        pendingRestaurantId: { $type: 'objectId' },
    },
});
userSchema.index({ tenantId: 1, outletId: 1, role: 1 }, {
    unique: true,
    partialFilterExpression: {
        role: UserRole.OUTLET_MANAGER,
        isDeleted: false,
        outletId: { $type: 'objectId' },
    },
});
userSchema.index({ tenantId: 1, pendingOutletId: 1, pendingRole: 1 }, {
    unique: true,
    partialFilterExpression: {
        pendingRole: UserRole.OUTLET_MANAGER,
        isDeleted: false,
        pendingOutletId: { $type: 'objectId' },
    },
});
userSchema.virtual('fullName').get(function () {
    return `${this.firstName} ${this.lastName}`;
});
userSchema.pre('find', function () {
    this.where({ isDeleted: false });
});
userSchema.pre('findOne', function () {
    this.where({ isDeleted: false });
});
const User = mongoose.model('User', userSchema);
export default User;
