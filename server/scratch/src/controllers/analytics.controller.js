import { Types } from 'mongoose';
import { AnalyticsService } from '../services/analytics.service.js';
import { ReviewService } from '../services/review.service.js';
import { ApiResponseHandler } from '../utils/response.handler.js';
import Outlet from '../models/outlet.model.js';
import { AccessScope } from '../utils/accessScope.utils.js';
export class AnalyticsController {
    /**
     * Helper to validate that an outlet exists, belongs to the tenant, and is not deleted
     */
    static async validateOutletOwnership(outletId, tenantId) {
        if (!Types.ObjectId.isValid(outletId)) {
            return false;
        }
        const outlet = await Outlet.findOne({
            _id: new Types.ObjectId(outletId),
            tenantId: new Types.ObjectId(tenantId),
            isDeleted: false,
        });
        return !!outlet;
    }
    /**
     * Manually upsert daily metrics
     * POST /analytics/daily
     */
    static async upsertDailyMetrics(req, res) {
        try {
            const tenantId = req.user?.tenantId;
            const userId = req.user?.userId;
            if (!tenantId) {
                ApiResponseHandler.unauthorized(res, 'User not authenticated or tenant ID not found');
                return;
            }
            const { outletId, reportDate, totalOrders, totalRevenue, cancelledOrders, newCustomers, repeatCustomers, } = req.body;
            if (!outletId || !reportDate) {
                ApiResponseHandler.badRequest(res, 'outletId and reportDate are required');
                return;
            }
            // Validate outlet ownership
            const isOwner = await AnalyticsController.validateOutletOwnership(outletId, tenantId);
            if (!isOwner) {
                ApiResponseHandler.badRequest(res, 'Outlet not found or access denied');
                return;
            }
            if (!(await AccessScope.canAccessOutlet(req.user, outletId))) {
                ApiResponseHandler.forbidden(res, 'You cannot write analytics for this outlet');
                return;
            }
            const metrics = {};
            if (totalOrders !== undefined)
                metrics.totalOrders = Number(totalOrders);
            if (totalRevenue !== undefined)
                metrics.totalRevenue = Number(totalRevenue);
            if (cancelledOrders !== undefined)
                metrics.cancelledOrders = Number(cancelledOrders);
            if (newCustomers !== undefined)
                metrics.newCustomers = Number(newCustomers);
            if (repeatCustomers !== undefined)
                metrics.repeatCustomers = Number(repeatCustomers);
            const record = await AnalyticsService.upsertDailyMetrics(tenantId, outletId, reportDate, metrics, userId);
            ApiResponseHandler.success(res, 200, 'Daily analytics upserted successfully', record);
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || 'Failed to upsert daily metrics');
        }
    }
    /**
     * Retrieve daily stats list
     * GET /analytics/daily
     */
    static async getDailyStats(req, res) {
        try {
            const tenantId = req.user?.tenantId;
            if (!tenantId) {
                ApiResponseHandler.unauthorized(res, 'User not authenticated or tenant ID not found');
                return;
            }
            const outletId = req.query.outletId;
            const from = req.query.from;
            const to = req.query.to;
            // Validate outlet ownership if filtering by outlet
            if (outletId) {
                const isOwner = await AnalyticsController.validateOutletOwnership(outletId, tenantId);
                if (!isOwner) {
                    ApiResponseHandler.badRequest(res, 'Outlet not found or access denied');
                    return;
                }
                if (!(await AccessScope.canAccessOutlet(req.user, outletId))) {
                    ApiResponseHandler.forbidden(res, 'You cannot access analytics for this outlet');
                    return;
                }
            }
            const allowedOutletIds = await AccessScope.outletIdsForUser(req.user);
            const filters = {};
            if (outletId)
                filters.outletId = outletId;
            else if (allowedOutletIds)
                filters.outletIds = allowedOutletIds;
            if (from)
                filters.from = from;
            if (to)
                filters.to = to;
            const records = await AnalyticsService.getDailyStats(tenantId, filters);
            ApiResponseHandler.success(res, 200, 'Daily analytics retrieved successfully', records);
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || 'Failed to retrieve daily stats');
        }
    }
    /**
     * Retrieve aggregated summary of tenant statistics
     * GET /analytics/summary
     */
    static async getSummaryStats(req, res) {
        try {
            const tenantId = req.user?.tenantId;
            if (!tenantId) {
                ApiResponseHandler.unauthorized(res, 'User not authenticated or tenant ID not found');
                return;
            }
            const outletId = req.query.outletId;
            if (outletId) {
                const isOwner = await AnalyticsController.validateOutletOwnership(outletId, tenantId);
                if (!isOwner) {
                    ApiResponseHandler.badRequest(res, 'Outlet not found or access denied');
                    return;
                }
                if (!(await AccessScope.canAccessOutlet(req.user, outletId))) {
                    ApiResponseHandler.forbidden(res, 'You cannot access analytics for this outlet');
                    return;
                }
            }
            const allowedOutletIds = await AccessScope.outletIdsForUser(req.user);
            const scopedOutletIds = outletId ? [outletId] : allowedOutletIds;
            const summary = await AnalyticsService.getSummaryStats(tenantId, scopedOutletIds);
            ApiResponseHandler.success(res, 200, 'Tenant stats summary retrieved successfully', summary);
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || 'Failed to retrieve tenant summary');
        }
    }
    /**
     * Submit review
     * POST /analytics/reviews
     */
    static async createReview(req, res) {
        try {
            const tenantId = req.user?.tenantId;
            const userId = req.user?.userId;
            if (!tenantId) {
                ApiResponseHandler.unauthorized(res, 'User not authenticated or tenant ID not found');
                return;
            }
            const { outletId, source, rating } = req.body;
            if (!outletId || !source) {
                ApiResponseHandler.badRequest(res, 'outletId and source are required');
                return;
            }
            // Validate rating bounds if present
            if (rating !== undefined && (Number(rating) < 1 || Number(rating) > 5)) {
                ApiResponseHandler.badRequest(res, 'Rating must be between 1 and 5');
                return;
            }
            // Validate outlet ownership
            const isOwner = await AnalyticsController.validateOutletOwnership(outletId, tenantId);
            if (!isOwner) {
                ApiResponseHandler.badRequest(res, 'Outlet not found or access denied');
                return;
            }
            if (!(await AccessScope.canAccessOutlet(req.user, outletId))) {
                ApiResponseHandler.forbidden(res, 'You cannot submit reviews for this outlet');
                return;
            }
            const review = await ReviewService.createReview(tenantId, req.body, userId);
            ApiResponseHandler.success(res, 201, 'Review submitted successfully', review);
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || 'Failed to submit review');
        }
    }
    /**
     * Retrieve list of reviews
     * GET /analytics/reviews
     */
    static async getReviews(req, res) {
        try {
            const tenantId = req.user?.tenantId;
            if (!tenantId) {
                ApiResponseHandler.unauthorized(res, 'User not authenticated or tenant ID not found');
                return;
            }
            const outletId = req.query.outletId;
            const source = req.query.source;
            const sentimentLabel = req.query.sentimentLabel;
            const ratingQuery = req.query.rating;
            const page = parseInt(req.query.page) || 1;
            const limit = Math.min(parseInt(req.query.limit) || 20, 100);
            const skip = (page - 1) * limit;
            // Validate outlet ownership if filtering by outlet
            if (outletId) {
                const isOwner = await AnalyticsController.validateOutletOwnership(outletId, tenantId);
                if (!isOwner) {
                    ApiResponseHandler.badRequest(res, 'Outlet not found or access denied');
                    return;
                }
                if (!(await AccessScope.canAccessOutlet(req.user, outletId))) {
                    ApiResponseHandler.forbidden(res, 'You cannot access reviews for this outlet');
                    return;
                }
            }
            const rating = ratingQuery ? parseInt(ratingQuery) : undefined;
            const allowedOutletIds = await AccessScope.outletIdsForUser(req.user);
            const filters = { limit, skip };
            if (outletId)
                filters.outletId = outletId;
            else if (allowedOutletIds)
                filters.outletIds = allowedOutletIds;
            if (source)
                filters.source = source;
            if (sentimentLabel)
                filters.sentimentLabel = sentimentLabel;
            if (rating !== undefined && !isNaN(rating))
                filters.rating = rating;
            const { reviews, total } = await ReviewService.getReviews(tenantId, filters);
            ApiResponseHandler.success(res, 200, 'Reviews retrieved successfully', {
                reviews,
                pagination: {
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit),
                },
            });
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || 'Failed to retrieve reviews');
        }
    }
    /**
     * Retrieve sentiment aggregations and percentages
     * GET /analytics/reviews/sentiment
     */
    static async getSentimentSummary(req, res) {
        try {
            const tenantId = req.user?.tenantId;
            if (!tenantId) {
                ApiResponseHandler.unauthorized(res, 'User not authenticated or tenant ID not found');
                return;
            }
            const outletId = req.query.outletId;
            // Validate outlet ownership if filtering by outlet
            if (outletId) {
                const isOwner = await AnalyticsController.validateOutletOwnership(outletId, tenantId);
                if (!isOwner) {
                    ApiResponseHandler.badRequest(res, 'Outlet not found or access denied');
                    return;
                }
                if (!(await AccessScope.canAccessOutlet(req.user, outletId))) {
                    ApiResponseHandler.forbidden(res, 'You cannot access reviews for this outlet');
                    return;
                }
            }
            const allowedOutletIds = await AccessScope.outletIdsForUser(req.user);
            const summary = await ReviewService.getSentimentSummary(tenantId, outletId, outletId ? undefined : allowedOutletIds);
            ApiResponseHandler.success(res, 200, 'Sentiment analysis aggregated successfully', summary);
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || 'Failed to calculate sentiment analysis');
        }
    }
    /**
     * Delete a review
     * DELETE /analytics/reviews/:id
     */
    static async deleteReview(req, res) {
        try {
            const tenantId = req.user?.tenantId;
            const userId = req.user?.userId;
            if (!tenantId) {
                ApiResponseHandler.unauthorized(res, 'User not authenticated or tenant ID not found');
                return;
            }
            const { id } = req.params;
            if (!Types.ObjectId.isValid(id)) {
                ApiResponseHandler.badRequest(res, 'Invalid review ID format');
                return;
            }
            const review = await ReviewService.deleteReview(id, tenantId, userId);
            if (!review) {
                ApiResponseHandler.notFound(res, 'Review not found or access denied');
                return;
            }
            ApiResponseHandler.success(res, 200, 'Review deleted successfully');
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || 'Failed to delete review');
        }
    }
}
