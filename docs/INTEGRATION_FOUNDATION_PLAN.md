# Integration Foundation Implementation Plan

## Scope

This layer prepares FoodMesh for QR ordering and future aggregator adapters without integrating any real provider yet.

The rule is strict:

```text
ExternalOrder -> CanonicalOrder -> OrderService
```

External channels must never create or mutate `Order` documents directly.

## Added Foundation Components

### ChannelConnection

Stores tenant-level provider connection settings, encrypted credential placeholders, webhook secret placeholders, and sync flags.

Purpose:

- Keep provider credentials out of adapters.
- Enable per-tenant connection status.
- Control menu, inventory, and status sync behavior.

### ChannelOutletMapping

Maps an external provider outlet/store ID to a FoodMesh `Outlet`.

Purpose:

- Resolve which FoodMesh outlet should receive an external order.
- Keep tenant isolation around external outlet IDs.

### ChannelMenuItemMapping

Maps external item IDs to FoodMesh `MenuItem` IDs.

Purpose:

- Translate provider payload items into internal order items.
- Support channel-specific price overrides later.

### ChannelVariantMapping

Maps external variant IDs to FoodMesh `Variant` IDs.

Purpose:

- Keep provider-specific size/flavor/variation IDs outside the core order schema.

### ChannelAddonMapping

Maps external addon/modifier IDs to FoodMesh `Addon` IDs.

Purpose:

- Support provider modifiers without changing the existing addon model.

### ExternalOrder

Stores raw provider orders, canonical payloads, internal order linkage, retry state, and DLQ state.

Purpose:

- Idempotency via `tenantId + provider + externalOrderId`.
- No direct write to `Order` from external payloads.
- Trace every external order before and after internal order placement.

### IntegrationEvent

Stores integration lifecycle events for inbound, outbound, and internal gateway actions.

Purpose:

- Always provide an integration audit trail, even when no authenticated `userId` exists.
- Track retry/DLQ status for event processing.

### SyncJob

Stores outbound provider sync work such as menu publish, inventory updates, order ACK, and status updates.

Purpose:

- Prepare async status/menu/inventory sync.
- Support retries and DLQ without adding real provider calls yet.

### IntegrationAdapter Interface

Defines the contract every adapter must implement:

- `verifySignature`
- `normalizeOrder`
- `mapStatusToInternal`
- `mapStatusToProvider`
- `buildMenuPayload`
- `buildInventoryPayload`

### OrderGatewayService

The gateway service owns the external order path:

1. Ingest raw external order.
2. Enforce idempotency.
3. Write `ExternalOrder`.
4. Write `IntegrationEvent`.
5. Dispatch adapter normalization.
6. Convert `CanonicalOrder` to internal order payload.
7. Resolve customer and mappings.
8. Call existing `OrderService.placeOrder`.
9. Link resulting internal order back to `ExternalOrder`.
10. Mark retry or DLQ-ready status on failure.
11. Optionally call existing `AuditLogService` when an authenticated actor exists.

## Preserved Existing Modules

No behavior was changed in:

- `OrderService`
- `InventoryService`
- `PaymentService`
- `AnalyticsService`
- `NotificationService`
- `WebhookLog`

The new foundation sits around these modules rather than replacing them.

## Retry And DLQ Readiness

The foundation includes:

- `retryCount`
- `maxRetryCount`
- `nextRetryAt`
- `failureReason`
- `dlqReason`
- statuses like `RETRY_PENDING` and `DLQ`

A future worker can query records by `status + nextRetryAt` and move exhausted jobs/events/orders into DLQ state.

## Tenant Isolation

All new persistence models include `tenantId` and tenant-scoped indexes.

Provider order idempotency is enforced by:

```text
tenantId + provider + externalOrderId
```

This prevents one tenant's provider order ID from colliding with another tenant's data.

## Next Adapter Sequence

### 1. QRAdapter

Build first because QR is under FoodMesh control and does not require partner API access.

Expected flow:

```text
QR payload -> ExternalOrder -> QRAdapter.normalizeOrder -> CanonicalOrder -> OrderService
```

QR-specific next models can include:

- DiningArea
- Table
- QRSession
- BillSession

### 2. MockSwiggyAdapter

Build second for aggregator-style testing without real Swiggy APIs.

Expected flow:

```text
Mock Swiggy payload -> ExternalOrder -> MockSwiggyAdapter.normalizeOrder -> mappings -> CanonicalOrder -> OrderService
```

This validates provider item IDs, duplicate webhooks, customer upsert, mapping failures, retry, and DLQ paths.

### 3. Real Providers Later

Only after QRAdapter and MockSwiggyAdapter pass end-to-end tests should real provider integrations be considered.

Real Swiggy/Zomato/ONDC work will require official API access, provider-specific auth/signature rules, certification flows, and outbound status/menu/inventory APIs.
