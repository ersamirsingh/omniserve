import { Types } from 'mongoose';
import crypto from 'crypto';
import WebhookLog, { IWebhookLog } from "../../models/webhookLog.model.js";
import Tenant from "../../models/tenant.model.js";
import Outlet from "../../models/outlet.model.js";
import Order from "../../models/order.model.js";
import Payment from "../../models/payment.model.js";
import { OrderService } from "../order/order.service.js";
import { WebhookStatus, WebhookProvider, PaymentStatus, OrderStatus } from "../../models/enums.js";

export class WebhookService {
  /**
   * Resolve tenantId and webhook secret based on payload account IDs, headers, or query string
   */
  static async resolveTenantAndSecret(
    provider: WebhookProvider,
    payload: any,
    headers: Record<string, any>,
    query: Record<string, any>
  ): Promise<{ tenantId: string; secret: string }> {
    // 1. Resolve via header
    const headerTenantId = headers['x-tenant-id'] || headers['X-Tenant-Id'];
    if (headerTenantId && Types.ObjectId.isValid(headerTenantId)) {
      return { tenantId: headerTenantId, secret: process.env.WEBHOOK_SECRET || 'whsec_test' };
    }

    // 2. Resolve via query param
    const queryTenantId = query.tenantId;
    if (queryTenantId && Types.ObjectId.isValid(queryTenantId)) {
      return { tenantId: queryTenantId, secret: process.env.WEBHOOK_SECRET || 'whsec_test' };
    }

    // 3. Resolve via payload identifiers
    let resolvedTenantId: string | null = null;
    if (payload) {
      if (provider === WebhookProvider.RAZORPAY) {
        // Razorpay merchant/account ID
        const accountId = payload.account_id || payload.merchant_id;
        if (accountId) {
          // Look up corresponding tenant (mock or direct lookup)
        }
      } else if (provider === WebhookProvider.STRIPE) {
        // Stripe Connect account ID
        const accountId = payload.user_id || payload.account;
        if (accountId) {
          // Look up corresponding tenant
        }
      } else if (provider === WebhookProvider.SWIGGY || provider === WebhookProvider.ZOMATO) {
        const outletId = payload.outlet_id || payload.restaurant_id || payload.res_id;
        if (outletId && Types.ObjectId.isValid(outletId)) {
          const outlet = await Outlet.findOne({ _id: new Types.ObjectId(outletId), isDeleted: false });
          if (outlet) {
            resolvedTenantId = outlet.tenantId.toString();
          }
        }
      } else if (payload.tenantId && Types.ObjectId.isValid(payload.tenantId)) {
        resolvedTenantId = payload.tenantId;
      }
    }

    if (resolvedTenantId) {
      return { tenantId: resolvedTenantId, secret: process.env.WEBHOOK_SECRET || 'whsec_test' };
    }

    // Fallback: Find the first active tenant in database to allow out-of-the-box local testing
    const tenant = await Tenant.findOne({ status: 'ACTIVE', isDeleted: false });
    if (!tenant) {
      throw new Error('No active tenant found to process webhook');
    }

    return { tenantId: tenant._id.toString(), secret: process.env.WEBHOOK_SECRET || 'whsec_test' };
  }

  /**
   * Validate Webhook signatures using crypto HMAC timingSafeEqual checks
   */
  static validateSignature(
    provider: WebhookProvider,
    rawBody: string,
    signature: string,
    secret: string
  ): boolean {
    if (!signature || !secret) return false;

    try {
      if (provider === WebhookProvider.STRIPE) {
        // Stripe format: t=timestamp,v1=sig
        const parts = signature.split(',');
        const tPart = parts.find(p => p.startsWith('t='));
        const vPart = parts.find(p => p.startsWith('v1='));
        if (!tPart || !vPart) return false;

        const timestamp = tPart.split('=')[1];
        const sig = vPart.split('=')[1];
        if (!timestamp || !sig) return false;
        const payload = `${timestamp}.${rawBody}`;

        const expectedSig = crypto
          .createHmac('sha256', secret)
          .update(payload)
          .digest('hex');

        return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig));
      }

      if (provider === WebhookProvider.RAZORPAY) {
        const expectedSig = crypto
          .createHmac('sha256', secret)
          .update(rawBody)
          .digest('hex');

        return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
      }

      // Generic HMAC validation (Swiggy, Zomato, Dunzo, Porter, Custom)
      const expectedSig = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');

