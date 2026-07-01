import { Types } from "mongoose";
import { OrderGatewayService } from "../services/ordergateway.service.js";
import { IntegrationProvider } from "../types/integration.type.js";
import { ApiResponseHandler } from "../utils/response.handler.js";
import MenuItem from "../models/menuitems.model.js";
import Outlet from "../models/outlet.model.js";
import Category from "../models/category.model.js";
import Variant from "../models/variant.model.js";
import Addon from "../models/addon.model.js";
import Inventory from "../models/inventory.model.js";
import ChannelMenuItemMapping from "../models/channelmenuitemmapping.model.js";
import ChannelOutletMapping from "../models/channeloutletmapping.model.js";
import ChannelVariantMapping from "../models/channelvariantmapping.model.js";
import ChannelAddonMapping from "../models/channeladdonmapping.model.js";
import Order from "../models/order.model.js";
import ExternalOrder from "../models/externalorder.model.js";
import OrderTimeline from "../models/ordertimeline.model.js";
import Restaurant from "../models/restaurant.model.js";
import Tenant from "../models/tenant.model.js";
import IntegrationEventQueue from "../models/integration-event-queue.model.js";
import ProviderSyncState from "../models/providersyncstate.model.js";
import SyncJob from "../models/syncjob.model.js";
import { OutboxPollerService } from "../services/outbox-poller.service.js";
import { SimulatorService } from "../services/simulator.service.js";
import { SimulationMetricsService } from "../services/simulation-metrics.service.js";
import SimulationLog from "../models/simulationlog.model.js";
import SimulationSession from "../models/simulationsession.model.js";
export class IntegrationController {
    /**
     * Receive Mock Swiggy Order Callback
     * POST /api/v1/integrations/mock/swiggy/orders
     */
    static async receiveMockSwiggyOrder(req, res) {
        try {
            const tenantId = req.query.tenantId || req.headers["x-tenant-id"];
            if (!tenantId || !Types.ObjectId.isValid(tenantId)) {
                ApiResponseHandler.badRequest(res, "A valid tenantId query param or x-tenant-id header is required");
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
            }
            else if (processedOrder.status === "MAPPING_REVIEW_REQUIRED" ||
                processedOrder.status === "FAILED_VALIDATION") {
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
            }
            else {
                ApiResponseHandler.badRequest(res, `Mock Swiggy order ingestion failed with status: ${processedOrder.status}. Reason: ${processedOrder.failureReason}`, processedOrder);
            }
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || "Failed to receive mock Swiggy order");
        }
    }
    /**
     * Receive Mock Zomato Order Callback
     * POST /api/v1/integrations/mock/zomato/orders
     */
    static async receiveMockZomatoOrder(req, res) {
        try {
            const tenantId = req.query.tenantId || req.headers["x-tenant-id"];
            if (!tenantId || !Types.ObjectId.isValid(tenantId)) {
                ApiResponseHandler.badRequest(res, "A valid tenantId query param or x-tenant-id header is required");
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
            }
            else if (processedOrder.status === "MAPPING_REVIEW_REQUIRED" ||
                processedOrder.status === "FAILED_VALIDATION") {
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
            }
            else {
                ApiResponseHandler.badRequest(res, `Mock Zomato order ingestion failed with status: ${processedOrder.status}. Reason: ${processedOrder.failureReason}`, processedOrder);
            }
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || "Failed to receive mock Zomato order");
        }
    }
    /**
     * Replay/reprocess an existing external order
     * POST /api/v1/integrations/external-orders/:id/replay
     */
    static async replayOrder(req, res) {
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
            const processedOrder = await OrderGatewayService.replayExternalOrder(externalOrderId, tenantId, req.user?.userId);
            if (processedOrder.status === "PLACED") {
                ApiResponseHandler.success(res, 200, "Order replayed and placed successfully", processedOrder);
            }
            else {
                ApiResponseHandler.badRequest(res, `Order replay completed but did not place successfully. Status: ${processedOrder.status}. Reason: ${processedOrder.failureReason}`, processedOrder);
            }
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || "Failed to replay external order");
        }
    }
    /**
     * Mappings Health metrics
     * GET /api/v1/integrations/mappings/health
     */
    static async getMappingsHealth(req, res) {
        try {
            const tenantId = req.query.tenantId || req.headers["x-tenant-id"] || req.user?.tenantId;
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
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || "Failed to get mappings health");
        }
    }
    /**
     * Get unmapped menu items list
     * GET /api/v1/integrations/mappings/unmapped
     */
    static async getUnmappedItems(req, res) {
        try {
            const tenantId = req.query.tenantId || req.headers["x-tenant-id"] || req.user?.tenantId;
            if (!tenantId || !Types.ObjectId.isValid(tenantId)) {
                ApiResponseHandler.badRequest(res, "A valid tenantId query param, header, or user session is required");
                return;
            }
            const provider = (req.query.provider || "MOCK_SWIGGY").toUpperCase();
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
            const unmappedItems = allMenuItems.filter(item => !mappedIdsSet.has(item._id.toString()));
            ApiResponseHandler.success(res, 200, `Unmapped items for provider ${provider} retrieved successfully`, {
                provider,
                totalUnmapped: unmappedItems.length,
                items: unmappedItems,
            });
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || "Failed to retrieve unmapped items");
        }
    }
    /**
     * List external orders for a tenant
     * GET /api/v1/integrations/external-orders
     */
    static async getExternalOrders(req, res) {
        try {
            const tenantIdRaw = req.query.tenantId || req.headers["x-tenant-id"] || req.user?.tenantId;
            const tenantId = Array.isArray(tenantIdRaw) ? String(tenantIdRaw[0]) : String(tenantIdRaw || "");
            if (!tenantId || !Types.ObjectId.isValid(tenantId)) {
                ApiResponseHandler.badRequest(res, "A valid tenantId query param, header, or user session is required");
                return;
            }
            const status = req.query.status;
            const provider = req.query.provider;
            const limit = Number(req.query.limit || 50);
            const query = {
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
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || "Failed to retrieve external orders");
        }
    }
    /**
     * Get outbox event queue stats/metrics
     * GET /api/v1/integrations/stats
     */
    static async getIntegrationStats(req, res) {
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
                    counts[stat._id] = stat.count;
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
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || "Failed to retrieve integration stats");
        }
    }
    /**
     * Get operational events outbox queue logs
     * GET /api/v1/integrations/events
     */
    static async getIntegrationEvents(req, res) {
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
            const query = {
                tenantId: new Types.ObjectId(tenantId),
            };
            if (status)
                query.status = status;
            if (eventType)
                query.eventType = eventType;
            if (provider)
                query.sourceSystem = provider; // Map provider filter to sourceSystem
            if (correlationId)
                query.correlationId = correlationId;
            if (from || to) {
                query.queuedAt = {};
                if (from)
                    query.queuedAt.$gte = new Date(from);
                if (to)
                    query.queuedAt.$lte = new Date(to);
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
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || "Failed to retrieve integration events");
        }
    }
    /**
     * Get outbound sync jobs trace
     * GET /api/v1/integrations/sync-jobs
     */
    static async getSyncJobs(req, res) {
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
            const query = {
                tenantId: new Types.ObjectId(tenantId),
            };
            if (provider)
                query.provider = provider;
            if (status)
                query.status = status;
            if (type)
                query.type = type;
            if (correlationId)
                query.correlationId = correlationId;
            if (from || to) {
                query.createdAt = {};
                if (from)
                    query.createdAt.$gte = new Date(from);
                if (to)
                    query.createdAt.$lte = new Date(to);
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
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || "Failed to retrieve sync jobs");
        }
    }
    /**
     * Replay an integration event: reset state and trigger manual poller processing
     * POST /api/v1/integrations/events/:id/replay
     */
    static async replayEvent(req, res) {
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
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || "Failed to replay integration event");
        }
    }
    /**
     * GET /api/v1/integrations/dev/config
     */
    static async getDevConfig(req, res) {
        try {
            const tenantId = req.user?.tenantId;
            if (!tenantId) {
                ApiResponseHandler.unauthorized(res, "User not authenticated or tenantId not found");
                return;
            }
            const tenant = await Tenant.findById(tenantId);
            const restaurant = await Restaurant.findOne({ tenantId });
            const outlets = await Outlet.find({ tenantId, isDeleted: false });
            // Catalog counts
            const [realCategories, sandboxCategories, realItems, sandboxItems, realVariants, sandboxVariants, realAddons, sandboxAddons, realInventory, sandboxInventory] = await Promise.all([
                Category.countDocuments({ tenantId, isSandbox: false, isDeleted: false }),
                Category.countDocuments({ tenantId, isSandbox: true, isDeleted: false }),
                MenuItem.countDocuments({ tenantId, isSandbox: false, isDeleted: false }),
                MenuItem.countDocuments({ tenantId, isSandbox: true, isDeleted: false }),
                Variant.countDocuments({ tenantId, isSandbox: false, isDeleted: false }),
                Variant.countDocuments({ tenantId, isSandbox: true, isDeleted: false }),
                Addon.countDocuments({ tenantId, isSandbox: false, isDeleted: false }),
                Addon.countDocuments({ tenantId, isSandbox: true, isDeleted: false }),
                Inventory.countDocuments({ tenantId, isSandbox: false, isDeleted: false }),
                Inventory.countDocuments({ tenantId, isSandbox: true, isDeleted: false })
            ]);
            const mappingsQuery = { tenantId, isDeleted: false };
            const parsedOutletId = req.query.outletId;
            if (parsedOutletId && Types.ObjectId.isValid(parsedOutletId)) {
                mappingsQuery.outletId = new Types.ObjectId(parsedOutletId);
            }
            // Mappings
            const [outletMappings, itemMappings, variantMappings, addonMappings] = await Promise.all([
                ChannelOutletMapping.find({ tenantId, isDeleted: false }),
                ChannelMenuItemMapping.find(mappingsQuery)
                    .populate('menuItemId', 'name price sku'),
                ChannelVariantMapping.find(mappingsQuery)
                    .populate('variantId', 'name price')
                    .populate('menuItemId', 'name'),
                ChannelAddonMapping.find(mappingsQuery)
                    .populate('addonId', 'name price')
                    .populate('menuItemId', 'name')
            ]);
            // Dynamic providers from AdapterRegistry
            const integrationProviders = OrderGatewayService.getRegisteredProviders
                ? OrderGatewayService.getRegisteredProviders()
                : ["MOCK_SWIGGY", "MOCK_ZOMATO", "QR", "WEBSITE"];
            // Stats
            const [totalOrders, sandboxOrders, totalExternalOrders, sandboxExternalOrders, eventQueueCount, sandboxEventQueueCount, syncJobsCount, sandboxSyncJobsCount] = await Promise.all([
                Order.countDocuments({ tenantId, isDeleted: false }),
                Order.countDocuments({ tenantId, isSandbox: true, isDeleted: false }),
                ExternalOrder.countDocuments({ tenantId, isDeleted: false }),
                ExternalOrder.countDocuments({ tenantId, isSandbox: true, isDeleted: false }),
                IntegrationEventQueue.countDocuments({ tenantId }),
                IntegrationEventQueue.countDocuments({ tenantId, isSandbox: true }),
                SyncJob.countDocuments({ tenantId }),
                SyncJob.countDocuments({ tenantId, isSandbox: true })
            ]);
            // Average processing time
            const avgProcess = await IntegrationEventQueue.aggregate([
                { $match: { tenantId: new Types.ObjectId(tenantId), status: "SUCCESS", processedAt: { $ne: null }, startedAt: { $ne: null } } },
                { $group: { _id: null, avgTime: { $avg: { $subtract: ["$processedAt", "$startedAt"] } } } }
            ]);
            const avgProcessingTimeMs = avgProcess.length > 0 ? Math.round(avgProcess[0].avgTime) : 0;
            // Last processed event
            const lastProcessedEvent = await IntegrationEventQueue.findOne({ tenantId, status: "SUCCESS" })
                .sort({ processedAt: -1 })
                .select("processedAt eventType");
            // DLQ entries
            const dlqCount = await IntegrationEventQueue.countDocuments({ tenantId, status: "DLQ" });
            // Circuit Breakers / Outbox state
            const outboxPollerActive = OutboxPollerService.isActive();
            // Webhook URLs
            const webhooks = {
                swiggy: `http://localhost:5000/api/v1/integrations/mock/swiggy/orders?tenantId=${tenantId}`,
                zomato: `http://localhost:5000/api/v1/integrations/mock/zomato/orders?tenantId=${tenantId}`,
                qr: `http://localhost:5000/api/v1/integrations/mock/qr/orders?tenantId=${tenantId}`,
                website: `http://localhost:5000/api/v1/integrations/mock/website/orders?tenantId=${tenantId}`
            };
            // Resolve dynamic n8n payloads
            const swgMapping = await ChannelMenuItemMapping.findOne({ tenantId, provider: "MOCK_SWIGGY", isActive: true, isDeleted: false });
            const zmtMapping = await ChannelMenuItemMapping.findOne({ tenantId, provider: "MOCK_ZOMATO", isActive: true, isDeleted: false });
            let dynamicSwgItemId = "1001";
            let dynamicSwgVarId = "V201";
            let dynamicZmtItemId = "2002";
            let dynamicZmtAddonId = "A402";
            if (swgMapping) {
                dynamicSwgItemId = swgMapping.externalItemId;
                const vMap = await ChannelVariantMapping.findOne({ tenantId, provider: "MOCK_SWIGGY", menuItemId: swgMapping.menuItemId, isDeleted: false });
                if (vMap) {
                    dynamicSwgVarId = vMap.externalVariantId;
                }
            }
            if (zmtMapping) {
                dynamicZmtItemId = zmtMapping.externalItemId;
                const aMap = await ChannelAddonMapping.findOne({ tenantId, provider: "MOCK_ZOMATO", menuItemId: zmtMapping.menuItemId, isDeleted: false });
                if (aMap) {
                    dynamicZmtAddonId = aMap.externalAddonId;
                }
            }
            const extOutletId = "6a3c17666bb70afe757e4a91";
            const dynamicN8nPayloads = {
                swiggy: {
                    url: `http://localhost:5000/api/v1/integrations/mock/swiggy/orders?tenantId=${tenantId}`,
                    payload: {
                        order_id: `SWIGGY-MOCK-${Math.floor(1000 + Math.random() * 9000)}`,
                        outlet_id: extOutletId,
                        customer: {
                            name: "Karan Malhotra",
                            phone: "9876543288"
                        },
                        items: [
                            {
                                item_id: dynamicSwgItemId,
                                name: "Veg Burger",
                                quantity: 2,
                                price: 180,
                                ...(dynamicSwgVarId && { variant_id: dynamicSwgVarId })
                            }
                        ],
                        pricing: {
                            subtotal: 360,
                            total_amount: 360
                        }
                    }
                },
                zomato: {
                    url: `http://localhost:5000/api/v1/integrations/mock/zomato/orders?tenantId=${tenantId}`,
                    payload: {
                        orderId: `ZOMATO-MOCK-${Math.floor(1000 + Math.random() * 9000)}`,
                        outletCode: extOutletId,
                        customerDetails: {
                            customerName: "Rohan Sharma",
                            customerPhone: "9876543299"
                        },
                        cart: {
                            items: [
                                {
                                    itemId: dynamicZmtItemId,
                                    title: "Cheese Veg Pizza",
                                    qty: 1,
                                    rate: 250,
                                    extraAddons: dynamicZmtAddonId ? [
                                        {
                                            addonCode: dynamicZmtAddonId,
                                            title: "Extra Jalapenos",
                                            charge: 30
                                        }
                                    ] : []
                                }
                            ]
                        },
                        billDetails: {
                            itemSubTotal: 250,
                            totalBill: dynamicZmtAddonId ? 280 : 250
                        }
                    }
                }
            };
            ApiResponseHandler.success(res, 200, "Developer sandbox configuration retrieved", {
                tenant,
                restaurant,
                outlets,
                catalog: {
                    categories: { real: realCategories, sandbox: sandboxCategories },
                    menuItems: { real: realItems, sandbox: sandboxItems },
                    variants: { real: realVariants, sandbox: sandboxVariants },
                    addons: { real: realAddons, sandbox: sandboxAddons },
                    inventory: { real: realInventory, sandbox: sandboxInventory }
                },
                mappings: {
                    outlets: outletMappings,
                    menuItems: itemMappings,
                    variants: variantMappings,
                    addons: addonMappings
                },
                providers: integrationProviders,
                webhooks,
                dynamicN8nPayloads,
                stats: {
                    orders: { total: totalOrders, sandbox: sandboxOrders },
                    externalOrders: { total: totalExternalOrders, sandbox: sandboxExternalOrders },
                    eventQueue: { total: eventQueueCount, sandbox: sandboxEventQueueCount },
                    syncJobs: { total: syncJobsCount, sandbox: sandboxSyncJobsCount },
                    dlqCount,
                    avgProcessingTimeMs,
                    lastProcessedEvent: lastProcessedEvent ? { type: lastProcessedEvent.eventType, time: lastProcessedEvent.processedAt } : null,
                    outboxPollerActive
                }
            });
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || "Failed to retrieve developer configuration");
        }
    }
    /**
     * POST /api/v1/integrations/dev/load-demo-catalog
     */
    static async loadDemoCatalog(req, res) {
        try {
            const tenantId = req.user?.tenantId;
            if (!tenantId) {
                ApiResponseHandler.unauthorized(res, "User not authenticated or tenantId not found");
                return;
            }
            const { outletId } = req.body;
            if (!outletId || !Types.ObjectId.isValid(outletId)) {
                ApiResponseHandler.badRequest(res, "A valid outletId is required to target catalog seeding");
                return;
            }
            const tenantObjectId = new Types.ObjectId(tenantId);
            const outletObjectId = new Types.ObjectId(outletId);
            const outlet = await Outlet.findOne({ _id: outletObjectId, tenantId: tenantObjectId });
            if (!outlet) {
                ApiResponseHandler.notFound(res, "Target outlet not found under this tenant");
                return;
            }
            const categoriesSeed = [
                { name: "Burgers", displayOrder: 1 },
                { name: "Pizza", displayOrder: 2 },
                { name: "Wraps", displayOrder: 3 },
                { name: "Sandwiches", displayOrder: 4 },
                { name: "Fries", displayOrder: 5 },
                { name: "Beverages", displayOrder: 6 },
                { name: "Desserts", displayOrder: 7 },
                { name: "Combos", displayOrder: 8 }
            ];
            const categoryIdMap = {};
            for (const cat of categoriesSeed) {
                let categoryDoc = await Category.findOne({
                    tenantId: tenantObjectId,
                    outletId: outletObjectId,
                    name: cat.name,
                    isDeleted: false
                });
                if (!categoryDoc) {
                    categoryDoc = await Category.create({
                        tenantId: tenantObjectId,
                        outletId: outletObjectId,
                        name: cat.name,
                        displayOrder: cat.displayOrder,
                        isActive: true,
                        isSandbox: true,
                        sandboxVersion: "v1"
                    });
                }
                categoryIdMap[cat.name] = categoryDoc._id;
            }
            const itemsList = [
                // BURGERS
                { name: "Classic Veg Burger", cat: "Burgers", price: 120, isVeg: true, sku: "SANDBOX-ITEM-001" },
                { name: "Double Cheese Burger", cat: "Burgers", price: 160, isVeg: true, sku: "SANDBOX-ITEM-002" },
                { name: "Spicy Chicken Burger", cat: "Burgers", price: 180, isVeg: false, sku: "SANDBOX-ITEM-003" },
                { name: "Crispy Aloo Tikki Burger", cat: "Burgers", price: 90, isVeg: true, sku: "SANDBOX-ITEM-004" },
                { name: "Paneer Tikka Burger", cat: "Burgers", price: 150, isVeg: true, sku: "SANDBOX-ITEM-005" },
                { name: "Mushroom Swiss Burger", cat: "Burgers", price: 170, isVeg: true, sku: "SANDBOX-ITEM-006" },
                { name: "BBQ Bacon Burger", cat: "Burgers", price: 210, isVeg: false, sku: "SANDBOX-ITEM-007" },
                // PIZZA
                { name: "Margherita Pizza", cat: "Pizza", price: 200, isVeg: true, sku: "SANDBOX-ITEM-008" },
                { name: "Cheese Veg Pizza", cat: "Pizza", price: 250, isVeg: true, sku: "SANDBOX-ITEM-009" },
                { name: "Spicy Paneer Pizza", cat: "Pizza", price: 280, isVeg: true, sku: "SANDBOX-ITEM-010" },
                { name: "Chicken Pepperoni Pizza", cat: "Pizza", price: 350, isVeg: false, sku: "SANDBOX-ITEM-011" },
                { name: "Garden Delight Pizza", cat: "Pizza", price: 270, isVeg: true, sku: "SANDBOX-ITEM-012" },
                { name: "BBQ Chicken Pizza", cat: "Pizza", price: 330, isVeg: false, sku: "SANDBOX-ITEM-013" },
                { name: "Four Cheese Pizza", cat: "Pizza", price: 310, isVeg: true, sku: "SANDBOX-ITEM-014" },
                // WRAPS
                { name: "Veg Falafel Wrap", cat: "Wraps", price: 120, isVeg: true, sku: "SANDBOX-ITEM-015" },
                { name: "Paneer Tikka Wrap", cat: "Wraps", price: 140, isVeg: true, sku: "SANDBOX-ITEM-016" },
                { name: "Chicken Seekh Wrap", cat: "Wraps", price: 160, isVeg: false, sku: "SANDBOX-ITEM-017" },
                { name: "Egg & Cheese Wrap", cat: "Wraps", price: 110, isVeg: false, sku: "SANDBOX-ITEM-018" },
                { name: "Spicy Potato Wrap", cat: "Wraps", price: 100, isVeg: true, sku: "SANDBOX-ITEM-019" },
                // SANDWICHES
                { name: "Garden Fresh Sandwich", cat: "Sandwiches", price: 90, isVeg: true, sku: "SANDBOX-ITEM-020" },
                { name: "Cheese Corn Grilled Sandwich", cat: "Sandwiches", price: 110, isVeg: true, sku: "SANDBOX-ITEM-021" },
                { name: "Chicken Club Sandwich", cat: "Sandwiches", price: 160, isVeg: false, sku: "SANDBOX-ITEM-022" },
                { name: "Paneer Club Sandwich", cat: "Sandwiches", price: 140, isVeg: true, sku: "SANDBOX-ITEM-023" },
                { name: "Bombay Masala Toast", cat: "Sandwiches", price: 80, isVeg: true, sku: "SANDBOX-ITEM-024" },
                // FRIES
                { name: "Classic Salted Fries", cat: "Fries", price: 90, isVeg: true, sku: "SANDBOX-ITEM-025" },
                { name: "Peri Peri Fries", cat: "Fries", price: 110, isVeg: true, sku: "SANDBOX-ITEM-026" },
                { name: "Cheese Loaded Fries", cat: "Fries", price: 140, isVeg: true, sku: "SANDBOX-ITEM-027" },
                { name: "Sweet Potato Fries", cat: "Fries", price: 120, isVeg: true, sku: "SANDBOX-ITEM-028" },
                // BEVERAGES
                { name: "Cold Coffee", cat: "Beverages", price: 90, isVeg: true, sku: "SANDBOX-ITEM-029" },
                { name: "Mango Shake", cat: "Beverages", price: 100, isVeg: true, sku: "SANDBOX-ITEM-030" },
                { name: "Ice Lemon Tea", cat: "Beverages", price: 80, isVeg: true, sku: "SANDBOX-ITEM-031" },
                { name: "Coca Cola 330ml", cat: "Beverages", price: 40, isVeg: true, sku: "SANDBOX-ITEM-032" },
                { name: "Fresh Lime Soda", cat: "Beverages", price: 70, isVeg: true, sku: "SANDBOX-ITEM-033" },
                { name: "Hot Masala Chai", cat: "Beverages", price: 50, isVeg: true, sku: "SANDBOX-ITEM-034" },
                { name: "Cappuccino", cat: "Beverages", price: 80, isVeg: true, sku: "SANDBOX-ITEM-035" },
                // DESSERTS
                { name: "Chocolate Brownie", cat: "Desserts", price: 130, isVeg: true, sku: "SANDBOX-ITEM-036" },
                { name: "Vanilla Ice Cream", cat: "Desserts", price: 60, isVeg: true, sku: "SANDBOX-ITEM-037" },
                { name: "Red Velvet Pastry", cat: "Desserts", price: 120, isVeg: true, sku: "SANDBOX-ITEM-038" },
                { name: "Choco Lava Cake", cat: "Desserts", price: 110, isVeg: true, sku: "SANDBOX-ITEM-039" },
                { name: "Blueberry Cheesecake", cat: "Desserts", price: 160, isVeg: true, sku: "SANDBOX-ITEM-040" },
                // COMBOS
                { name: "Veg Burger Combo", cat: "Combos", price: 230, isVeg: true, sku: "SANDBOX-ITEM-041" },
                { name: "Chicken Burger Combo", cat: "Combos", price: 280, isVeg: false, sku: "SANDBOX-ITEM-042" },
                { name: "Pizza Party Combo", cat: "Combos", price: 590, isVeg: true, sku: "SANDBOX-ITEM-043" },
                { name: "Sandwich & Chai Combo", cat: "Combos", price: 120, isVeg: true, sku: "SANDBOX-ITEM-044" },
                { name: "Wrap & Soda Combo", cat: "Combos", price: 170, isVeg: true, sku: "SANDBOX-ITEM-045" },
                { name: "Double Pizza Combo", cat: "Combos", price: 490, isVeg: true, sku: "SANDBOX-ITEM-046" },
                { name: "Triple Dessert Combo", cat: "Combos", price: 320, isVeg: true, sku: "SANDBOX-ITEM-047" },
                { name: "Super Burger Meal", cat: "Combos", price: 350, isVeg: false, sku: "SANDBOX-ITEM-048" },
                { name: "Snack Time Combo", cat: "Combos", price: 180, isVeg: true, sku: "SANDBOX-ITEM-049" },
                { name: "Family Feast Combo", cat: "Combos", price: 999, isVeg: false, sku: "SANDBOX-ITEM-050" }
            ];
            let seededItemsCount = 0;
            let seededVariantsCount = 0;
            let seededAddonsCount = 0;
            let seededInventoryCount = 0;
            for (const item of itemsList) {
                let menuItemDoc = await MenuItem.findOne({
                    tenantId: tenantObjectId,
                    outletId: outletObjectId,
                    name: item.name,
                    isDeleted: false
                });
                if (!menuItemDoc) {
                    menuItemDoc = await MenuItem.create({
                        tenantId: tenantObjectId,
                        outletId: outletObjectId,
                        categoryId: categoryIdMap[item.cat],
                        name: item.name,
                        sku: item.sku,
                        price: item.price,
                        isVeg: item.isVeg,
                        isAvailable: true,
                        displayOrder: seededItemsCount,
                        isSandbox: true,
                        sandboxVersion: "v1"
                    });
                }
                seededItemsCount++;
                const isPizza = item.cat === "Pizza";
                const hasVariants = item.cat !== "Combos";
                if (hasVariants) {
                    const variantsToSeed = [
                        { name: "Regular", price: menuItemDoc.price },
                        { name: "Medium", price: menuItemDoc.price + (isPizza ? 100 : 30) },
                        { name: "Large", price: menuItemDoc.price + (isPizza ? 180 : 60) }
                    ];
                    for (const v of variantsToSeed) {
                        let variantDoc = await Variant.findOne({
                            tenantId: tenantObjectId,
                            menuItemId: menuItemDoc._id,
                            name: v.name,
                            isDeleted: false
                        });
                        if (!variantDoc) {
                            variantDoc = await Variant.create({
                                tenantId: tenantObjectId,
                                menuItemId: menuItemDoc._id,
                                name: v.name,
                                price: v.price,
                                isAvailable: true,
                                isSandbox: true,
                                sandboxVersion: "v1"
                            });
                        }
                        seededVariantsCount++;
                    }
                }
                const hasAddons = ["Burgers", "Pizza", "Wraps", "Sandwiches", "Fries"].includes(item.cat);
                if (hasAddons) {
                    const addonsToSeed = [
                        { name: "Extra Cheese", price: 30 },
                        { name: "Extra Patty", price: 50 },
                        { name: "Jalapenos", price: 20 }
                    ];
                    for (const a of addonsToSeed) {
                        let addonDoc = await Addon.findOne({
                            tenantId: tenantObjectId,
                            menuItemId: menuItemDoc._id,
                            name: a.name,
                            isDeleted: false
                        });
                        if (!addonDoc) {
                            addonDoc = await Addon.create({
                                tenantId: tenantObjectId,
                                menuItemId: menuItemDoc._id,
                                name: a.name,
                                price: a.price,
                                isAvailable: true,
                                isSandbox: true,
                                sandboxVersion: "v1"
                            });
                        }
                        seededAddonsCount++;
                    }
                }
                let inventoryDoc = await Inventory.findOne({
                    tenantId: tenantObjectId,
                    outletId: outletObjectId,
                    menuItemId: menuItemDoc._id,
                    isDeleted: false
                });
                if (!inventoryDoc) {
                    inventoryDoc = await Inventory.create({
                        tenantId: tenantObjectId,
                        outletId: outletObjectId,
                        menuItemId: menuItemDoc._id,
                        quantity: 100,
                        threshold: 10,
                        isLowStock: false,
                        isSandbox: true,
                        sandboxVersion: "v1"
                    });
                }
                seededInventoryCount++;
            }
            ApiResponseHandler.success(res, 201, "Demo catalog seeded successfully", {
                categories: Object.keys(categoryIdMap).length,
                menuItems: seededItemsCount,
                variants: seededVariantsCount,
                addons: seededAddonsCount,
                inventory: seededInventoryCount
            });
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || "Failed to load demo catalog");
        }
    }
    /**
     * POST /api/v1/integrations/dev/generate-mappings
     */
    static async generateMappings(req, res) {
        try {
            const tenantId = req.user?.tenantId;
            if (!tenantId) {
                ApiResponseHandler.unauthorized(res, "User not authenticated or tenantId not found");
                return;
            }
            const { outletId } = req.body;
            if (!outletId || !Types.ObjectId.isValid(outletId)) {
                ApiResponseHandler.badRequest(res, "A valid outletId is required");
                return;
            }
            const tenantObjectId = new Types.ObjectId(tenantId);
            const outletObjectId = new Types.ObjectId(outletId);
            const outlet = await Outlet.findOne({ _id: outletObjectId, tenantId: tenantObjectId });
            if (!outlet) {
                ApiResponseHandler.notFound(res, "Outlet not found");
                return;
            }
            const providers = OrderGatewayService.getRegisteredProviders
                ? OrderGatewayService.getRegisteredProviders()
                : ["MOCK_SWIGGY", "MOCK_ZOMATO", "QR", "WEBSITE"];
            const extOutletId = "6a3c17666bb70afe757e4a91";
            // 1. Outlet Mappings
            for (const provider of providers) {
                await ChannelOutletMapping.findOneAndUpdate({ tenantId: tenantObjectId, provider, externalOutletId: extOutletId }, { outletId: outletObjectId, isActive: true, isSandbox: true, sandboxVersion: "v1", isDeleted: false }, { upsert: true, new: true });
            }
            // Fetch all sandbox items
            const items = await MenuItem.find({ tenantId: tenantObjectId, outletId: outletObjectId, isSandbox: true, isDeleted: false }).sort({ sku: 1 });
            let mappedItems = 0;
            let mappedVariants = 0;
            let mappedAddons = 0;
            for (let idx = 0; idx < items.length; idx++) {
                const item = items[idx];
                if (!item)
                    continue;
                const numStr = String(idx + 1).padStart(4, "0");
                for (const provider of providers) {
                    let providerPrefix = "QR";
                    if (provider === "MOCK_SWIGGY")
                        providerPrefix = "SWG";
                    else if (provider === "MOCK_ZOMATO")
                        providerPrefix = "ZMT";
                    else if (provider === "WEBSITE")
                        providerPrefix = "WEB";
                    const extItemId = `${providerPrefix}_ITEM_${numStr}`;
                    // MenuItem Mapping
                    await ChannelMenuItemMapping.findOneAndUpdate({ tenantId: tenantObjectId, outletId: outletObjectId, provider, externalItemId: extItemId }, { menuItemId: item._id, isActive: true, isSandbox: true, sandboxVersion: "v1", isDeleted: false }, { upsert: true, new: true });
                    mappedItems++;
                }
                // Fetch variants
                const variants = await Variant.find({ tenantId: tenantObjectId, menuItemId: item._id, isSandbox: true, isDeleted: false }).sort({ name: 1 });
                for (let vIdx = 0; vIdx < variants.length; vIdx++) {
                    const v = variants[vIdx];
                    if (!v)
                        continue;
                    const vNumStr = `${numStr}_${vIdx + 1}`;
                    for (const provider of providers) {
                        let providerPrefix = "QR";
                        if (provider === "MOCK_SWIGGY")
                            providerPrefix = "SWG";
                        else if (provider === "MOCK_ZOMATO")
                            providerPrefix = "ZMT";
                        else if (provider === "WEBSITE")
                            providerPrefix = "WEB";
                        const extVarId = `${providerPrefix}_VAR_${vNumStr}`;
                        await ChannelVariantMapping.findOneAndUpdate({ tenantId: tenantObjectId, outletId: outletObjectId, provider, externalVariantId: extVarId }, { menuItemId: item._id, variantId: v._id, isActive: true, isSandbox: true, sandboxVersion: "v1", isDeleted: false }, { upsert: true, new: true });
                        mappedVariants++;
                    }
                }
                // Fetch addons
                const addons = await Addon.find({ tenantId: tenantObjectId, menuItemId: item._id, isSandbox: true, isDeleted: false }).sort({ name: 1 });
                for (let aIdx = 0; aIdx < addons.length; aIdx++) {
                    const a = addons[aIdx];
                    if (!a)
                        continue;
                    const aNumStr = `${numStr}_${aIdx + 1}`;
                    for (const provider of providers) {
                        let providerPrefix = "QR";
                        if (provider === "MOCK_SWIGGY")
                            providerPrefix = "SWG";
                        else if (provider === "MOCK_ZOMATO")
                            providerPrefix = "ZMT";
                        else if (provider === "WEBSITE")
                            providerPrefix = "WEB";
                        const extAddonId = `${providerPrefix}_ADDON_${aNumStr}`;
                        await ChannelAddonMapping.findOneAndUpdate({ tenantId: tenantObjectId, outletId: outletObjectId, provider, externalAddonId: extAddonId }, { menuItemId: item._id, addonId: a._id, isActive: true, isSandbox: true, sandboxVersion: "v1", isDeleted: false }, { upsert: true, new: true });
                        mappedAddons++;
                    }
                }
                // Backwards compatibility mappings for documentation
                if (item.sku === "SANDBOX-ITEM-001") {
                    // Classic Veg Burger -> 1001
                    for (const provider of ["MOCK_SWIGGY", "MOCK_ZOMATO"]) {
                        await ChannelMenuItemMapping.findOneAndUpdate({ tenantId: tenantObjectId, outletId: outletObjectId, provider, externalItemId: "1001" }, { menuItemId: item._id, isActive: true, isSandbox: true, sandboxVersion: "v1", isDeleted: false }, { upsert: true, new: true });
                        mappedItems++;
                    }
                    // Variants backwards compatibility: Regular -> V201
                    const variants = await Variant.find({ tenantId: tenantObjectId, menuItemId: item._id, isSandbox: true, isDeleted: false });
                    for (const v of variants) {
                        if (v.name === "Regular") {
                            for (const provider of ["MOCK_SWIGGY", "MOCK_ZOMATO"]) {
                                await ChannelVariantMapping.findOneAndUpdate({ tenantId: tenantObjectId, outletId: outletObjectId, provider, externalVariantId: "V201" }, { menuItemId: item._id, variantId: v._id, isActive: true, isSandbox: true, sandboxVersion: "v1", isDeleted: false }, { upsert: true, new: true });
                                mappedVariants++;
                            }
                        }
                    }
                }
                else if (item.sku === "SANDBOX-ITEM-009" || item.sku === "SANDBOX-ITEM-012") {
                    // Cheese Veg Pizza / Garden Delight Pizza -> 2002
                    for (const provider of ["MOCK_SWIGGY", "MOCK_ZOMATO"]) {
                        await ChannelMenuItemMapping.findOneAndUpdate({ tenantId: tenantObjectId, outletId: outletObjectId, provider, externalItemId: "2002" }, { menuItemId: item._id, isActive: true, isSandbox: true, sandboxVersion: "v1", isDeleted: false }, { upsert: true, new: true });
                        mappedItems++;
                    }
                    // Addons backwards compatibility: Jalapenos -> A402
                    const addonsList = await Addon.find({ tenantId: tenantObjectId, menuItemId: item._id, isSandbox: true, isDeleted: false });
                    for (const a of addonsList) {
                        if (a.name === "Jalapenos") {
                            for (const provider of ["MOCK_SWIGGY", "MOCK_ZOMATO"]) {
                                await ChannelAddonMapping.findOneAndUpdate({ tenantId: tenantObjectId, outletId: outletObjectId, provider, externalAddonId: "A402" }, { menuItemId: item._id, addonId: a._id, isActive: true, isSandbox: true, sandboxVersion: "v1", isDeleted: false }, { upsert: true, new: true });
                                mappedAddons++;
                            }
                        }
                    }
                }
            }
            ApiResponseHandler.success(res, 200, "Sandbox mappings generated successfully", {
                outletMappings: providers.length,
                menuItems: mappedItems,
                variants: mappedVariants,
                addons: mappedAddons
            });
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || "Failed to generate mappings");
        }
    }
    /**
     * POST /api/v1/integrations/dev/validate-mappings
     */
    static async validateMappings(req, res) {
        try {
            const tenantId = req.user?.tenantId;
            if (!tenantId) {
                ApiResponseHandler.unauthorized(res, "User not authenticated or tenantId not found");
                return;
            }
            const { outletId } = req.body;
            if (!outletId || !Types.ObjectId.isValid(outletId)) {
                ApiResponseHandler.badRequest(res, "A valid outletId is required");
                return;
            }
            const tenantObjectId = new Types.ObjectId(tenantId);
            const outletObjectId = new Types.ObjectId(outletId);
            const [allItems, allVariants, allAddons] = await Promise.all([
                MenuItem.find({ tenantId: tenantObjectId, outletId: outletObjectId, isDeleted: false }),
                Variant.find({ tenantId: tenantObjectId, isDeleted: false }),
                Addon.find({ tenantId: tenantObjectId, isDeleted: false })
            ]);
            const itemIds = new Set(allItems.map(i => i._id.toString()));
            const variantIds = new Set(allVariants.map(v => v._id.toString()));
            const addonIds = new Set(allAddons.map(a => a._id.toString()));
            const [itemMappings, variantMappings, addonMappings] = await Promise.all([
                ChannelMenuItemMapping.find({ tenantId: tenantObjectId, outletId: outletObjectId, isDeleted: false }),
                ChannelVariantMapping.find({ tenantId: tenantObjectId, outletId: outletObjectId, isDeleted: false }),
                ChannelAddonMapping.find({ tenantId: tenantObjectId, outletId: outletObjectId, isDeleted: false })
            ]);
            const brokenItems = [];
            const brokenVariants = [];
            const brokenAddons = [];
            const mappedItemIds = new Set();
            const mappedVariantIds = new Set();
            const mappedAddonIds = new Set();
            for (const m of itemMappings) {
                const idStr = m.menuItemId.toString();
                if (!itemIds.has(idStr)) {
                    brokenItems.push({ mappingId: m._id, externalItemId: m.externalItemId, provider: m.provider });
                }
                else {
                    mappedItemIds.add(idStr);
                }
            }
            for (const m of variantMappings) {
                const idStr = m.variantId.toString();
                if (!variantIds.has(idStr)) {
                    brokenVariants.push({ mappingId: m._id, externalVariantId: m.externalVariantId, provider: m.provider });
                }
                else {
                    mappedVariantIds.add(idStr);
                }
            }
            for (const m of addonMappings) {
                const idStr = m.addonId.toString();
                if (!addonIds.has(idStr)) {
                    brokenAddons.push({ mappingId: m._id, externalAddonId: m.externalAddonId, provider: m.provider });
                }
                else {
                    mappedAddonIds.add(idStr);
                }
            }
            const totalItems = allItems.length;
            const mappedItems = allItems.filter(i => mappedItemIds.has(i._id.toString())).length;
            const unmappedItems = allItems.filter(i => !mappedItemIds.has(i._id.toString())).map(i => ({ id: i._id, name: i.name, sku: i.sku }));
            const totalVariants = allVariants.length;
            const mappedVariantsCount = allVariants.filter(v => mappedVariantIds.has(v._id.toString())).length;
            const totalAddons = allAddons.length;
            const mappedAddonsCount = allAddons.filter(a => mappedAddonIds.has(a._id.toString())).length;
            const coveragePercent = totalItems > 0 ? Math.round((mappedItems / totalItems) * 100) : 0;
            ApiResponseHandler.success(res, 200, "Sandbox mappings validation complete", {
                coveragePercent,
                stats: {
                    items: { total: totalItems, mapped: mappedItems, unmapped: unmappedItems.length },
                    variants: { total: totalVariants, mapped: mappedVariantsCount, unmapped: totalVariants - mappedVariantsCount },
                    addons: { total: totalAddons, mapped: mappedAddonsCount, unmapped: totalAddons - mappedAddonsCount }
                },
                unmappedItems,
                broken: {
                    items: brokenItems,
                    variants: brokenVariants,
                    addons: brokenAddons
                }
            });
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || "Failed to validate mappings");
        }
    }
    /**
     * POST /api/v1/integrations/dev/reset
     */
    static async resetDevSandbox(req, res) {
        try {
            const tenantId = req.user?.tenantId;
            if (!tenantId) {
                ApiResponseHandler.unauthorized(res, "User not authenticated or tenantId not found");
                return;
            }
            const { outletId } = req.body;
            if (!outletId || !Types.ObjectId.isValid(outletId)) {
                ApiResponseHandler.badRequest(res, "A valid outletId is required");
                return;
            }
            const tenantObjectId = new Types.ObjectId(tenantId);
            const outletObjectId = new Types.ObjectId(outletId);
            // Query for sandbox menu items to scope variant/addon deletions
            const sandboxMenuItems = await MenuItem.find({ tenantId: tenantObjectId, outletId: outletObjectId, isSandbox: true }).select("_id");
            const sandboxMenuItemIds = sandboxMenuItems.map(item => item._id);
            // Query for sandbox orders to scope order timeline deletions
            const sandboxOrders = await Order.find({ tenantId: tenantObjectId, outletId: outletObjectId, isSandbox: true }).select("_id");
            const sandboxOrderIds = sandboxOrders.map(order => order._id);
            const [ordersDel, extOrdersDel, timelineDel, queueDel, syncJobsDel, outletMapDel, itemMapDel, varMapDel, addonMapDel, inventoryDel, itemsDel, variantsDel, addonsDel, categoriesDel] = await Promise.all([
                Order.deleteMany({ tenantId: tenantObjectId, outletId: outletObjectId, isSandbox: true }),
                ExternalOrder.deleteMany({ tenantId: tenantObjectId, outletId: outletObjectId, isSandbox: true }),
                OrderTimeline.deleteMany({ tenantId: tenantObjectId, orderId: { $in: sandboxOrderIds }, isSandbox: true }),
                IntegrationEventQueue.deleteMany({ tenantId: tenantObjectId, outletId: outletObjectId, isSandbox: true }),
                SyncJob.deleteMany({ tenantId: tenantObjectId, outletId: outletObjectId, isSandbox: true }),
                ChannelOutletMapping.deleteMany({ tenantId: tenantObjectId, outletId: outletObjectId, isSandbox: true }),
                ChannelMenuItemMapping.deleteMany({ tenantId: tenantObjectId, outletId: outletObjectId, isSandbox: true }),
                ChannelVariantMapping.deleteMany({ tenantId: tenantObjectId, outletId: outletObjectId, isSandbox: true }),
                ChannelAddonMapping.deleteMany({ tenantId: tenantObjectId, outletId: outletObjectId, isSandbox: true }),
                Inventory.deleteMany({ tenantId: tenantObjectId, outletId: outletObjectId, isSandbox: true }),
                MenuItem.deleteMany({ tenantId: tenantObjectId, outletId: outletObjectId, isSandbox: true }),
                Variant.deleteMany({ tenantId: tenantObjectId, menuItemId: { $in: sandboxMenuItemIds }, isSandbox: true }),
                Addon.deleteMany({ tenantId: tenantObjectId, menuItemId: { $in: sandboxMenuItemIds }, isSandbox: true }),
                Category.deleteMany({ tenantId: tenantObjectId, outletId: outletObjectId, isSandbox: true })
            ]);
            ApiResponseHandler.success(res, 200, "Sandbox development environment reset complete", {
                deleted: {
                    categories: categoriesDel.deletedCount,
                    menuItems: itemsDel.deletedCount,
                    variants: variantsDel.deletedCount,
                    addons: addonsDel.deletedCount,
                    inventory: inventoryDel.deletedCount,
                    outletMappings: outletMapDel.deletedCount,
                    itemMappings: itemMapDel.deletedCount,
                    variantMappings: varMapDel.deletedCount,
                    addonMappings: addonMapDel.deletedCount,
                    orders: ordersDel.deletedCount,
                    externalOrders: extOrdersDel.deletedCount,
                    timelineRecords: timelineDel.deletedCount,
                    eventQueue: queueDel.deletedCount,
                    syncJobs: syncJobsDel.deletedCount
                }
            });
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || "Failed to reset sandbox environment");
        }
    }
    /**
     * POST /api/v1/integrations/dev/simulate-order
     */
    static async simulateOrder(req, res) {
        try {
            const tenantId = req.user?.tenantId;
            if (!tenantId) {
                ApiResponseHandler.unauthorized(res, "User not authenticated or tenantId not found");
                return;
            }
            const { outletId, provider, mode, totalOrders, durationMinutes, speed, chaosMode, seed } = req.body;
            if (!outletId || !Types.ObjectId.isValid(outletId)) {
                ApiResponseHandler.badRequest(res, "A valid outletId is required");
                return;
            }
            if (!provider) {
                ApiResponseHandler.badRequest(res, "provider is required");
                return;
            }
            if (mode !== "BURST" && mode !== "CONTINUOUS") {
                ApiResponseHandler.badRequest(res, "mode must be either BURST or CONTINUOUS");
                return;
            }
            const session = await SimulatorService.startSimulation({
                tenantId,
                outletId,
                provider,
                mode,
                totalOrders: totalOrders ? Number(totalOrders) : undefined,
                durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
                speed: speed || "REALTIME",
                chaosMode: !!chaosMode,
                seed: seed !== undefined && seed !== "" ? Number(seed) : undefined
            });
            ApiResponseHandler.success(res, 201, "Simulation session started", {
                sessionId: session._id.toString(),
                status: session.status
            });
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || "Failed to start simulation session");
        }
    }
    /**
     * POST /api/v1/integrations/dev/simulator/:sessionId/stop
     */
    static async stopSimulatorSession(req, res) {
        try {
            const rawSessionId = req.params.sessionId;
            const sessionId = Array.isArray(rawSessionId) ? String(rawSessionId[0]) : String(rawSessionId || "");
            if (!sessionId || !Types.ObjectId.isValid(sessionId)) {
                ApiResponseHandler.badRequest(res, "A valid sessionId parameter is required");
                return;
            }
            const session = await SimulatorService.stopSimulation(sessionId);
            if (!session) {
                ApiResponseHandler.notFound(res, "Simulation session not found");
                return;
            }
            ApiResponseHandler.success(res, 200, "Simulation session stopped", session);
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || "Failed to stop simulation session");
        }
    }
    /**
     * GET /api/v1/integrations/dev/simulator/:sessionId/metrics
     */
    static async getSimulatorMetrics(req, res) {
        try {
            const rawSessionId = req.params.sessionId;
            const sessionId = Array.isArray(rawSessionId) ? String(rawSessionId[0]) : String(rawSessionId || "");
            if (!sessionId || !Types.ObjectId.isValid(sessionId)) {
                ApiResponseHandler.badRequest(res, "A valid sessionId parameter is required");
                return;
            }
            const metrics = await SimulationMetricsService.getMetrics(sessionId);
            if (!metrics) {
                ApiResponseHandler.notFound(res, "Simulation session not found");
                return;
            }
            ApiResponseHandler.success(res, 200, "Simulation metrics retrieved successfully", metrics);
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || "Failed to retrieve simulation metrics");
        }
    }
    /**
     * GET /api/v1/integrations/dev/simulator/:sessionId/events
     */
    static async getSimulatorEvents(req, res) {
        try {
            const rawSessionId = req.params.sessionId;
            const sessionId = Array.isArray(rawSessionId) ? String(rawSessionId[0]) : String(rawSessionId || "");
            if (!sessionId || !Types.ObjectId.isValid(sessionId)) {
                ApiResponseHandler.badRequest(res, "A valid sessionId parameter is required");
                return;
            }
            const logs = await SimulationLog.find({ sessionId: new Types.ObjectId(sessionId) })
                .sort({ timestamp: 1 })
                .limit(100);
            ApiResponseHandler.success(res, 200, "Simulation event logs retrieved successfully", logs);
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || "Failed to retrieve simulation event logs");
        }
    }
    /**
     * GET /api/v1/integrations/dev/simulator/sessions
     */
    static async getSimulatorSessions(req, res) {
        try {
            const tenantId = req.user?.tenantId;
            if (!tenantId) {
                ApiResponseHandler.unauthorized(res, "User not authenticated or tenantId not found");
                return;
            }
            const sessions = await SimulationSession.find({
                tenantId: new Types.ObjectId(tenantId)
            })
                .sort({ createdAt: -1 })
                .limit(10);
            ApiResponseHandler.success(res, 200, "Simulation sessions retrieved successfully", sessions);
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || "Failed to retrieve simulation sessions");
        }
    }
    /**
     * POST /api/v1/integrations/dev/run-smoke-test
     */
    static async runSmokeTest(req, res) {
        ApiResponseHandler.badRequest(res, "E2E Smoke Test Runner (Milestone 5) is not implemented yet");
    }
}
