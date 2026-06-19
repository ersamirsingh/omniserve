import { Types } from 'mongoose';
import ReviewAnalytics, { IReviewAnalytics } from '../models/reviewanalytics.model.js';
import { SentimentLabel, ReviewSource } from '../enums/enums.js';

export class ReviewService {
  /**
   * Submit/Create a new review
   */
  static async createReview(
    tenantId: string,
    data: any,
    userId?: string
  ): Promise<IReviewAnalytics> {
    // Service-level validation of sentiment label (never trust client)
    const score = data.sentimentScore !== undefined ? Number(data.sentimentScore) : 0;
    let sentimentLabel: SentimentLabel;

    if (score > 0.2) {
      sentimentLabel = SentimentLabel.POSITIVE;
    } else if (score < -0.2) {
      sentimentLabel = SentimentLabel.NEGATIVE;
    } else {
      sentimentLabel = SentimentLabel.NEUTRAL;
    }

    const review = new ReviewAnalytics({
      tenantId: new Types.ObjectId(tenantId),
      outletId: new Types.ObjectId(data.outletId),
      source: data.source as ReviewSource,
      reviewText: data.reviewText || '',
      sentimentScore: score,
      sentimentLabel,
      rating: data.rating !== undefined ? Number(data.rating) : null,
      reviewDate: data.reviewDate ? new Date(data.reviewDate) : new Date(),
      externalReviewId: data.externalReviewId || null,
      createdBy: userId ? new Types.ObjectId(userId) : null,
      updatedBy: userId ? new Types.ObjectId(userId) : null,
      isDeleted: false,
    });

    return await review.save();
  }

  /**
   * Retrieve list of reviews with pagination
   */
  static async getReviews(
    tenantId: string,
    filters: {
      outletId?: string;
      outletIds?: string[];
      source?: string;
      sentimentLabel?: string;
      rating?: number;
      limit: number;
      skip: number;
    }
  ): Promise<{ reviews: IReviewAnalytics[]; total: number }> {
    const query: any = {
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    };

    if (filters.outletId) {
      query.outletId = new Types.ObjectId(filters.outletId);
    } else if (filters.outletIds) {
      query.outletId = { $in: filters.outletIds.map(id => new Types.ObjectId(id)) };
    }
    if (filters.source) {
      query.source = filters.source;
    }
    if (filters.sentimentLabel) {
      query.sentimentLabel = filters.sentimentLabel;
    }
    if (filters.rating !== undefined && !isNaN(filters.rating)) {
      query.rating = filters.rating;
    }

    const [reviews, total] = await Promise.all([
      ReviewAnalytics.find(query)
        .sort({ reviewDate: -1 })
        .limit(filters.limit)
        .skip(filters.skip),
      ReviewAnalytics.countDocuments(query),
    ]);

    return { reviews, total };
  }

  /**
   * Calculate sentiment count summary & percentages
   */
  static async getSentimentSummary(
    tenantId: string,
    outletId?: string,
    outletIds?: string[] | null
  ): Promise<{
    positive: { count: number; percentage: number };
    neutral: { count: number; percentage: number };
    negative: { count: number; percentage: number };
  }> {
    const match: any = {
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    };

    if (outletId) {
      match.outletId = new Types.ObjectId(outletId);
    } else if (outletIds) {
      match.outletId = { $in: outletIds.map(id => new Types.ObjectId(id)) };
    }

    const result = await ReviewAnalytics.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$sentimentLabel',
          count: { $sum: 1 },
        },
      },
    ]);

    let positiveCount = 0;
    let neutralCount = 0;
    let negativeCount = 0;

    for (const item of result) {
      if (item._id === SentimentLabel.POSITIVE) {
        positiveCount = item.count;
      } else if (item._id === SentimentLabel.NEUTRAL) {
        neutralCount = item.count;
      } else if (item._id === SentimentLabel.NEGATIVE) {
        negativeCount = item.count;
      }
    }

    const total = positiveCount + neutralCount + negativeCount;

    return {
      positive: {
        count: positiveCount,
        percentage: total > 0 ? Number(((positiveCount / total) * 100).toFixed(2)) : 0,
      },
      neutral: {
        count: neutralCount,
        percentage: total > 0 ? Number(((neutralCount / total) * 100).toFixed(2)) : 0,
      },
      negative: {
        count: negativeCount,
        percentage: total > 0 ? Number(((negativeCount / total) * 100).toFixed(2)) : 0,
      },
    };
  }

  /**
   * Soft delete a review (enforcing tenant isolation)
   */
  static async deleteReview(
    id: string,
    tenantId: string,
    userId?: string
  ): Promise<IReviewAnalytics | null> {
    return await ReviewAnalytics.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      },
      {
        isDeleted: true,
        updatedBy: userId ? new Types.ObjectId(userId) : null,
      },
      { new: true }
    );
  }
}
