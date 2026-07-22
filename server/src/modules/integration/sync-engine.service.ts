import { Types } from "mongoose";
import IntegrationEventQueue, { IIntegrationEventQueue } from "../../models/integration-event-queue.model.js";
import ProviderSyncState from "../../models/providersyncstate.model.js";

export class WorkerRegistry {
  private registry = new Map<string, (event: IIntegrationEventQueue) => Promise<void>>();

  register(eventType: string, worker: (event: IIntegrationEventQueue) => Promise<void>): void {
    this.registry.set(eventType, worker);
  }

  get(eventType: string): ((event: IIntegrationEventQueue) => Promise<void>) | undefined {
    return this.registry.get(eventType);
  }
}

export const workerRegistry = new WorkerRegistry();

export class SyncEngineService {

  static async isCircuitOpen(
    tenantId: Types.ObjectId,
    outletId: Types.ObjectId | null,
    provider: string
  ): Promise<boolean> {
    if (!outletId) return false;
    const state = await ProviderSyncState.findOne({ tenantId, outletId, provider });
    if (state && state.circuitOpenUntil && state.circuitOpenUntil > new Date()) {
      return true;
    }
    return false;
  }

  static async handleSuccess(
    tenantId: Types.ObjectId,
    outletId: Types.ObjectId | null,
    provider: string
  ): Promise<void> {
    if (!outletId) return;
    await ProviderSyncState.findOneAndUpdate(
      { tenantId, outletId, provider },
      {
        $set: {
          consecutiveFailures: 0,
          circuitOpenUntil: null,
          syncHealth: "HEALTHY",
          lastSuccessAt: new Date(),
        },
      },
      { upsert: true }
    );
  }

  static async handleFailure(
    tenantId: Types.ObjectId,
    outletId: Types.ObjectId | null,
    provider: string
  ): Promise<void> {
    if (!outletId) return;
    const state = await ProviderSyncState.findOne({ tenantId, outletId, provider });
    const consecutive = (state?.consecutiveFailures || 0) + 1;
    const openUntil = consecutive >= 5 ? new Date(Date.now() + 10 * 60 * 1000) : null;
    const health = consecutive >= 5 ? "FAILED" : "DEGRADED";

    await ProviderSyncState.findOneAndUpdate(
      { tenantId, outletId, provider },
      {
        $set: {
          consecutiveFailures: consecutive,
          lastFailureAt: new Date(),
          syncHealth: health,
          ...(openUntil && { circuitOpenUntil: openUntil }),
        },
      },
      { upsert: true }
    );

    if (consecutive >= 5) {
      console.warn(`[SyncEngineService] Circuit breaker tripped (OPEN) for provider ${provider} at outlet ${outletId} until ${openUntil}`);
    }
  }

  static async processEvent(event: IIntegrationEventQueue, nodeId = "node-default"): Promise<void> {

    const startedAt = new Date();
    event.status = "PROCESSING";
    event.startedAt = startedAt;
    event.processingNodeId = nodeId;
    event.processingStartedAt = startedAt;
    await event.save();

    const worker = workerRegistry.get(event.eventType);
    if (!worker) {
      console.warn(`[SyncEngineService] No worker registered for event type ${event.eventType}. Marking as SUCCESS.`);
      event.status = "SUCCESS";
      event.processedAt = new Date();
      event.processingNodeId = null;
      event.processingStartedAt = null;
      await event.save();
      return;
    }

    try {

      await worker(event);

      const processedAt = new Date();
      event.status = "SUCCESS";
      event.processedAt = processedAt;
      event.processingNodeId = null;
      event.processingStartedAt = null;
      await event.save();

      const queueWaitTime = startedAt.getTime() - event.queuedAt.getTime();
      const processingTime = processedAt.getTime() - startedAt.getTime();
      const e2eTime = processedAt.getTime() - event.queuedAt.getTime();

    } catch (error: any) {
      console.error(`[SyncEngineService] Error processing event ${event._id}: ${error.message}`);

      const nextRetryCount = event.retryCount + 1;
      event.retryCount = nextRetryCount;
      event.processingNodeId = null;
      event.processingStartedAt = null;
      event.failureReason = error.message;

      if (nextRetryCount >= event.maxRetryCount) {
        event.status = "DLQ";
        event.processedAt = new Date();
        console.warn(`[SyncEngineService] Event ${event._id} moved to DLQ (max retries reached)`);
      } else {
        event.status = "FAILED";

        const backoffMs = Math.pow(2, nextRetryCount) * 2000;
        event.nextRetryAt = new Date(Date.now() + backoffMs);
      }

      await event.save();
    }
  }
}
