# FoodMesh Order Aggregation Architecture

## Goal

FoodMesh should not expose `POST /api/orders` directly to Swiggy, Zomato, ONDC, QR ordering, or delivery partners.

The existing order API is an internal order engine. External channels need a professional ingestion layer that receives provider-specific payloads, verifies them, stores the raw event, maps external IDs to FoodMesh IDs, normalizes the data, and then creates or updates the internal order.

Target architecture:

```text
Swiggy / Zomato / ONDC / Magicpin / QR / Website / WhatsApp
        |
        v
Order Gateway
        |
        v
Provider Adapter Layer
        |
        v
Canonical Order Model
        |
        v
Mapping + Validation + Idempotency
        |
        v
FoodMesh Order Engine
        |
        +--> Inventory
        +--> Kitchen/KOT
        +--> Payments
        +--> Notifications
        +--> Analytics
        +--> Outbound status sync
        +--> Menu and stock sync
```

## Current Readiness

FoodMesh already has a solid restaurant ERP/POS core:

- Multi-tenant users, restaurants, outlets, and access scope.
- Menu items, categories, variants, addons, and inventory.
- Internal order lifecycle with strict status transitions.
- Inventory deduction on order acceptance.
- Customer database with phone-based CRM potential.
- Payment records and payment webhook handling.
- Webhook logging with status, retry count, event ID, and 90-day TTL.
- Notifications and analytics foundations.

Estimated maturity:

- Restaurant/POS core: 70-80%.
- Integration gateway layer: 20-30%.
- Overall UrbanPiper-style platform readiness: 45-55%.

The biggest missing piece is not another CRUD module. It is the integration infrastructure between external channels and the internal order engine.

## Why The Sample Swiggy Payload Should Not Hit `/api/orders`

Example external payload:

```json
{
  "order_id": "SW12345",
  "customer": {
    "name": "Rahul",
    "phone": "9876543210"
  },
  "items": [
    {
      "item_id": "1001",
      "name": "Veg Burger",
      "quantity": 2,
      "price": 180
    }
  ],
  "payment_mode": "ONLINE",
  "delivery_address": {
    "line1": "ABC Road",
    "city": "Bhopal"
  }
}
```

This is a channel payload, not an internal FoodMesh order.

It lacks:

- FoodMesh `tenantId`.
- FoodMesh `outletId`.
- FoodMesh `customerId`.
- FoodMesh `menuItemId`.
- Valid internal `source`.
- Internal payment status.
- Canonical tax, discount, fee, and total breakdown.
- Idempotency logic for duplicate webhooks.
- Signature/security context.

Correct flow:

```text
POST /api/integrations/swiggy/orders
        |
        v
SwiggyAdapter.normalizeOrder()
        |
        v
resolve outlet, customer, item mappings
        |
        v
OrderService.placeOrder(...)
```

## Required New Domain Models

### ChannelConnection

Stores provider account credentials and settings per tenant/outlet.

```ts
{
  tenantId: ObjectId;
  outletId: ObjectId;
  provider: "SWIGGY" | "ZOMATO" | "ONDC" | "MAGICPIN" | "QR" | "WEBSITE";
  externalMerchantId: string;
  externalOutletId: string;
  status: "ACTIVE" | "PAUSED" | "ERROR";
  credentialsEncrypted: string;
  webhookSecretEncrypted?: string;
  settings: {
    autoAcceptOrders: boolean;
    syncMenu: boolean;
    syncInventory: boolean;
    prepTimeMinutes?: number;
  };
  lastSyncAt?: Date;
}
```

### ChannelItemMapping

Maps provider item IDs to FoodMesh menu items, variants, and addons.

```ts
{
  tenantId: ObjectId;
  outletId: ObjectId;
  provider: string;
  externalItemId: string;
  externalVariantId?: string;
  externalAddonIds?: string[];
  menuItemId: ObjectId;
  variantId?: ObjectId;
  addonIds?: ObjectId[];
  priceOverride?: number;
  isActive: boolean;
}
```

### ExternalOrder

Keeps raw provider order identity, deduplication, sync status, and outbound tracking separate from the internal `Order`.

```ts
{
  tenantId: ObjectId;
  outletId: ObjectId;
  provider: string;
  externalOrderId: string;
  externalDisplayId?: string;
  internalOrderId?: ObjectId;
  status: "RECEIVED" | "NORMALIZED" | "PLACED" | "FAILED" | "CANCELLED";
  rawPayload: unknown;
  normalizedPayload?: CanonicalOrder;
  failureReason?: string;
  receivedAt: Date;
  processedAt?: Date;
}
```

### DiningArea, Table, QRSession

For offline/QR ordering, do not overload customer or order notes.