      // Use timingSafeEqual to prevent timing attacks; guard against length mismatch
      const sigBuf = Buffer.from(signature);
      const expectedBuf = Buffer.from(expectedSig);
      if (sigBuf.length !== expectedBuf.length) return false;
      return crypto.timingSafeEqual(sigBuf, expectedBuf);
    } catch {
      return false;
    }
  }

  /**
   * Create and write a WebhookLog record
   */
  static async logWebhook(
    tenantId: string,
    provider: WebhookProvider,
    eventType: string,
    payload: any,
    signature: string | null,
    externalEventId: string | null,
    status: WebhookStatus,
    errorMessage: string | null = null,
    httpStatusCode: number | null = null
  ): Promise<IWebhookLog> {
    const log = new WebhookLog({
      tenantId: new Types.ObjectId(tenantId),
      provider,
      eventType,
      payload,
      signature: signature || null,
      externalEventId: externalEventId || null,
      status,
      processed: status === WebhookStatus.SUCCESS,
      processedAt: status === WebhookStatus.SUCCESS ? new Date() : null,
      errorMessage,
      httpStatusCode,
      retryCount: 0,
      isDeleted: false,
    });

    return await log.save();
  }

  /**
   * Execute webhook business logic asynchronously in the background
   */
  static async processWebhook(logId: Types.ObjectId | string): Promise<void> {
    const log = await WebhookLog.findById(logId);
    if (!log || log.status === WebhookStatus.SUCCESS) {
      return;
    }

    try {
      // Transition to PROCESSING
      await WebhookLog.updateOne(
        { _id: log._id },
        { status: WebhookStatus.PROCESSING }
      );

      const payload = log.payload as any;
      const provider = log.provider;
      const eventType = log.eventType;

      // 1. Stripe & Razorpay (Payments)
      if (provider === WebhookProvider.STRIPE || provider === WebhookProvider.RAZORPAY) {
        // Extract order ID from custom metadata or root properties
        const orderId = payload.metadata?.orderId || payload.order_id || payload.entity?.order_id;
        if (orderId && Types.ObjectId.isValid(orderId)) {
          let paymentStatus: PaymentStatus | null = null;
          if (eventType.includes('succeeded') || eventType.includes('paid')) {
            paymentStatus = PaymentStatus.SUCCESS;
          } else if (eventType.includes('failed')) {
            paymentStatus = PaymentStatus.FAILED;
          } else if (eventType.includes('refunded')) {
            paymentStatus = PaymentStatus.REFUNDED;
          }

          if (paymentStatus) {
            // Update order and payment status
            await Order.updateOne(
              { _id: new Types.ObjectId(orderId), tenantId: log.tenantId },
              { paymentStatus }
            );
            await Payment.updateOne(
              { orderId: new Types.ObjectId(orderId), tenantId: log.tenantId },
              { status: paymentStatus }
            );
          }
        }
      }

      // 2. Swiggy, Zomato, Dunzo, Porter (Order / Delivery Lifecycle Updates)
      if (
        provider === WebhookProvider.SWIGGY ||
        provider === WebhookProvider.ZOMATO ||
        provider === WebhookProvider.DUNZO ||
        provider === WebhookProvider.PORTER
      ) {
        const orderId = payload.orderId || payload.order_id || payload.externalOrderId;
        if (orderId && Types.ObjectId.isValid(orderId)) {
          let targetStatus: OrderStatus | null = null;
          if (eventType.includes('accepted')) {
            targetStatus = OrderStatus.ACCEPTED;
          } else if (eventType.includes('picked_up') || eventType.includes('picked')) {
            targetStatus = OrderStatus.PICKED_UP;
          } else if (eventType.includes('delivered') || eventType.includes('complete')) {
            targetStatus = OrderStatus.DELIVERED;
          }

          if (targetStatus) {
            // Call order service to transition order status
            await OrderService.updateOrderStatus(orderId, log.tenantId.toString(), targetStatus);
          }
        }
      }

      // Mark as SUCCESS
      await WebhookLog.updateOne(
        { _id: log._id },
        {
          status: WebhookStatus.SUCCESS,
          processed: true,
          processedAt: new Date(),
          errorMessage: null,
          httpStatusCode: 200,
        }
      );
    } catch (error: any) {
      // Mark as FAILED
      await WebhookLog.updateOne(
        { _id: log._id },
        {
          status: WebhookStatus.FAILED,
          processed: false,
          errorMessage: error.message || 'Error occurred during background processing',
          httpStatusCode: 500,
        }
      );
    }
  }

  /**
   * Retry processing for a FAILED webhook log using strict atomic state transition locks
   */
  static async retryWebhook(logId: string, tenantId: string): Promise<IWebhookLog> {
    const logObjectId = new Types.ObjectId(logId);
    const tenantObjectId = new Types.ObjectId(tenantId);

    // Atomic FAILED -> PROCESSING transition lock to prevent duplicate runs
    const log = await WebhookLog.findOneAndUpdate(
      {
        _id: logObjectId,
        tenantId: tenantObjectId,
        status: WebhookStatus.FAILED,
        isDeleted: false,
      },
      {
        status: WebhookStatus.PROCESSING,
        $inc: { retryCount: 1 },
        errorMessage: null,
      },
      { new: true }
    );

    if (!log) {
      throw new Error('Webhook log not found, is already processed, or is currently processing');
    }

    // Process asynchronously in background
    setImmediate(() => {
      this.processWebhook(log._id).catch(err => console.error('Failed to run retry webhook job:', err));
    });

    return log;
  }
}
