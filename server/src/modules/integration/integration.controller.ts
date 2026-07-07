import { Request, Response } from "express";
import mongoose, { Types } from "mongoose";
import { OrderGatewayService } from "../order/ordergateway.service.js";
import { IntegrationProvider } from "../../types/integration.type.js";
import { ApiResponseHandler } from "../../utils/apiResponse.js";
import MenuItem from "../../models/menuItem.model.js";
import Outlet from "../../models/outlet.model.js";
import Category from "../../models/category.model.js";
import Variant from "../../models/variant.model.js";
import Addon from "../../models/addon.model.js";
import Inventory from "../../models/inventory.model.js";
import ChannelMenuItemMapping from "../../models/channelmenuitemmapping.model.js";
import ChannelOutletMapping from "../../models/channeloutletmapping.model.js";
import ChannelVariantMapping from "../../models/channelvariantmapping.model.js";
import ChannelAddonMapping from "../../models/channeladdonmapping.model.js";
import Order from "../../models/order.model.js";
import ExternalOrder from "../../models/externalorder.model.js";
import OrderTimeline from "../../models/ordertimeline.model.js";
import Restaurant from "../../models/restaurant.model.js";
import Tenant from "../../models/tenant.model.js";
import IntegrationEventQueue from "../../models/integration-event-queue.model.js";
import ProviderSyncState from "../../models/providersyncstate.model.js";
import SyncJob from "../../models/syncjob.model.js";
import { OutboxPollerService } from "./outbox-poller.service.js";
import { RealtimeService } from "../../sockets/realtime.service.js";
import { EventBusService } from "../../events/eventBus.js";
import { SubscriptionRepository } from "../subscription/subscription.repository.js";

export class IntegrationController {
  /**
   * Receive Mock Swiggy Order Callback
   * POST /api/v1/integrations/mock/swiggy/orders
   */
  static async receiveMockSwiggyOrder(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req.query.tenantId as string) || (req.headers["x-tenant-id"] as string);
      if (!tenantId || !Types.ObjectId.isValid(tenantId)) {
        ApiResponseHandler.badRequest(res, "A valid tenantId query param or x-tenant-id header is required");
        return;
      }

      // Check subscription apiAccess
      const subscription = await SubscriptionRepository.findSubscriptionByTenant(tenantId);
      if (!subscription) {
        ApiResponseHandler.forbidden(res, "No active subscription found. Please onboard.");
        return;
      }
      const plan = subscription.planId as any;
      if (!plan || !plan.features?.apiAccess) {
        ApiResponseHandler.forbidden(res, "Integration API access is not enabled on your plan. Please upgrade to Super.");
        return;
      }

      const payload = req.body;
      const externalOrderId = payload.order_id;
      if (!externalOrderId) {
        ApiResponseHandler.badRequest(res, "Missing order_id in payload");
        return;
      }

      // 1. Ingest order
      const { externalOrder } = await OrderGatewayService.ingestExternalOrder({
        tenantId,
        provider: IntegrationProvider.MOCK_SWIGGY,
        externalOrderId: String(externalOrderId),
        rawPayload: payload,
        outletId: payload.outlet_id && Types.ObjectId.isValid(payload.outlet_id) ? payload.outlet_id : undefined,
      });

      // 2. Process/normalize order synchronously for immediate test feedback
      const processedOrder = await OrderGatewayService.processExternalOrder({
        externalOrderId: externalOrder._id.toString(),
        tenantId,
      });

