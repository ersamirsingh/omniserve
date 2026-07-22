import { IntegrationAdapter } from "./integration-adapter.interface.js";
import { MockSwiggyAdapter } from "./mock-swiggy.adapter.js";
import { MockZomatoAdapter } from "./mock-zomato.adapter.js";
import { QrAdapter } from "./qr.adapter.js";
import { WebsiteAdapter } from "./website.adapter.js";
import { OrderGatewayService } from "../../modules/order/ordergateway.service.js";
import { IntegrationProvider } from "../../types/integration.type.js";

const mockSwiggy = new MockSwiggyAdapter();
const mockZomato = new MockZomatoAdapter();
const qrAdapter = new QrAdapter();
const websiteAdapter = new WebsiteAdapter();

OrderGatewayService.registerAdapter(mockSwiggy);
OrderGatewayService.registerAdapter(mockZomato);
OrderGatewayService.registerAdapter(qrAdapter);
OrderGatewayService.registerAdapter(websiteAdapter);

const localRegistry = new Map<string, IntegrationAdapter>();
localRegistry.set(IntegrationProvider.MOCK_SWIGGY, mockSwiggy);
localRegistry.set(IntegrationProvider.SWIGGY, mockSwiggy);
localRegistry.set(IntegrationProvider.MOCK_ZOMATO, mockZomato);
localRegistry.set(IntegrationProvider.ZOMATO, mockZomato);
localRegistry.set(IntegrationProvider.QR, qrAdapter);
localRegistry.set(IntegrationProvider.WEBSITE, websiteAdapter);

export function getAdapter(provider: string): IntegrationAdapter {
  const key = String(provider).toUpperCase();
  const adapter = localRegistry.get(key);
  if (!adapter) {
    throw new Error(`No adapter found for provider: ${provider}`);
  }
  return adapter;
}
