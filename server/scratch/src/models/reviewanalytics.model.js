import mongoose, { Schema } from 'mongoose';
import { ReviewSource, SentimentLabel } from '../enums/enums.js';
const reviewAnalyticsSchema = new Schema({
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
    source: {
        type: String,
        required: [true, 'Review source is required'],
        trim: true,
        enum: {
            values: Object.values(ReviewSource),
            message: 'Invalid review source: {VALUE}',
        },
    },
    reviewText: {
        type: String,
        trim: true,
        maxlength: [2000, 'Review text cannot exceed 2000 characters'],
    },
    sentimentScore: {
        type: Number,
        min: [-1, 'Sentiment score minimum is -1'],
        max: [1, 'Sentiment score maximum is 1'],
        default: 0,
    },
    sentimentLabel: {
        type: String,
        enum: Object.values(SentimentLabel),
        default: SentimentLabel.NEUTRAL,
    },
    rating: {
        type: Number,
        min: [1, 'Rating minimum is 1'],
        max: [5, 'Rating maximum is 5'],
        default: null,
    },
    reviewDate: {
        type: Date,
        default: Date.now,
    },
    externalReviewId: {
        type: String,
        trim: true,
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
}, {
    timestamps: true,
    versionKey: false,
});
reviewAnalyticsSchema.index({ tenantId: 1 });
reviewAnalyticsSchema.index({ outletId: 1 });
reviewAnalyticsSchema.index({ outletId: 1, source: 1 });
reviewAnalyticsSchema.index({ outletId: 1, sentimentLabel: 1 });
reviewAnalyticsSchema.index({ reviewDate: -1 });
reviewAnalyticsSchema.index({ isDeleted: 1 });
// Auto-compute sentiment label from score
reviewAnalyticsSchema.pre('save', async function () {
    if (this.sentimentScore > 0.2) {
        this.sentimentLabel = SentimentLabel.POSITIVE;
    }
    else if (this.sentimentScore < -0.2) {
        this.sentimentLabel = SentimentLabel.NEGATIVE;
    }
    else {
        this.sentimentLabel = SentimentLabel.NEUTRAL;
    }
});
reviewAnalyticsSchema.pre('find', function () {
    this.where({ isDeleted: false });
});
reviewAnalyticsSchema.pre('findOne', function () {
    this.where({ isDeleted: false });
});
const ReviewAnalytics = mongoose.model('ReviewAnalytics', reviewAnalyticsSchema);
export default ReviewAnalytics;