      if (processedOrder.status === "PLACED") {
        ApiResponseHandler.success(res, 201, "Mock Swiggy order placed successfully", processedOrder);
      } else if (
        processedOrder.status === "MAPPING_REVIEW_REQUIRED" ||
        processedOrder.status === "FAILED_VALIDATION"
      ) {
        res.status(200).json({
          success: true,
          processingStatus: processedOrder.status,
          externalOrderId: processedOrder.externalOrderId,
          reason: processedOrder.failureReason || "Mapping review or validation required",
          data: {
            _id: processedOrder._id.toString(),
            status: processedOrder.status
          }
        });
      } else {
        ApiResponseHandler.badRequest(res, `Mock Swiggy order ingestion failed with status: ${processedOrder.status}. Reason: ${processedOrder.failureReason}`, processedOrder);
      }
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || "Failed to receive mock Swiggy order");
    }
  }

  /**
   * Receive Mock Zomato Order Callback
   * POST /api/v1/integrations/mock/zomato/orders
   */
  static async receiveMockZomatoOrder(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req.query.tenantId as string) || (req.headers["x-tenant-id"] as string);
      if (!tenantId || !Types.ObjectId.isValid(tenantId)) {
        ApiResponseHandler.badRequest(res, "A valid tenantId query param or x-tenant-id header is required");
        return;
      }

      // Check subscription apiAccess
      const subscription = await SubscriptionRepository.findSubscriptionByTenant(tenantId);
      if (!subscription) {
        ApiResponseHandler.forbidden(res, "No active subscription found. Please onboard.");
        return;
      }
      const plan = subscription.planId as any;
      if (!plan || !plan.features?.apiAccess) {
        ApiResponseHandler.forbidden(res, "Integration API access is not enabled on your plan. Please upgrade to Super.");
        return;
      }

      const payload = req.body;
      const externalOrderId = payload.orderId;
      if (!externalOrderId) {
        ApiResponseHandler.badRequest(res, "Missing orderId in payload");
        return;
      }

      // 1. Ingest order
      const { externalOrder } = await OrderGatewayService.ingestExternalOrder({
        tenantId,
        provider: IntegrationProvider.MOCK_ZOMATO,
        externalOrderId: String(externalOrderId),
        rawPayload: payload,
        outletId: payload.outletCode && Types.ObjectId.isValid(payload.outletCode) ? payload.outletCode : undefined,
      });

      // 2. Process/normalize order synchronously for immediate test feedback
      const processedOrder = await OrderGatewayService.processExternalOrder({
        externalOrderId: externalOrder._id.toString(),
        tenantId,
      });

      if (processedOrder.status === "PLACED") {
        ApiResponseHandler.success(res, 201, "Mock Zomato order placed successfully", processedOrder);
      } else if (
        processedOrder.status === "MAPPING_REVIEW_REQUIRED" ||
        processedOrder.status === "FAILED_VALIDATION"
      ) {
        res.status(200).json({
          success: true,
          processingStatus: processedOrder.status,
          externalOrderId: processedOrder.externalOrderId,
          reason: processedOrder.failureReason || "Mapping review or validation required",
          data: {
            _id: processedOrder._id.toString(),
            status: processedOrder.status
          }
        });
      } else {
        ApiResponseHandler.badRequest(res, `Mock Zomato order ingestion failed with status: ${processedOrder.status}. Reason: ${processedOrder.failureReason}`, processedOrder);
      }
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || "Failed to receive mock Zomato order");
    }
  }

  /**
   * Replay/reprocess an existing external order
   * POST /api/v1/integrations/external-orders/:id/replay
   */
  static async replayOrder(req: Request, res: Response): Promise<void> {
    try {
      const tenantIdRaw = req.query.tenantId || req.headers["x-tenant-id"] || req.user?.tenantId;
      const tenantId = Array.isArray(tenantIdRaw) ? String(tenantIdRaw[0]) : String(tenantIdRaw || "");
      if (!tenantId || !Types.ObjectId.isValid(tenantId)) {
        ApiResponseHandler.badRequest(res, "A valid tenantId query param, header, or user session is required");
        return;
      }

      const externalOrderIdRaw = req.params.id;
      const externalOrderId = Array.isArray(externalOrderIdRaw) ? String(externalOrderIdRaw[0]) : String(externalOrderIdRaw || "");
      if (!externalOrderId || !Types.ObjectId.isValid(externalOrderId)) {
        ApiResponseHandler.badRequest(res, "A valid external order id parameter is required");
        return;
      }

      const processedOrder = await OrderGatewayService.replayExternalOrder(
        externalOrderId,
        tenantId,
        req.user?.userId
      );

      if (processedOrder.status === "PLACED") {
        ApiResponseHandler.success(res, 200, "Order replayed and placed successfully", processedOrder);
      } else {
        ApiResponseHandler.badRequest(res, `Order replay completed but did not place successfully. Status: ${processedOrder.status}. Reason: ${processedOrder.failureReason}`, processedOrder);
      }
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || "Failed to replay external order");
    }
  }

  /**
   * Mappings Health metrics
   * GET /api/v1/integrations/mappings/health
   */
  static async getMappingsHealth(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req.query.tenantId as string) || (req.headers["x-tenant-id"] as string) || req.user?.tenantId;
      if (!tenantId || !Types.ObjectId.isValid(tenantId)) {
        ApiResponseHandler.badRequest(res, "A valid tenantId query param, header, or user session is required");
        return;
      }

      const tenantObjectId = new Types.ObjectId(tenantId);

      // 1. Menu Items Health
      const totalMenuItems = await MenuItem.countDocuments({ tenantId: tenantObjectId, isDeleted: false });
      const mappedMenuItems = await ChannelMenuItemMapping.distinct("menuItemId", {
        tenantId: tenantObjectId,
        isActive: true,
        isDeleted: false,
      });

      // 2. Outlets Health
      const totalOutlets = await Outlet.countDocuments({ tenantId: tenantObjectId, isDeleted: false });
      const mappedOutlets = await ChannelOutletMapping.distinct("outletId", {
        tenantId: tenantObjectId,
        isActive: true,
        isDeleted: false,
      });

      ApiResponseHandler.success(res, 200, "Mappings health retrieved successfully", {
        menuItems: {
          total: totalMenuItems,
          mapped: mappedMenuItems.length,
          unmapped: Math.max(0, totalMenuItems - mappedMenuItems.length),
          percentage: totalMenuItems > 0 ? Math.round((mappedMenuItems.length / totalMenuItems) * 100) : 0,
        },
        outlets: {
          total: totalOutlets,
          mapped: mappedOutlets.length,
          unmapped: Math.max(0, totalOutlets - mappedOutlets.length),
          percentage: totalOutlets > 0 ? Math.round((mappedOutlets.length / totalOutlets) * 100) : 0,
        },
      });
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || "Failed to get mappings health");
    }
  }

  /**
   * Get unmapped menu items list
   * GET /api/v1/integrations/mappings/unmapped
   */
  static async getUnmappedItems(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req.query.tenantId as string) || (req.headers["x-tenant-id"] as string) || req.user?.tenantId;
      if (!tenantId || !Types.ObjectId.isValid(tenantId)) {
        ApiResponseHandler.badRequest(res, "A valid tenantId query param, header, or user session is required");
        return;
      }

      const provider = (req.query.provider as string || "MOCK_SWIGGY").toUpperCase();

      const tenantObjectId = new Types.ObjectId(tenantId);

      // Fetch all menu items
      const allMenuItems = await MenuItem.find({ tenantId: tenantObjectId, isDeleted: false }).select("name sku price");

      // Fetch all mapped menuItemIds for this provider
      const mappedItemIds = await ChannelMenuItemMapping.distinct("menuItemId", {
        tenantId: tenantObjectId,
        provider,
        isActive: true,
        isDeleted: false,
      });

      const mappedIdsSet = new Set(mappedItemIds.map(id => id.toString()));

      // Filter unmapped
      const unmappedItems = allMenuItems.filter(item => !mappedIdsSet.has((item._id as Types.ObjectId).toString()));

      ApiResponseHandler.success(res, 200, `Unmapped items for provider ${provider} retrieved successfully`, {
        provider,
        totalUnmapped: unmappedItems.length,
        items: unmappedItems,
      });
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || "Failed to retrieve unmapped items");
    }
  }

  /**
   * List external orders for a tenant
   * GET /api/v1/integrations/external-orders
   */
  static async getExternalOrders(req: Request, res: Response): Promise<void> {
    try {
      const tenantIdRaw = req.query.tenantId || req.headers["x-tenant-id"] || req.user?.tenantId;
      const tenantId = Array.isArray(tenantIdRaw) ? String(tenantIdRaw[0]) : String(tenantIdRaw || "");
      if (!tenantId || !Types.ObjectId.isValid(tenantId)) {
        ApiResponseHandler.badRequest(res, "A valid tenantId query param, header, or user session is required");
        return;
      }

      const status = req.query.status as string;
      const provider = req.query.provider as string;
      const limit = Number(req.query.limit || 50);

      const query: any = {
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      };

      if (status) {
        query.status = status;
      }
      if (provider) {
        query.provider = provider;
      }

      const orders = await ExternalOrder.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate("outletId", "name code");

      ApiResponseHandler.success(res, 200, "External orders retrieved successfully", orders);
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || "Failed to retrieve external orders");
    }
  }

  /**
   * Get outbox event queue stats/metrics
   * GET /api/v1/integrations/stats
   */
  static async getIntegrationStats(req: Request, res: Response): Promise<void> {
    try {
      const tenantIdRaw = req.query.tenantId || req.headers["x-tenant-id"] || req.user?.tenantId;
      const tenantId = Array.isArray(tenantIdRaw) ? String(tenantIdRaw[0]) : String(tenantIdRaw || "");
      if (!tenantId || !Types.ObjectId.isValid(tenantId)) {
        ApiResponseHandler.badRequest(res, "A valid tenantId is required");
        return;
      }

      const tenantObjectId = new Types.ObjectId(tenantId);

      // Aggregate counts by status and average processing times
      const queueStats = await IntegrationEventQueue.aggregate([
        { $match: { tenantId: tenantObjectId } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            avgProcessingTime: {
              $avg: {
                $cond: [
                  { $and: [{ $not: [{ $eq: ["$processedAt", null] }] }, { $not: [{ $eq: ["$startedAt", null] }] }] },
                  { $subtract: ["$processedAt", "$startedAt"] },
                  null
                ]
              }
            },
            avgQueueTime: {
              $avg: {
                $cond: [
                  { $not: [{ $eq: ["$startedAt", null] }] },
                  { $subtract: ["$startedAt", "$queuedAt"] },
                  null
                ]
              }
            }
          }
        }
      ]);

      const counts = {
        PENDING: 0,
        PROCESSING: 0,
        SUCCESS: 0,
        FAILED: 0,
        DLQ: 0,
      };
      
      let totalProcessingTime = 0;
      let totalQueueTime = 0;
      let successCount = 0;
      let startedCount = 0;

      queueStats.forEach((stat) => {
        if (stat._id in counts) {
          counts[stat._id as keyof typeof counts] = stat.count;
        }
        if (stat._id === "SUCCESS" && stat.avgProcessingTime) {
          totalProcessingTime = stat.avgProcessingTime;
          successCount = stat.count;
        }
        if (stat.avgQueueTime) {
          totalQueueTime += stat.avgQueueTime * stat.count;
          startedCount += stat.count;
        }
      });

      // Get last processed timestamp
      const lastProcessed = await IntegrationEventQueue.findOne({
        tenantId: tenantObjectId,
        status: "SUCCESS"
      })
        .sort({ processedAt: -1 })
        .select("processedAt");

      // Get provider health/states
      const providerStates = await ProviderSyncState.find({ tenantId: tenantObjectId });

      ApiResponseHandler.success(res, 200, "Integration stats retrieved successfully", {
        queue: counts,
        avgProcessingDurationMs: successCount > 0 ? Math.round(totalProcessingTime) : 0,
        avgQueueWaitDurationMs: startedCount > 0 ? Math.round(totalQueueTime / startedCount) : 0,
        lastProcessedAt: lastProcessed?.processedAt || null,
        providerStates,
      });
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || "Failed to retrieve integration stats");
    }
  }

  /**
   * Get operational events outbox queue logs
   * GET /api/v1/integrations/events
   */
  static async getIntegrationEvents(req: Request, res: Response): Promise<void> {
    try {
      const tenantIdRaw = req.query.tenantId || req.headers["x-tenant-id"] || req.user?.tenantId;
      const tenantId = Array.isArray(tenantIdRaw) ? String(tenantIdRaw[0]) : String(tenantIdRaw || "");
      if (!tenantId || !Types.ObjectId.isValid(tenantId)) {
        ApiResponseHandler.badRequest(res, "A valid tenantId is required");
        return;
      }

      const { status, eventType, provider, correlationId, from, to } = req.query;
      const limit = Number(req.query.limit || 50);
      const skip = Number(req.query.skip || 0);

      const query: any = {
        tenantId: new Types.ObjectId(tenantId),
      };

      if (status) query.status = status;
      if (eventType) query.eventType = eventType;
      if (provider) query.sourceSystem = provider; // Map provider filter to sourceSystem
      if (correlationId) query.correlationId = correlationId;

      if (from || to) {
        query.queuedAt = {};
        if (from) query.queuedAt.$gte = new Date(from as string);
        if (to) query.queuedAt.$lte = new Date(to as string);
      }

      const [events, total] = await Promise.all([
        IntegrationEventQueue.find(query)
          .sort({ queuedAt: -1 })
          .skip(skip)
          .limit(limit),
        IntegrationEventQueue.countDocuments(query),
      ]);

      ApiResponseHandler.success(res, 200, "Integration events retrieved successfully", {
        events,
        total,
        limit,
        skip,
      });
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || "Failed to retrieve integration events");
    }
  }

  /**
   * Get outbound sync jobs trace
   * GET /api/v1/integrations/sync-jobs
   */
  static async getSyncJobs(req: Request, res: Response): Promise<void> {
    try {
      const tenantIdRaw = req.query.tenantId || req.headers["x-tenant-id"] || req.user?.tenantId;
      const tenantId = Array.isArray(tenantIdRaw) ? String(tenantIdRaw[0]) : String(tenantIdRaw || "");
      if (!tenantId || !Types.ObjectId.isValid(tenantId)) {
        ApiResponseHandler.badRequest(res, "A valid tenantId is required");
        return;
      }

      const { provider, status, type, correlationId, from, to } = req.query;
      const limit = Number(req.query.limit || 50);
      const skip = Number(req.query.skip || 0);

      const query: any = {
        tenantId: new Types.ObjectId(tenantId),
      };

      if (provider) query.provider = provider;
      if (status) query.status = status;
      if (type) query.type = type;
      if (correlationId) query.correlationId = correlationId;

      if (from || to) {
        query.createdAt = {};
        if (from) query.createdAt.$gte = new Date(from as string);
        if (to) query.createdAt.$lte = new Date(to as string);
      }

      const [syncJobs, total] = await Promise.all([
        SyncJob.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        SyncJob.countDocuments(query),
      ]);

      ApiResponseHandler.success(res, 200, "Sync jobs retrieved successfully", {
        syncJobs,
        total,
        limit,
        skip,
      });
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || "Failed to retrieve sync jobs");
    }
  }

  /**
   * Replay an integration event: reset state and trigger manual poller processing
   * POST /api/v1/integrations/events/:id/replay
   */
  static async replayEvent(req: Request, res: Response): Promise<void> {
    try {
      const tenantIdRaw = req.query.tenantId || req.headers["x-tenant-id"] || req.user?.tenantId;
      const tenantId = Array.isArray(tenantIdRaw) ? String(tenantIdRaw[0]) : String(tenantIdRaw || "");
      if (!tenantId || !Types.ObjectId.isValid(tenantId)) {
        ApiResponseHandler.badRequest(res, "A valid tenantId is required");
        return;
      }

      const eventIdRaw = req.params.id;
      const eventId = Array.isArray(eventIdRaw) ? String(eventIdRaw[0]) : String(eventIdRaw || "");
      if (!eventId || !Types.ObjectId.isValid(eventId)) {
        ApiResponseHandler.badRequest(res, "A valid event ID is required");
        return;
      }

      const event = await IntegrationEventQueue.findOne({
        _id: new Types.ObjectId(eventId),
        tenantId: new Types.ObjectId(tenantId),
      });

      if (!event) {
        ApiResponseHandler.notFound(res, "Integration event not found");
        return;
      }

      // Reset outbox event queue state to trigger recovery/poller
      event.status = "PENDING";
      event.retryCount = 0;
      event.nextRetryAt = null;
      event.failureReason = null;
      event.startedAt = null;
      event.processedAt = null;
      event.processingNodeId = null;
      event.processingStartedAt = null;

      const updatedEvent = await event.save();

      // Trigger the poller run synchronously so the user/UI gets immediate feedback
      await OutboxPollerService.triggerManualRun();

      ApiResponseHandler.success(res, 200, "Integration event replayed and processing triggered", updatedEvent);
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || "Failed to replay integration event");
    }
  }

}
