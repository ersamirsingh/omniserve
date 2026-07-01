import { Types } from 'mongoose';
import { WebhookService } from '../services/webhook.service.js';
import { ApiResponseHandler } from '../utils/response.handler.js';
import { WebhookProvider, WebhookStatus } from '../enums/enums.js';
import WebhookLog from '../models/webhooklog.model.js';
export class WebhookController {
    /**
     * Public Webhook Receiver Endpoint
     * POST /webhooks/:provider
     */
    static async receiveWebhook(req, res) {
        try {
            const providerStr = req.params.provider || '';
            const providerUpper = providerStr.toUpperCase();
            if (!Object.values(WebhookProvider).includes(providerUpper)) {
                ApiResponseHandler.badRequest(res, `Unsupported webhook provider: ${providerStr}`);
                return;
            }
            // Extract raw body or stringified fallback
            const rawBody = req.rawBody || JSON.stringify(req.body);
            // Extract signature
            const signature = (req.headers['x-signature'] ||
                req.headers['x-razorpay-signature'] ||
                req.headers['stripe-signature'] ||
                '');
            // Resolve tenant and secret
            let tenantId;
            let secret;
            try {
                const resolved = await WebhookService.resolveTenantAndSecret(providerUpper, req.body, req.headers, req.query);
                tenantId = resolved.tenantId;
                secret = resolved.secret;
            }
            catch (err) {
                ApiResponseHandler.badRequest(res, err.message || 'Failed to resolve tenant for webhook');
                return;
            }
            // Extract event type and external event ID
            let eventType = req.body.event || req.body.type || req.body.eventType || 'unknown';
            let externalEventId = req.body.id || req.body.eventId || req.body.payment_id || null;
            if (providerUpper === WebhookProvider.STRIPE) {
                eventType = req.body.type || eventType;
                externalEventId = req.body.id || externalEventId;
            }
            else if (providerUpper === WebhookProvider.RAZORPAY) {
                eventType = req.body.event || eventType;
                externalEventId = req.body.id || externalEventId;
            }
            // Validate signature
            const isValid = WebhookService.validateSignature(providerUpper, rawBody, signature, secret);
            if (!isValid) {
                // ALWAYS log failed webhooks, even signature errors
                await WebhookService.logWebhook(tenantId, providerUpper, eventType, req.body, signature, externalEventId, WebhookStatus.FAILED, 'Invalid signature', 401);
                ApiResponseHandler.unauthorized(res, 'Invalid webhook signature');
                return;
            }
            // Check for duplicate webhook events (idempotency check)
            if (externalEventId) {
                const existingLog = await WebhookLog.findOne({
                    tenantId: new Types.ObjectId(tenantId),
                    provider: providerUpper,
                    externalEventId,
                    isDeleted: false,
                });
                if (existingLog) {
                    // If already successfully processed or currently processing, skip and respond 200
                    if (existingLog.status === WebhookStatus.SUCCESS || existingLog.status === WebhookStatus.PROCESSING) {
                        ApiResponseHandler.success(res, 200, 'Webhook event already processed (idempotent)');
                        return;
                    }
                }
            }
            // Log webhook as PENDING
            const log = await WebhookService.logWebhook(tenantId, providerUpper, eventType, req.body, signature, externalEventId, WebhookStatus.PENDING);
            // Respond quickly to the provider
            ApiResponseHandler.success(res, 200, 'Webhook received and queued for processing');
            // Process event asynchronously in the background
            setImmediate(() => {
                WebhookService.processWebhook(log._id).catch(err => console.error('Failed to process background webhook:', err));
            });
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || 'Webhook processing failed');
        }
    }
    /**
     * Retrieve list of webhook logs for the authenticated tenant
     * GET /webhooks/logs
     */
    static async listLogs(req, res) {
        try {
            const tenantId = req.user?.tenantId;
            if (!tenantId) {
                ApiResponseHandler.unauthorized(res, 'User not authenticated or tenant ID not found');
                return;
            }
            const providerQuery = req.query.provider;
            const statusQuery = req.query.status;
            const page = parseInt(req.query.page) || 1;
            const limit = Math.min(parseInt(req.query.limit) || 20, 100);
            const skip = (page - 1) * limit;
            const query = {
                tenantId: new Types.ObjectId(tenantId),
                isDeleted: false,
            };
            if (providerQuery) {
                query.provider = providerQuery.toUpperCase();
            }
            if (statusQuery) {
                query.status = statusQuery.toUpperCase();
            }
            const [logs, total] = await Promise.all([
                WebhookLog.find(query)
                    .sort({ createdAt: -1 })
                    .limit(limit)
                    .skip(skip),
                WebhookLog.countDocuments(query),
            ]);
            ApiResponseHandler.success(res, 200, 'Webhook logs retrieved successfully', {
                logs,
                pagination: {
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit),
                },
            });
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || 'Failed to list webhook logs');
        }
    }
    /**
     * Retrieve a specific webhook log details
     * GET /webhooks/logs/:id
     */
    static async getLogById(req, res) {
        try {
            const tenantId = req.user?.tenantId;
            if (!tenantId) {
                ApiResponseHandler.unauthorized(res, 'User not authenticated or tenant ID not found');
                return;
            }
            const id = req.params.id;
            if (!id || !Types.ObjectId.isValid(id)) {
                ApiResponseHandler.badRequest(res, 'Invalid webhook log ID format');
                return;
            }
            const log = await WebhookLog.findOne({
                _id: new Types.ObjectId(id),
                tenantId: new Types.ObjectId(tenantId),
                isDeleted: false,
            });
            if (!log) {
                ApiResponseHandler.notFound(res, 'Webhook log not found or access denied');
                return;
            }
            ApiResponseHandler.success(res, 200, 'Webhook log retrieved successfully', log);
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || 'Failed to retrieve webhook log');
        }
    }
    /**
     * Manual retry trigger for a FAILED webhook log
     * POST /webhooks/logs/:id/retry
     */
    static async retryLog(req, res) {
        try {
            const tenantId = req.user?.tenantId;
            if (!tenantId) {
                ApiResponseHandler.unauthorized(res, 'User not authenticated or tenant ID not found');
                return;
            }
            const id = req.params.id;
            if (!id || !Types.ObjectId.isValid(id)) {
                ApiResponseHandler.badRequest(res, 'Invalid webhook log ID format');
                return;
            }
            const log = await WebhookService.retryWebhook(id, tenantId);
            ApiResponseHandler.success(res, 200, 'Webhook retry triggered successfully', {
                id: log._id,
                status: log.status,
                retryCount: log.retryCount,
            });
        }
        catch (error) {
            ApiResponseHandler.badRequest(res, error.message || 'Failed to trigger retry');
        }
    }
}