```ts
{
  tenantId: ObjectId;
  outletId: ObjectId;
  name: string; // Ground Floor, Patio, Cabin A
}
```

```ts
{
  tenantId: ObjectId;
  outletId: ObjectId;
  diningAreaId?: ObjectId;
  tableNumber: string;
  seatCount?: number;
  qrCodeToken: string;
  status: "ACTIVE" | "INACTIVE";
}
```

```ts
{
  tenantId: ObjectId;
  outletId: ObjectId;
  tableId: ObjectId;
  sessionToken: string;
  customerId?: ObjectId;
  seatNumber?: string;
  status: "OPEN" | "ORDERED" | "PAID" | "CLOSED";
  openedAt: Date;
  closedAt?: Date;
}
```

## Canonical Order Model

Every channel should normalize into this before calling the internal order engine.

```ts
type CanonicalOrder = {
  source:
    | "SWIGGY"
    | "ZOMATO"
    | "ONDC"
    | "MAGICPIN"
    | "QR_DINE_IN"
    | "WEBSITE"
    | "POS"
    | "WAITER";

  provider: string;
  externalOrderId?: string;
  externalDisplayId?: string;

  tenantId: string;
  outletId: string;

  customer: {
    externalCustomerId?: string;
    name?: string;
    phone?: string;
    email?: string;
    address?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      pincode?: string;
      latitude?: number;
      longitude?: number;
    };
  };

  fulfillment: {
    type: "DINE_IN" | "TAKEAWAY" | "DELIVERY";
    tableId?: string;
    tableNumber?: string;
    seatNumber?: string;
    expectedPickupAt?: string;
    deliveryPartner?: string;
  };

  payment: {
    mode: "ONLINE" | "COD" | "CASH" | "CARD" | "UPI" | "WALLET";
    status: "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";
    transactionId?: string;
  };

  pricing: {
    subtotal: number;
    tax: number;
    deliveryFee: number;
    discount: number;
    packagingFee?: number;
    platformFee?: number;
    totalAmount: number;
  };

  items: Array<{
    externalItemId?: string;
    menuItemId: string;
    variantId?: string;
    name: string;
    quantity: number;
    unitPrice: number;
    notes?: string;
    addons?: Array<{
      externalAddonId?: string;
      addonId: string;
      name: string;
      price: number;
    }>;
  }>;

  notes?: string;
  rawPayloadRef?: string;
};
```

## Adapter Interface

Each provider should implement the same interface.

```ts
interface IntegrationAdapter {
  provider: string;

  verifySignature(args: {
    rawBody: string;
    headers: Record<string, unknown>;
    connection: ChannelConnection;
  }): Promise<boolean>;

  normalizeOrder(args: {
    payload: unknown;
    connection: ChannelConnection;
  }): Promise<CanonicalOrder>;

  mapStatusToInternal(providerStatus: string): OrderStatus;
  mapStatusToProvider(internalStatus: OrderStatus): string;

  buildMenuPayload(args: {
    outletId: string;
    menuItems: unknown[];
    categories: unknown[];
    variants: unknown[];
    addons: unknown[];
  }): Promise<unknown>;

  buildInventoryPayload(args: {
    outletId: string;
    changedItems: unknown[];
  }): Promise<unknown>;
}
```

Suggested folder structure:

```text
server/src/integrations/
  adapters/
    swiggy.adapter.ts
    zomato.adapter.ts
    ondc.adapter.ts
    magicpin.adapter.ts
    qr.adapter.ts
  services/
    order-gateway.service.ts
    channel-mapping.service.ts
    channel-menu-sync.service.ts
    channel-inventory-sync.service.ts
    outbound-status-sync.service.ts
  models/
    channelconnection.model.ts
    channelitemmapping.model.ts
    externalorder.model.ts
    syncjob.model.ts
```

## Order Gateway Flow

1. Receive provider webhook.
2. Identify provider and channel connection.
3. Verify signature or token.
4. Create `WebhookLog` and `ExternalOrder`.
5. Check idempotency using `provider + externalOrderId`.
6. Normalize payload through provider adapter.
7. Resolve or create customer by tenant and phone.
8. Resolve outlet from `ChannelConnection`.
9. Resolve items from `ChannelItemMapping`.
10. Validate totals.
11. Call internal `OrderService.placeOrder`.
12. Save internal order ID against `ExternalOrder`.
13. Emit events for kitchen, inventory, notifications, analytics, and outbound provider sync.

## QR Dine-In Flow

QR ordering is not an external aggregator, but it should still go through the same gateway style because it is an external customer-facing channel.

```text
Customer scans QR
        |
GET /public/o/:outletSlug/t/:tableToken/menu
        |
Customer selects items and seat number
        |
POST /public/qr/orders
        |
QRAdapter.normalizeOrder()
        |
OrderService.placeOrder(source = DINE_IN)
        |
Kitchen receives table + seat context
```

