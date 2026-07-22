import { Types } from "mongoose";
import { MockProviderConnector } from "./base.connector.js";
import { IIntegrationEventQueue } from "../../models/integration-event-queue.model.js";
import SyncJob from "../../models/syncjob.model.js";
import ProviderSyncState from "../../models/providersyncstate.model.js";
import { IntegrationProvider, SyncJobStatus, SyncJobType } from "../../types/integration.type.js";

export class MockSwiggyConnector extends MockProviderConnector {
  provider = IntegrationProvider.MOCK_SWIGGY;

  private async executeSync(
    tenantId: Types.ObjectId,
    outletId: Types.ObjectId | null,
    connectionId: Types.ObjectId,
    event: IIntegrationEventQueue,
    syncType: SyncJobType,
    payload: unknown
  ): Promise<any> {

    const syncJob = new SyncJob({
      tenantId,
      outletId,
      connectionId,
      provider: this.provider,
      type: syncType,
      status: SyncJobStatus.PROCESSING,
      payload,
      eventId: event._id,
      correlationId: event.correlationId,
      retryCount: event.retryCount,
      maxRetryCount: event.maxRetryCount,
      idempotencyKey: `${event._id.toString()}-${syncType}-${connectionId.toString()}-${event.retryCount}`,
    });

    await syncJob.save();

    try {

      if (
        (payload as any)?.mockFailure === true ||
        (event.payload as any)?.mockFailure === true
      ) {
        throw new Error("Simulated mock connector sync failure");
      }

      await new Promise((resolve) => setTimeout(resolve, 50));

      const responsePayload = {
        success: true,
        provider: "SWIGGY",
        receivedAt: new Date().toISOString(),
        referenceId: new Types.ObjectId().toString(),
      };

      syncJob.status = SyncJobStatus.SUCCESS;
      syncJob.responsePayload = responsePayload;
      syncJob.processedAt = new Date();
      await syncJob.save();

      await ProviderSyncState.findOneAndUpdate(
        { tenantId, outletId: outletId || new Types.ObjectId(), provider: this.provider },
        {
          $set: {
            lastSuccessAt: new Date(),
            syncHealth: "HEALTHY",
            ...(syncType === SyncJobType.MENU_SYNC && { lastMenuSyncAt: new Date() }),
            ...(syncType === SyncJobType.INVENTORY_SYNC && { lastInventorySyncAt: new Date() }),
            ...(syncType === SyncJobType.ORDER_STATUS_SYNC && { lastStatusSyncAt: new Date() }),
          },
        },
        { upsert: true }
      );

      return responsePayload;
    } catch (error: any) {
      console.error(`[MockSwiggyConnector] Sync failed for event ${event._id}: ${error.message}`);

      syncJob.status = SyncJobStatus.FAILED;
      syncJob.errorMessage = error.message;
      syncJob.failureReason = error.message;
      await syncJob.save();

      await ProviderSyncState.findOneAndUpdate(
        { tenantId, outletId: outletId || new Types.ObjectId(), provider: this.provider },
        {
          $set: {
            lastFailureAt: new Date(),
          },
        },
        { upsert: true }
      );

      throw error;
    }
  }

  async syncOrderStatus(
    tenantId: Types.ObjectId,
    outletId: Types.ObjectId | null,
    connectionId: Types.ObjectId,
    event: IIntegrationEventQueue,
    payload: unknown
  ): Promise<any> {
    return this.executeSync(
      tenantId,
      outletId,
      connectionId,
      event,
      SyncJobType.ORDER_STATUS_SYNC,
      payload
    );
  }

  async syncInventory(
    tenantId: Types.ObjectId,
    outletId: Types.ObjectId | null,
    connectionId: Types.ObjectId,
    event: IIntegrationEventQueue,
    payload: unknown
  ): Promise<any> {
    return this.executeSync(
      tenantId,
      outletId,
      connectionId,
      event,
      SyncJobType.INVENTORY_SYNC,
      payload
    );
  }

  async syncMenu(
    tenantId: Types.ObjectId,
    outletId: Types.ObjectId | null,
    connectionId: Types.ObjectId,
    event: IIntegrationEventQueue,
    payload: unknown
  ): Promise<any> {
    return this.executeSync(
      tenantId,
      outletId,
      connectionId,
      event,
      SyncJobType.MENU_SYNC,
      payload
    );
  }
}
