import { Types } from "mongoose";
import SimulationSession from "../models/simulationsession.model.js";
import SimulationLog from "../models/simulationlog.model.js";
import ExternalOrder from "../models/externalorder.model.js";
import Order from "../models/order.model.js";
import OrderTimeline from "../models/ordertimeline.model.js";
import IntegrationEventQueue from "../models/integration-event-queue.model.js";
import SyncJob from "../models/syncjob.model.js";
import MenuItem from "../models/menuitems.model.js";
import Variant from "../models/variant.model.js";
import Addon from "../models/addon.model.js";
import ChannelMenuItemMapping from "../models/channelmenuitemmapping.model.js";
import ChannelVariantMapping from "../models/channelvariantmapping.model.js";
import ChannelAddonMapping from "../models/channeladdonmapping.model.js";
import ChannelOutletMapping from "../models/channeloutletmapping.model.js";
import { OrderGatewayService } from "./ordergateway.service.js";
import { SimulatorRegistry } from "../integrations/simulators/simulator-registry.js";
import { SeededRandomHelper } from "../utils/seeded-random.js";
import { SimulationMetricsService } from "./simulation-metrics.service.js";
import { IntegrationProcessingStatus } from "../types/integration.type.js";
export class SimulatorService {
    // In-memory registry to store active timers/loops so we can cancel them
    static activeSessions = new Map();
    /**
     * Start a simulation session
     */
    static async startSimulation(input) {
        const tenantObjectId = new Types.ObjectId(input.tenantId);
        const outletObjectId = new Types.ObjectId(input.outletId);
        // 1. Enforce safety limits
        // Limit A: Max concurrent sessions per tenant = 3
        const activeCount = await SimulationSession.countDocuments({
            tenantId: tenantObjectId,
            status: "RUNNING"
        });
        if (activeCount >= 3) {
            throw new Error("Validation Limit Exceeded: Maximum concurrent active sessions per tenant is 3.");
        }
        // Limit B: Max burst size = 500 orders
        if (input.mode === "BURST" && (!input.totalOrders || input.totalOrders > 500)) {
            throw new Error("Validation Limit Exceeded: Maximum burst size is 500 orders.");
        }
        // Limit C: Max continuous duration = 30 minutes
        if (input.mode === "CONTINUOUS" && (!input.durationMinutes || input.durationMinutes > 30)) {
            throw new Error("Validation Limit Exceeded: Maximum continuous duration is 30 minutes.");
        }
        // 2. Resolve provider external outlet mapping
        const outletMap = await ChannelOutletMapping.findOne({
            tenantId: tenantObjectId,
            outletId: outletObjectId,
            provider: input.provider.toUpperCase(),
            isDeleted: false
        });
        const externalOutletId = outletMap?.externalOutletId || "6a3c17666bb70afe757e4a91";
        // 3. Create Simulation Session & Jobs database entries
        const session = new SimulationSession({
            tenantId: tenantObjectId,
            outletId: outletObjectId,
            provider: input.provider.toUpperCase(),
            status: "RUNNING",
            startedAt: new Date(),
            isSandbox: true,
            sandboxVersion: "v1",
            jobs: []
        });
        // Determine jobs and iterations
        let totalIterations = 1;
        if (input.mode === "BURST") {
            totalIterations = input.totalOrders || 1;
        }
        else {
            // Continuous: calculate iterations based on speed & duration
            const durationSeconds = (input.durationMinutes || 10) * 60;
            const intervalMs = this.getIntervalMs(input.speed);
            totalIterations = Math.ceil((durationSeconds * 1000) / intervalMs);
        }
        // Create 1 job for simplicity (can split into multiple jobs if needed)
        const jobId = new Types.ObjectId();
        session.jobs.push({
            _id: jobId,
            status: "PENDING",
            startedAt: null,
            completedAt: null,
            processedOrders: 0,
            failedOrders: 0,
            currentIteration: 0,
            totalIterations
        });
        await session.save();
        // 4. Log SESSION_STARTED
        await this.logEvent({
            tenantId: tenantObjectId,
            sessionId: session._id,
            eventType: "SESSION_STARTED",
            details: { input }
        });
        // 5. Initialize session state in-memory
        const sessionState = {
            timeoutIds: [],
            stopRequested: false
        };
        this.activeSessions.set(session._id.toString(), sessionState);
        // 6. Spawn Background Execution
        const firstJob = session.jobs[0];
        if (firstJob) {
            this.runJobAsynchronously(session, firstJob, input, externalOutletId);
        }
        // 7. Spawn Event Queue & Sync Job status tracker
        this.startBackgroundTracker(session._id.toString(), input.tenantId);
        // 8. Auto-stop continuous sessions after limit (e.g. 30 mins max)
        if (input.mode === "CONTINUOUS") {
            const durationMs = (input.durationMinutes || 30) * 60 * 1000;
            const stopTimeout = setTimeout(async () => {
                await this.stopSimulation(session._id.toString());
            }, durationMs);
            sessionState.timeoutIds.push(stopTimeout);
        }
        return session;
    }
    /**
     * Stop an active simulation run gracefully
     */
    static async stopSimulation(sessionId) {
        const sessionState = this.activeSessions.get(sessionId);
        if (!sessionState)
            return await SimulationSession.findById(sessionId);
        sessionState.stopRequested = true;
        // Clear any pending timers
        sessionState.timeoutIds.forEach(clearTimeout);
        sessionState.timeoutIds = [];
        const session = await SimulationSession.findById(sessionId);
        if (!session || session.status !== "RUNNING") {
            this.cleanupSession(sessionId);
            return session;
        }
        // Mark active jobs as CANCELLED
        session.jobs.forEach(job => {
            if (job.status === "RUNNING" || job.status === "PENDING") {
                job.status = "CANCELLED";
                job.completedAt = new Date();
            }
        });
        session.status = "CANCELLED";
        session.finishedAt = new Date();
        await session.save();
        await this.logEvent({
            tenantId: session.tenantId,
            sessionId: session._id,
            eventType: "SESSION_COMPLETED",
            details: { reason: "User cancelled" }
        });
        // Finalize metrics
        await SimulationMetricsService.persistSessionMetrics(sessionId);
        this.cleanupSession(sessionId);
        return await SimulationSession.findById(sessionId);
    }
    /**
     * Asynchronous background job queue execution loop.
     * Executes one iteration step and schedules the next.
     */
    static async runJobAsynchronously(session, job, input, externalOutletId) {
        const sessionIdStr = session._id.toString();
        const sessionState = this.activeSessions.get(sessionIdStr);
        if (!sessionState || sessionState.stopRequested)
            return;
        // Update job status to RUNNING
        await SimulationSession.updateOne({ _id: session._id, "jobs._id": job._id }, {
            $set: {
                "jobs.$.status": "RUNNING",
                "jobs.$.startedAt": new Date()
            }
        });
        const runIterationStep = async (iteration) => {
            if (sessionState.stopRequested)
                return;
            // 1. Check if job completed
            if (iteration >= job.totalIterations) {
                await SimulationSession.updateOne({ _id: session._id, "jobs._id": job._id }, {
                    $set: {
                        "jobs.$.status": "COMPLETED",
                        "jobs.$.completedAt": new Date()
                    }
                });
                // Check if all jobs are finished
                const freshSession = await SimulationSession.findById(session._id);
                if (freshSession && freshSession.jobs.every(j => j.status === "COMPLETED" || j.status === "CANCELLED" || j.status === "FAILED")) {
                    freshSession.status = "COMPLETED";
                    freshSession.finishedAt = new Date();
                    await freshSession.save();
                    await this.logEvent({
                        tenantId: freshSession.tenantId,
                        sessionId: freshSession._id,
                        eventType: "SESSION_COMPLETED",
                        details: { reason: "All iterations completed" }
                    });
                    await SimulationMetricsService.persistSessionMetrics(freshSession._id);
                    this.cleanupSession(sessionIdStr);
                }
                return;
            }
            // Update current iteration
            await SimulationSession.updateOne({ _id: session._id, "jobs._id": job._id }, { $set: { "jobs.$.currentIteration": iteration + 1 } });
            // 2. Execute single simulation order
            try {
                await this.simulateOrderStep({
                    tenantId: input.tenantId,
                    outletId: input.outletId,
                    provider: input.provider,
                    sessionId: session._id,
                    jobId: job._id,
                    iteration,
                    chaosMode: input.chaosMode,
                    seed: input.seed,
                    externalOutletId
                });
                // Update processed orders count
                await SimulationSession.updateOne({ _id: session._id, "jobs._id": job._id }, { $inc: { "jobs.$.processedOrders": 1 } });
            }
            catch (err) {
                console.error("Error executing simulation order step:", err);
                // Log ORDER_FAILED event
                await this.logEvent({
                    tenantId: new Types.ObjectId(input.tenantId),
                    sessionId: session._id,
                    jobId: job._id,
                    eventType: "ORDER_FAILED",
                    details: { error: err.message, iteration }
                });
                await SimulationSession.updateOne({ _id: session._id, "jobs._id": job._id }, { $inc: { "jobs.$.failedOrders": 1 } });
            }
            // Schedule next iteration
            const intervalMs = this.getIntervalMs(input.speed);
            const nextTimeout = setTimeout(() => {
                runIterationStep(iteration + 1);
            }, intervalMs);
            sessionState.timeoutIds.push(nextTimeout);
        };
        // Begin loop
        runIterationStep(0);
    }
    /**
     * Executes a single simulation step: item selection, payload generation, sending to gateway, and updating database relationships.
     */
    static async simulateOrderStep(args) {
        const provUpper = args.provider.toUpperCase();
        // Seed sequentially based on base seed + iteration index to make it deterministic
        const iterationSeed = args.seed !== undefined ? args.seed + args.iteration : undefined;
        const random = new SeededRandomHelper(iterationSeed);
        // 1. Fetch menu item mappings
        const itemMappings = await ChannelMenuItemMapping.find({
            tenantId: new Types.ObjectId(args.tenantId),
            outletId: new Types.ObjectId(args.outletId),
            provider: provUpper,
            isActive: true,
            isDeleted: false
        });
        if (itemMappings.length === 0) {
            throw new Error(`No active menu item mappings found for provider ${args.provider} and outlet ${args.outletId}. Please generate mappings first.`);
        }
        // 2. Select 1-3 items randomly/seeded
        const itemsCount = random.nextInt(1, 3);
        const selectedMappings = [];
        for (let i = 0; i < itemsCount; i++) {
            selectedMappings.push(random.pick(itemMappings));
        }
        const payloadItems = [];
        for (const mapping of selectedMappings) {
            const menuItem = await MenuItem.findOne({ _id: mapping.menuItemId, isDeleted: false });
            if (!menuItem)
                continue;
            // Check if there are variant mapping selections
            const varMappings = await ChannelVariantMapping.find({
                tenantId: new Types.ObjectId(args.tenantId),
                outletId: new Types.ObjectId(args.outletId),
                provider: provUpper,
                menuItemId: menuItem._id,
                isDeleted: false
            });
            const selectedVar = varMappings.length > 0 ? random.pick(varMappings) : null;
            let variantName = undefined;
            if (selectedVar) {
                const vDb = await Variant.findById(selectedVar.variantId);
                if (vDb)
                    variantName = vDb.name;
            }
            // Check if there are addon mappings
            const addonMappings = await ChannelAddonMapping.find({
                tenantId: new Types.ObjectId(args.tenantId),
                outletId: new Types.ObjectId(args.outletId),
                provider: provUpper,
                menuItemId: menuItem._id,
                isDeleted: false
            });
            const selectedAddon = addonMappings.length > 0 && random.nextFloat() < 0.4 ? random.pick(addonMappings) : null;
            let addonName = undefined;
            let addonPrice = undefined;
            if (selectedAddon) {
                const aDb = await Addon.findById(selectedAddon.addonId);
                if (aDb) {
                    addonName = aDb.name;
                    addonPrice = aDb.price;
                }
            }
            payloadItems.push({
                externalItemId: mapping.externalItemId,
                externalVariantId: selectedVar?.externalVariantId,
                externalAddonId: selectedAddon?.externalAddonId,
                price: menuItem.price,
                name: menuItem.name,
                quantity: random.pickWeighted([{ item: 1, weight: 70 }, { item: 2, weight: 25 }, { item: 3, weight: 5 }]),
                variantName,
                addonName,
                addonPrice
            });
        }
        if (payloadItems.length === 0) {
            throw new Error("Failed to pick any valid items from catalog mappings");
        }
        // 3. Resolve orderId and paymentMode
        const orderIdSuffix = random.nextInt(100000, 999999);
        const orderId = `${provUpper}-SIM-${args.iteration}-${orderIdSuffix}`;
        const paymentMode = random.pickWeighted([{ item: "UPI", weight: 45 }, { item: "CARD", weight: 40 }, { item: "CASH", weight: 15 }]);
        // 4. Inject chaos if enabled
        let chaos = undefined;
        if (args.chaosMode) {
            // 5% Unknown items (Mapping Error)
            // 3% Validation Error
            // 2% Duplicate Order
            // 1% DLQ Error
            const chaosRoll = random.nextFloat(0, 100);
            if (chaosRoll < 5) {
                // Mapping error: replace externalItemId with a broken one
                const firstItem = payloadItems[0];
                if (firstItem) {
                    firstItem.externalItemId = "BROKEN_ITEM_CODE";
                }
            }
            else if (chaosRoll < 8) {
                chaos = "VALIDATION_ERROR";
            }
            else if (chaosRoll < 10) {
                // Duplicate order: we'll simulate duplicate ingestion
                chaos = "DUPLICATE_ORDER";
            }
            else if (chaosRoll < 11) {
                chaos = "DLQ_ERROR";
            }
        }
        // 5. Generate Payload
        const providerSim = SimulatorRegistry.get(args.provider);
        if (!providerSim) {
            throw new Error(`Provider simulator for ${args.provider} is not registered`);
        }
        const payload = providerSim.generatePayload({
            tenantId: args.tenantId,
            outletId: args.outletId,
            externalOutletId: args.externalOutletId,
            items: payloadItems,
            paymentMode,
            chaos,
            orderId
        });
        await this.logEvent({
            tenantId: new Types.ObjectId(args.tenantId),
            sessionId: args.sessionId,
            jobId: args.jobId,
            externalOrderId: orderId,
            eventType: "PAYLOAD_GENERATED",
            details: { payload }
        });
        await this.logEvent({
            tenantId: new Types.ObjectId(args.tenantId),
            sessionId: args.sessionId,
            jobId: args.jobId,
            externalOrderId: orderId,
            eventType: "ORDER_SENT"
        });
        // 6. Ingest Order
        const { externalOrder } = await OrderGatewayService.ingestExternalOrder({
            tenantId: args.tenantId,
            provider: provUpper,
            externalOrderId: orderId,
            rawPayload: payload,
            outletId: args.outletId
        });
        // Link externalOrder to session
        externalOrder.sessionId = args.sessionId;
        await externalOrder.save();
        // 7. Process Order
        const processedOrder = await OrderGatewayService.processExternalOrder({
            externalOrderId: externalOrder._id.toString(),
            tenantId: args.tenantId
        });
        // Link all internal orders, events, sync jobs, and timeline records
        await this.linkSessionData(args.sessionId, args.tenantId, args.outletId, orderId, processedOrder.internalOrderId?.toString());
        // 8. Log Ingestion Result
        if (processedOrder.status === IntegrationProcessingStatus.PLACED) {
            await this.logEvent({
                tenantId: new Types.ObjectId(args.tenantId),
                sessionId: args.sessionId,
                jobId: args.jobId,
                externalOrderId: orderId,
                eventType: "ORDER_ACCEPTED",
                details: { internalOrderId: processedOrder.internalOrderId }
            });
        }
        else {
            await this.logEvent({
                tenantId: new Types.ObjectId(args.tenantId),
                sessionId: args.sessionId,
                jobId: args.jobId,
                externalOrderId: orderId,
                eventType: "ORDER_FAILED",
                details: { status: processedOrder.status, reason: processedOrder.failureReason }
            });
        }
        // 9. If DUPLICATE_ORDER chaos was rolled, re-ingest the exact same order
        if (chaos === "DUPLICATE_ORDER") {
            await this.logEvent({
                tenantId: new Types.ObjectId(args.tenantId),
                sessionId: args.sessionId,
                jobId: args.jobId,
                externalOrderId: orderId,
                eventType: "ORDER_SENT",
                details: { note: "Duplicate order chaos ingestion" }
            });
            const dupIngest = await OrderGatewayService.ingestExternalOrder({
                tenantId: args.tenantId,
                provider: provUpper,
                externalOrderId: orderId,
                rawPayload: payload,
                outletId: args.outletId
            });
            // It should trigger ORDER_INGEST_IDEMPOTENT_HIT
            await this.logEvent({
                tenantId: new Types.ObjectId(args.tenantId),
                sessionId: args.sessionId,
                jobId: args.jobId,
                externalOrderId: orderId,
                eventType: "ORDER_ACCEPTED",
                details: { note: "Duplicate order ingestion completed (Idempotent hit)" }
            });
        }
    }
    /**
     * Query database in the background to log Outbox Event Queue and SyncJob completion streams.
     */
    static startBackgroundTracker(sessionId, tenantId) {
        const sessionState = this.activeSessions.get(sessionId);
        if (!sessionState)
            return;
        const sessionObjectId = new Types.ObjectId(sessionId);
        // Poll every 1500ms
        const trackerIntervalId = setInterval(async () => {
            try {
                const session = await SimulationSession.findById(sessionObjectId);
                if (!session || session.status !== "RUNNING") {
                    clearInterval(trackerIntervalId);
                    return;
                }
                // Find all orders linked to this session
                const extOrders = await ExternalOrder.find({ sessionId: sessionObjectId }).select("externalOrderId internalOrderId");
                for (const extOrder of extOrders) {
                    const extOrderId = extOrder.externalOrderId;
                    const intOrderId = extOrder.internalOrderId;
                    // 1. Check Outbox Queue entries
                    if (intOrderId) {
                        const eventQueueItem = await IntegrationEventQueue.findOne({
                            sessionId: sessionObjectId,
                            aggregateId: intOrderId
                        });
                        if (eventQueueItem) {
                            const outboxLogged = await SimulationLog.findOne({
                                sessionId: sessionObjectId,
                                externalOrderId: extOrderId,
                                eventType: "OUTBOX_CREATED"
                            });
                            if (!outboxLogged) {
                                await this.logEvent({
                                    tenantId: new Types.ObjectId(tenantId),
                                    sessionId: sessionObjectId,
                                    externalOrderId: extOrderId,
                                    eventType: "OUTBOX_CREATED",
                                    details: { eventId: eventQueueItem._id, eventType: eventQueueItem.eventType }
                                });
                            }
                            // 2. Check SyncJobs
                            const syncJobs = await SyncJob.find({
                                sessionId: sessionObjectId,
                                eventId: eventQueueItem._id
                            });
                            for (const syncJob of syncJobs) {
                                const syncCreatedLogged = await SimulationLog.findOne({
                                    sessionId: sessionObjectId,
                                    externalOrderId: extOrderId,
                                    eventType: "SYNCJOB_CREATED",
                                    "details.syncJobId": syncJob._id
                                });
                                if (!syncCreatedLogged) {
                                    await this.logEvent({
                                        tenantId: new Types.ObjectId(tenantId),
                                        sessionId: sessionObjectId,
                                        externalOrderId: extOrderId,
                                        eventType: "SYNCJOB_CREATED",
                                        details: { syncJobId: syncJob._id, syncType: syncJob.type }
                                    });
                                }
                                // Check completion
                                if (syncJob.status === "SUCCESS" || syncJob.status === "FAILED" || syncJob.status === "DLQ" || syncJob.status === "CANCELLED") {
                                    const connectorCompletedLogged = await SimulationLog.findOne({
                                        sessionId: sessionObjectId,
                                        externalOrderId: extOrderId,
                                        eventType: "CONNECTOR_COMPLETED",
                                        "details.syncJobId": syncJob._id
                                    });
                                    if (!connectorCompletedLogged) {
                                        await this.logEvent({
                                            tenantId: new Types.ObjectId(tenantId),
                                            sessionId: sessionObjectId,
                                            externalOrderId: extOrderId,
                                            eventType: "CONNECTOR_COMPLETED",
                                            details: { syncJobId: syncJob._id, status: syncJob.status, error: syncJob.errorMessage }
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            }
            catch (err) {
                console.error("Error in simulator background tracker:", err);
            }
        }, 1500);
        sessionState.trackerIntervalId = trackerIntervalId;
    }
    /**
     * Helper to clean up active loops
     */
    static cleanupSession(sessionId) {
        const sessionState = this.activeSessions.get(sessionId);
        if (!sessionState)
            return;
        if (sessionState.trackerIntervalId) {
            clearInterval(sessionState.trackerIntervalId);
        }
        sessionState.timeoutIds.forEach(clearTimeout);
        this.activeSessions.delete(sessionId);
    }
    /**
     * Map transactional records back to simulation sessionId
     */
    static async linkSessionData(sessionId, tenantId, outletId, externalOrderId, internalOrderId) {
        await ExternalOrder.updateMany({ tenantId: new Types.ObjectId(tenantId), externalOrderId, sessionId: null }, { $set: { sessionId } });
        if (internalOrderId) {
            const internalId = new Types.ObjectId(internalOrderId);
            await Promise.all([
                Order.updateMany({ _id: internalId, sessionId: null }, { $set: { sessionId } }),
                OrderTimeline.updateMany({ orderId: internalId, sessionId: null }, { $set: { sessionId } }),
                IntegrationEventQueue.updateMany({ aggregateId: internalId, sessionId: null }, { $set: { sessionId } })
            ]);
            const events = await IntegrationEventQueue.find({ aggregateId: internalId }).select("_id");
            const eventIds = events.map(e => e._id);
            await SyncJob.updateMany({
                tenantId: new Types.ObjectId(tenantId),
                $or: [
                    { eventId: { $in: eventIds } },
                    { correlationId: externalOrderId }
                ],
                sessionId: null
            }, { $set: { sessionId } });
        }
    }
    /**
     * Append a structured event log to SimulationLog
     */
    static async logEvent(args) {
        await SimulationLog.create({
            tenantId: args.tenantId,
            sessionId: args.sessionId,
            jobId: args.jobId || null,
            externalOrderId: args.externalOrderId || null,
            eventType: args.eventType,
            details: args.details || {},
            timestamp: new Date(),
            isSandbox: true,
            sandboxVersion: "v1"
        });
    }
    /**
     * Helper to fetch interval delays in milliseconds based on speed configuration
     */
    static getIntervalMs(speed) {
        switch (speed) {
            case "FAST":
                return 300; // 300ms
            case "STRESS_TEST":
                return 0; // Immediate concurrency
            case "REALTIME":
            default:
                return 2000; // 2 seconds
        }
    }
}