Important QR features:

- Table-specific QR tokens, not simple table IDs.
- Optional seat number.
- Temporary QR session.
- Menu availability filtered by outlet and inventory.
- Staff dashboard grouped by table.
- Split bill later through `OrderGroup` or `BillSession`.

## Event-Driven Layer

The current code uses `setImmediate()` for background webhook processing. This is acceptable for local demos but not for production. If the Node process crashes after ACK but before processing, the event can be stuck until manual retry.

Use Redis-backed queues first because Redis already exists in the backend dependencies.

Recommended queues:

- `order.ingest`
- `order.created`
- `order.status.changed`
- `inventory.changed`
- `menu.sync.requested`
- `provider.status.sync`
- `provider.dead_letter`

Recommended library:

- BullMQ if adding a production queue package is acceptable.
- Native Redis streams if avoiding new dependencies.

## Menu And Inventory Sync

This is the real UrbanPiper-style moat.

When an item becomes unavailable or inventory reaches zero:

```text
Inventory changes
        |
InventoryChanged event
        |
Find connected channels for outlet
        |
Build provider-specific stock/menu payload
        |
Push sold-out/update request
        |
Track SyncJob status and retries
```

Required `SyncJob` model:

```ts
{
  tenantId: ObjectId;
  outletId: ObjectId;
  provider: string;
  type: "MENU_PUBLISH" | "INVENTORY_UPDATE" | "STATUS_UPDATE";
  payload: unknown;
  status: "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED";
  retryCount: number;
  nextRetryAt?: Date;
  errorMessage?: string;
}
```

## Status Mapping

Internal statuses should stay clean. Provider-specific statuses should live in adapters.

```text
Provider placed/new      -> PENDING
Restaurant accepted      -> ACCEPTED
Kitchen preparing        -> PREPARING
Food ready               -> READY
Rider picked up          -> PICKED_UP
Delivered/completed      -> DELIVERED
Cancelled/rejected       -> CANCELLED
```

Avoid forcing provider-specific states into the core `OrderStatus` enum unless the business truly needs them.

## Roadmap

### Phase A: Integration Foundation

- Add `ChannelConnection`.
- Add `ChannelItemMapping`.
- Add `ExternalOrder`.
- Add `SyncJob`.
- Add adapter interface.
- Add order gateway service.
- Add idempotency tests.

Complexity: Medium.

### Phase B: QR And Internal Online Ordering

- Add dining areas, tables, QR sessions.
- Public outlet menu endpoint.
- Public QR order endpoint.
- Kitchen/staff view with table and seat context.

Complexity: Medium.

This should come before Swiggy/Zomato because it uses your own data and proves the canonical order pipeline without partner access.

### Phase C: Swiggy/Zomato-Style Sandbox Adapter

- Build mock adapters first using realistic payload shapes.
- Ingest external order.
- Normalize to canonical order.
- Resolve customer and item mappings.
- Create internal order.
- Sync internal status back to mock provider log.

Complexity: Medium.

### Phase D: Production Aggregator Connectors

- Add provider-specific auth.
- Add provider-specific signature checks.
- Add outbound order accept/reject/status APIs.
- Add real menu publish and stock update APIs when partner access is available.

Complexity: High because partner APIs and certification are gated.

### Phase E: Menu And Inventory Sync Engine

- Publish menu to connected channels.
- Push item availability updates.
- Support channel-specific pricing.
- Track sync jobs and failures.

Complexity: High.

### Phase F: Delivery Partner Layer

- Porter/Dunzo/Shadowfax style booking.
- Delivery quote, booking, tracking, cancellation.
- Rider details and ETA updates.

Complexity: Medium to High.

### Phase G: AI And Automation

- Demand forecasting.
- Prep time prediction.
- Auto-stock-out risk alerts.
- WhatsApp ordering.
- Voice/call ordering.

Complexity: High, but very valuable after the order and inventory event pipeline exists.

## Immediate Next Build

Build this first:

1. `ChannelConnection`
2. `ChannelItemMapping`
3. `ExternalOrder`
4. `OrderGatewayService`
5. `QRAdapter`
6. `MockSwiggyAdapter`

Do not start with real Swiggy API integration. Start with the architecture that can support Swiggy, Zomato, ONDC, QR ordering, and any future channel.

The first success milestone should be:

```text
Mock Swiggy payload -> FoodMesh gateway -> canonical order -> customer upsert -> item mapping -> internal order -> kitchen/order dashboard
```

Then:

```text
QR table order -> same gateway -> internal order with table and seat context
```

Once these work, real aggregator APIs become mostly credential, signature, and payload-specific adapter work.
