import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { WebhookService } from "./webhook.service.js";
import { ApiResponseHandler } from "../../utils/apiResponse.js";
import { WebhookProvider, WebhookStatus } from "../../models/enums.js";
import WebhookLog from "../../models/webhooklog.model.js";

export class WebhookController {

  static async receiveWebhook(req: Request, res: Response): Promise<void> {
    try {
      const providerStr = (req.params.provider as string) || '';
      const providerUpper = providerStr.toUpperCase() as WebhookProvider;

      if (!Object.values(WebhookProvider).includes(providerUpper)) {
        ApiResponseHandler.badRequest(res, `Unsupported webhook provider: ${providerStr}`);
        return;
      }

      const rawBody = (req as any).rawBody || JSON.stringify(req.body);

      const signature = (
        req.headers['x-signature'] ||
        req.headers['x-razorpay-signature'] ||
        req.headers['stripe-signature'] ||
        ''
      ) as string;

      let tenantId: string;
      let secret: string;
      try {
        const resolved = await WebhookService.resolveTenantAndSecret(
          providerUpper,
          req.body,
          req.headers,
          req.query
        );
        tenantId = resolved.tenantId;
        secret = resolved.secret;
      } catch (err: any) {
        ApiResponseHandler.badRequest(res, err.message || 'Failed to resolve tenant for webhook');
        return;
      }

      let eventType = req.body.event || req.body.type || req.body.eventType || 'unknown';
      let externalEventId = req.body.id || req.body.eventId || req.body.payment_id || null;

      if (providerUpper === WebhookProvider.STRIPE) {
        eventType = req.body.type || eventType;
        externalEventId = req.body.id || externalEventId;
      } else if (providerUpper === WebhookProvider.RAZORPAY) {
        eventType = req.body.event || eventType;
        externalEventId = req.body.id || externalEventId;
      }

      const isValid = WebhookService.validateSignature(providerUpper, rawBody, signature, secret);

      if (!isValid) {

        await WebhookService.logWebhook(
          tenantId,
          providerUpper,
          eventType,
          req.body,
          signature,
          externalEventId,
          WebhookStatus.FAILED,
          'Invalid signature',
          401
        );

        ApiResponseHandler.unauthorized(res, 'Invalid webhook signature');
        return;
      }

      if (externalEventId) {
        const existingLog = await WebhookLog.findOne({
          tenantId: new Types.ObjectId(tenantId),
          provider: providerUpper,
          externalEventId,
          isDeleted: false,
        });

        if (existingLog) {

          if (existingLog.status === WebhookStatus.SUCCESS || existingLog.status === WebhookStatus.PROCESSING) {
            ApiResponseHandler.success(res, 200, 'Webhook event already processed (idempotent)');
            return;
          }
        }
      }

      const log = await WebhookService.logWebhook(
        tenantId,
        providerUpper,
        eventType,
        req.body,
        signature,
        externalEventId,
        WebhookStatus.PENDING
      );

      ApiResponseHandler.success(res, 200, 'Webhook received and queued for processing');

      setImmediate(() => {
        WebhookService.processWebhook(log._id).catch(err =>
          console.error('Failed to process background webhook:', err)
        );
      });
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || 'Webhook processing failed');
    }
  }

  static async listLogs(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenant ID not found');
        return;
      }

      const providerQuery = req.query.provider as string | undefined;
      const statusQuery = req.query.status as string | undefined;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const skip = (page - 1) * limit;

      const query: any = {
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
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || 'Failed to list webhook logs');
    }
  }

  static async getLogById(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenant ID not found');
        return;
      }

      const id = req.params.id as string;
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
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || 'Failed to retrieve webhook log');
    }
  }

  static async retryLog(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenant ID not found');
        return;
      }

      const id = req.params.id as string;
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
    } catch (error: any) {
      ApiResponseHandler.badRequest(res, error.message || 'Failed to trigger retry');
    }
  }
}
