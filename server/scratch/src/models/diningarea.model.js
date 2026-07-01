import mongoose, { Schema } from 'mongoose';
const diningAreaSchema = new Schema({
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
    name: {
        type: String,
        required: [true, 'Dining area name is required'],
        trim: true,
        maxlength: [100, 'Dining area name cannot exceed 100 characters'],
    },
    description: {
        type: String,
        trim: true,
        maxlength: [255, 'Description cannot exceed 255 characters'],
    },
    displayOrder: {
        type: Number,
        default: 0,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
    versionKey: false,
});
diningAreaSchema.index({ tenantId: 1 });
diningAreaSchema.index({ outletId: 1 });
diningAreaSchema.index({ tenantId: 1, outletId: 1, isActive: 1 });
diningAreaSchema.index({ isDeleted: 1 });
diningAreaSchema.pre('find', function () {
    this.where({ isDeleted: false });
});
diningAreaSchema.pre('findOne', function () {
    this.where({ isDeleted: false });
});
const DiningArea = mongoose.model('DiningArea', diningAreaSchema);
export default DiningArea;
