import IntegrationEventQueue from "../../models/integration-event-queue.model.js";
import { SyncEngineService } from "./sync-engine.service.js";

export class OutboxPollerService {
  private static isPolling = false;
  private static pollInterval: NodeJS.Timeout | null = null;
  private static recoveryInterval: NodeJS.Timeout | null = null;
  private static nodeId = `node-${Math.random().toString(36).substring(2, 11)}`;

  static start(pollIntervalMs = 5000): void {
    if (this.pollInterval) return;

    this.pollInterval = setInterval(() => this.poll(), pollIntervalMs);

    this.recoveryInterval = setInterval(() => this.runRecovery(), 60000);
  }

  static stop(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    if (this.recoveryInterval) {
      clearInterval(this.recoveryInterval);
      this.recoveryInterval = null;
    }
  }

  static isActive(): boolean {
    return this.pollInterval !== null;
  }

  static async poll(): Promise<void> {
    if (this.isPolling) return;
    this.isPolling = true;

    try {
      const now = new Date();

      const events = await IntegrationEventQueue.find({
        $or: [
          { status: "PENDING" },
          { status: "FAILED", nextRetryAt: { $lte: now } },
        ],
      })
        .sort({ queuedAt: 1 })
        .limit(10);

      for (const event of events) {

        const claimedEvent = await IntegrationEventQueue.findOneAndUpdate(
          {
            _id: event._id,
            status: event.status,
            ...(event.status === "FAILED" ? { nextRetryAt: event.nextRetryAt } : {})
          },
          {
            $set: {
              status: "PROCESSING",
              processingNodeId: this.nodeId,
              processingStartedAt: now,
              startedAt: now
            }
          },
          { new: true }
        );

        if (claimedEvent) {

          await SyncEngineService.processEvent(claimedEvent, this.nodeId);
        }
      }
    } catch (error: any) {
      console.error(`[OutboxPollerService] Error in poll loop: ${error.message}`);
    } finally {
      this.isPolling = false;
    }
  }

  static async runRecovery(): Promise<void> {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    try {
      const result = await IntegrationEventQueue.updateMany(
        {
          status: "PROCESSING",
          processingStartedAt: { $lt: tenMinutesAgo },
        },
        {
          $set: {
            status: "PENDING",
            processingNodeId: null,
            processingStartedAt: null,
            failureReason: "Stuck processing event recovered back to PENDING (likely worker crash)",
          },
        }
      );

      if (result.modifiedCount > 0) {
      }
    } catch (error: any) {
      console.error(`[OutboxPollerService] Error in poller safety recovery job: ${error.message}`);
    }
  }

  static async triggerManualRun(): Promise<void> {
    await this.runRecovery();
    await this.poll();
  }
}
