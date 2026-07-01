import { Types } from "mongoose";
import { MockProviderConnector } from "./base.connector.js";
import SyncJob from "../../models/syncjob.model.js";
import ProviderSyncState from "../../models/providersyncstate.model.js";
import { IntegrationProvider, SyncJobStatus, SyncJobType } from "../../types/integration.type.js";
export class MockZomatoConnector extends MockProviderConnector {
    provider = IntegrationProvider.MOCK_ZOMATO;
    async executeSync(tenantId, outletId, connectionId, event, syncType, payload) {
        console.log(`[MockZomatoConnector] Starting sync for event: ${event.eventType}, type: ${syncType}`);
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
            // Simulate mock failure check
            if (payload?.mockFailure === true ||
                event.payload?.mockFailure === true) {
                throw new Error("Simulated mock connector sync failure");
            }
            // Simulate network latency
            await new Promise((resolve) => setTimeout(resolve, 50));
            const responsePayload = {
                success: true,
                provider: "ZOMATO",
                receivedAt: new Date().toISOString(),
                referenceId: new Types.ObjectId().toString(),
            };
            syncJob.status = SyncJobStatus.SUCCESS;
            syncJob.responsePayload = responsePayload;
            syncJob.processedAt = new Date();
            await syncJob.save();
            // Update provider sync state
            await ProviderSyncState.findOneAndUpdate({ tenantId, outletId: outletId || new Types.ObjectId(), provider: this.provider }, {
                $set: {
                    lastSuccessAt: new Date(),
                    syncHealth: "HEALTHY",
                    ...(syncType === SyncJobType.MENU_SYNC && { lastMenuSyncAt: new Date() }),
                    ...(syncType === SyncJobType.INVENTORY_SYNC && { lastInventorySyncAt: new Date() }),
                    ...(syncType === SyncJobType.ORDER_STATUS_SYNC && { lastStatusSyncAt: new Date() }),
                },
            }, { upsert: true });
            console.log(`[MockZomatoConnector] Sync success for event: ${event._id}`);
            return responsePayload;
        }
        catch (error) {
            console.error(`[MockZomatoConnector] Sync failed for event ${event._id}: ${error.message}`);
            syncJob.status = SyncJobStatus.FAILED;
            syncJob.errorMessage = error.message;
            syncJob.failureReason = error.message;
            await syncJob.save();
            // Update provider sync state failure
            await ProviderSyncState.findOneAndUpdate({ tenantId, outletId: outletId || new Types.ObjectId(), provider: this.provider }, {
                $set: {
                    lastFailureAt: new Date(),
                },
            }, { upsert: true });
            throw error;
        }
    }
    async syncOrderStatus(tenantId, outletId, connectionId, event, payload) {
        return this.executeSync(tenantId, outletId, connectionId, event, SyncJobType.ORDER_STATUS_SYNC, payload);
    }
    async syncInventory(tenantId, outletId, connectionId, event, payload) {
        return this.executeSync(tenantId, outletId, connectionId, event, SyncJobType.INVENTORY_SYNC, payload);
    }
    async syncMenu(tenantId, outletId, connectionId, event, payload) {
        return this.executeSync(tenantId, outletId, connectionId, event, SyncJobType.MENU_SYNC, payload);
    }
}
