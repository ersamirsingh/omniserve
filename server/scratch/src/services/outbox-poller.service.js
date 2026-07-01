import IntegrationEventQueue from "../models/integration-event-queue.model.js";
import { SyncEngineService } from "./sync-engine.service.js";
export class OutboxPollerService {
    static isPolling = false;
    static pollInterval = null;
    static recoveryInterval = null;
    static nodeId = `node-${Math.random().toString(36).substring(2, 11)}`;
    /**
     * Start the background polling and recovery intervals
     */
    static start(pollIntervalMs = 5000) {
        if (this.pollInterval)
            return;
        console.log(`[OutboxPollerService] Starting outbox poller on nodeId: ${this.nodeId} (interval: ${pollIntervalMs}ms)`);
        // Poll loop
        this.pollInterval = setInterval(() => this.poll(), pollIntervalMs);
        // Recovery loop every 60 seconds
        this.recoveryInterval = setInterval(() => this.runRecovery(), 60000);
    }
    /**
     * Stop the background polling and recovery intervals
     */
    static stop() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
        if (this.recoveryInterval) {
            clearInterval(this.recoveryInterval);
            this.recoveryInterval = null;
        }
        console.log(`[OutboxPollerService] Stopped outbox poller`);
    }
    /**
     * Check if the outbox poller is active
     */
    static isActive() {
        return this.pollInterval !== null;
    }
    /**
     * Find and process pending/retryable events
     */
    static async poll() {
        if (this.isPolling)
            return;
        this.isPolling = true;
        try {
            const now = new Date();
            // Find PENDING events OR FAILED events whose nextRetryAt is in the past
            const events = await IntegrationEventQueue.find({
                $or: [
                    { status: "PENDING" },
                    { status: "FAILED", nextRetryAt: { $lte: now } },
                ],
            })
                .sort({ queuedAt: 1 })
                .limit(10); // Batch size 10
            for (const event of events) {
                // Double-check status is still pending/failed (prevent race conditions)
                const freshEvent = await IntegrationEventQueue.findById(event._id);
                if (freshEvent && (freshEvent.status === "PENDING" || freshEvent.status === "FAILED")) {
                    await SyncEngineService.processEvent(freshEvent, this.nodeId);
                }
            }
        }
        catch (error) {
            console.error(`[OutboxPollerService] Error in poll loop: ${error.message}`);
        }
        finally {
            this.isPolling = false;
        }
    }
    /**
     * Recovery job: identify stuck processing events (older than 10 minutes) and reset back to PENDING
     */
    static async runRecovery() {
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        try {
            const result = await IntegrationEventQueue.updateMany({
                status: "PROCESSING",
                processingStartedAt: { $lt: tenMinutesAgo },
            }, {
                $set: {
                    status: "PENDING",
                    processingNodeId: null,
                    processingStartedAt: null,
                    failureReason: "Stuck processing event recovered back to PENDING (likely worker crash)",
                },
            });
            if (result.modifiedCount > 0) {
                console.log(`[OutboxPollerService] Poller safety recovery reset ${result.modifiedCount} stuck event(s) back to PENDING.`);
            }
        }
        catch (error) {
            console.error(`[OutboxPollerService] Error in poller safety recovery job: ${error.message}`);
        }
    }
    /**
     * Manual run utility for synchronously running recovery and poll in tests
     */
    static async triggerManualRun() {
        await this.runRecovery();
        await this.poll();
    }
}
