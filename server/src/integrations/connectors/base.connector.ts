import { Types } from "mongoose";
import { IIntegrationEventQueue } from "../../models/integration-event-queue.model.js";

export abstract class MockProviderConnector {
  abstract provider: string;

  abstract syncOrderStatus(
    tenantId: Types.ObjectId,
    outletId: Types.ObjectId | null,
    connectionId: Types.ObjectId,
    event: IIntegrationEventQueue,
    payload: unknown
  ): Promise<any>;

  abstract syncInventory(
    tenantId: Types.ObjectId,
    outletId: Types.ObjectId | null,
    connectionId: Types.ObjectId,
    event: IIntegrationEventQueue,
    payload: unknown
  ): Promise<any>;

  abstract syncMenu(
    tenantId: Types.ObjectId,
    outletId: Types.ObjectId | null,
    connectionId: Types.ObjectId,
    event: IIntegrationEventQueue,
    payload: unknown
  ): Promise<any>;
}
