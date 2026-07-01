import { Types } from "mongoose";
import { IIntegrationEventQueue } from "../models/integration-event-queue.model.js";
import ChannelConnection from "../models/channelconnection.model.js";
import { MockSwiggyConnector } from "../integrations/connectors/mock-swiggy.connector.js";
import { MockZomatoConnector } from "../integrations/connectors/mock-zomato.connector.js";
import { SyncEngineService } from "../services/sync-engine.service.js";

import ChannelOutletMapping from "../models/channeloutletmapping.model.js";

const connectors: Record<string, any> = {
  MOCK_SWIGGY: new MockSwiggyConnector(),
  MOCK_ZOMATO: new MockZomatoConnector(),
};

export async function statusSyncWorker(event: IIntegrationEventQueue): Promise<void> {
  let connections: any[] = [];
  
  if (event.outletId) {
    const mappings = await ChannelOutletMapping.find({
      tenantId: event.tenantId,
      outletId: event.outletId,
      isActive: true,
      isDeleted: false,
    });
    const connectionIds = mappings.map(m => m.connectionId).filter(id => id !== null);
    if (connectionIds.length > 0) {
      connections = await ChannelConnection.find({
        _id: { $in: connectionIds },
        status: "ACTIVE",
        isDeleted: false,
      });
    }
  } else {
    connections = await ChannelConnection.find({
      tenantId: event.tenantId,
      status: "ACTIVE",
      isDeleted: false,
    });
  }

  if (connections.length === 0) {
    console.log(`[StatusSyncWorker] No active channel connections found for tenant ${event.tenantId}, outlet ${event.outletId}`);
    return;
  }

  for (const connection of connections) {
    // Capability Guard
    if (connection.capabilities && connection.capabilities.statusSync === false) {
      console.log(`[StatusSyncWorker] Connection ${connection._id} (${connection.provider}) does not have statusSync capability. Skipping.`);
      continue;
    }

    // Circuit Breaker check
    const isCircuitOpen = await SyncEngineService.isCircuitOpen(
      event.tenantId,
      event.outletId,
      connection.provider
    );
    if (isCircuitOpen) {
      console.log(`[StatusSyncWorker] Circuit is OPEN for provider ${connection.provider} at outlet ${event.outletId}. Skipping connection.`);
      continue;
    }

    const connector = connectors[connection.provider];
    if (!connector) {
      console.log(`[StatusSyncWorker] No connector implementation found for provider ${connection.provider}. Skipping.`);
      continue;
    }

    try {
      await connector.syncOrderStatus(
        event.tenantId,
        event.outletId,
        connection._id,
        event,
        event.payload
      );
      await SyncEngineService.handleSuccess(event.tenantId, event.outletId, connection.provider);
    } catch (error) {
      await SyncEngineService.handleFailure(event.tenantId, event.outletId, connection.provider);
      throw error;
    }
  }
}

