import { Types } from "mongoose";
import SimulationSession from "../models/simulationsession.model.js";
import ExternalOrder from "../models/externalorder.model.js";
import IntegrationEventQueue from "../models/integration-event-queue.model.js";
import SyncJob from "../models/syncjob.model.js";
import { IntegrationProcessingStatus } from "../types/integration.type.js";
export class SimulationMetricsService {
    /**
     * Aggregate latest metrics for a given SimulationSession.
     */
    static async getMetrics(sessionId) {
        const sessionObjectId = typeof sessionId === "string" ? new Types.ObjectId(sessionId) : sessionId;
        // 1. Fetch parent session
        const session = await SimulationSession.findById(sessionObjectId);
        if (!session)
            return null;
        // 2. Query external orders aggregated counts
        const ordersStats = await ExternalOrder.aggregate([
            { $match: { sessionId: sessionObjectId } },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },
                    avgLatency: {
                        $avg: {
                            $cond: [
                                { $and: [{ $not: [{ $eq: ["$processedAt", null] }] }, { $not: [{ $eq: ["$receivedAt", null] }] }] },
                                { $subtract: ["$processedAt", "$receivedAt"] },
                                null
                            ]
                        }
                    }
                }
            }
        ]);
        let totalOrders = 0;
        let successCount = 0;
        let mappingFailures = 0;
        let validationFailures = 0;
        let systemFailures = 0;
        let cancelledCount = 0;
        let totalLatencySum = 0;
        let latencyCount = 0;
        ordersStats.forEach((stat) => {
            const count = stat.count;
            totalOrders += count;
            if (stat.avgLatency) {
                totalLatencySum += stat.avgLatency * count;
                latencyCount += count;
            }
            switch (stat._id) {
                case IntegrationProcessingStatus.PLACED:
                    successCount += count;
                    break;
                case IntegrationProcessingStatus.MAPPING_REVIEW_REQUIRED:
                    mappingFailures += count;
                    break;
                case IntegrationProcessingStatus.FAILED_VALIDATION:
                    validationFailures += count;
                    break;
                case IntegrationProcessingStatus.DLQ:
                    systemFailures += count;
                    break;
                case IntegrationProcessingStatus.CANCELLED:
                    cancelledCount += count;
                    break;
                default:
                    if (stat._id === "FAILED") {
                        systemFailures += count;
                    }
                    break;
            }
        });
        const failedCount = mappingFailures + validationFailures + systemFailures;
        const averageLatencyMs = latencyCount > 0 ? Math.round(totalLatencySum / latencyCount) : 0;
        // 3. Queue Depth (Pending / Processing events & sync jobs)
        const [pendingEvents, pendingSyncJobs] = await Promise.all([
            IntegrationEventQueue.countDocuments({
                sessionId: sessionObjectId,
                status: { $in: ["PENDING", "PROCESSING"] }
            }),
            SyncJob.countDocuments({
                sessionId: sessionObjectId,
                status: { $in: ["PENDING", "PROCESSING"] }
            })
        ]);
        const queueDepth = pendingEvents + pendingSyncJobs;
        // 4. Retries (Sum of retryCount in EventQueue and SyncJobs)
        const [eventRetriesAgg, syncJobRetriesAgg] = await Promise.all([
            IntegrationEventQueue.aggregate([
                { $match: { sessionId: sessionObjectId } },
                { $group: { _id: null, total: { $sum: "$retryCount" } } }
            ]),
            SyncJob.aggregate([
                { $match: { sessionId: sessionObjectId } },
                { $group: { _id: null, total: { $sum: "$retryCount" } } }
            ])
        ]);
        const retries = (eventRetriesAgg[0]?.total || 0) + (syncJobRetriesAgg[0]?.total || 0);
        // 5. Throughput calculations
        const endTime = session.finishedAt || new Date();
        const durationSeconds = Math.max(1, Math.round((endTime.getTime() - session.startedAt.getTime()) / 1000));
        // Throughput (orders processed per second)
        const throughput = Number((successCount / durationSeconds).toFixed(2));
        // Sync throughput (successful sync jobs per second)
        const successfulSyncs = await SyncJob.countDocuments({
            sessionId: sessionObjectId,
            status: "SUCCESS"
        });
        const syncThroughput = Number((successfulSyncs / durationSeconds).toFixed(2));
        const successRate = totalOrders > 0 ? Math.round((successCount / totalOrders) * 100) : 0;
        return {
            sessionId: sessionObjectId.toString(),
            provider: session.provider,
            status: session.status,
            startedAt: session.startedAt,
            finishedAt: session.finishedAt,
            durationSeconds,
            totalOrders,
            successCount,
            failedCount,
            mappingFailures,
            validationFailures,
            successRate,
            averageLatencyMs,
            throughput,
            syncThroughput,
            queueDepth,
            retries,
            systemFailures
        };
    }
    /**
     * Sync metrics directly back into the SimulationSession document.
     * Useful when finalizing a session.
     */
    static async persistSessionMetrics(sessionId) {
        const sessionObjectId = typeof sessionId === "string" ? new Types.ObjectId(sessionId) : sessionId;
        const aggregated = await this.getMetrics(sessionObjectId);
        if (!aggregated)
            return null;
        return await SimulationSession.findByIdAndUpdate(sessionObjectId, {
            totalOrders: aggregated.totalOrders,
            successCount: aggregated.successCount,
            failedCount: aggregated.failedCount,
            mappingFailures: aggregated.mappingFailures,
            validationFailures: aggregated.validationFailures,
            averageLatency: aggregated.averageLatencyMs
        }, { new: true });
    }
}
