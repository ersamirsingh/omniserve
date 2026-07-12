# Architecture Documentation

This document describes the design patterns, data flows, and system architecture of the **OmniServe Platform**.

---

## 1. Project Directory Structure

```
OmniServe
├── client/                 # React SPA Administration Panel
│   ├── src/
│   │   ├── api/            # API Service Layer client helpers
│   │   ├── app/            # App routes and Redux setup
│   │   └── pages/          # Dashboard Operations Cockpit and Integrations view
└── server/                 # Express REST API Backend
    ├── src/
    │   ├── config/         # Database and Redis settings
    │   ├── controllers/    # Route controllers (Request/Response validation)
    │   ├── middleware/     # Rate limiter, Auth protection, Role validation
    │   ├── models/         # Mongoose Schemas (Tenant, Order, Table)
    │   └── services/       # Core Business Logic (Billing, Event Bus, Realtime)
```

---

## 2. Core Service Architectures

### Event Bus Engine (`server/src/services/event-bus.service.ts`)
- Utilizes the **Transactional Outbox Pattern** to guarantee reliable event delivery.
- When an action changes state (e.g., placing an order), the database write writes the change to the `Orders` collection *and* writes a corresponding event record to the `IntegrationEventQueue` collection in the same database transaction.
- An outbox poller cron daemon polls the queue for `PENDING` states, dispatches them to external sync services, and updates the states to `SUCCESS` or `FAILED` (with automatic backoff retries).

### Realtime Socket System (`server/src/services/realtime.service.ts`)
- Powered by `socket.io`.
- Connects administration terminals (Operations Cockpit, KDS screen, Waiter dispatch dashboard) to receive immediate push alerts for new online orders, QR assistance tasks, KDS status updates, or billing completion notices without long-polling overhead.

---

## 3. Core Data Flow Pipelines

### 1. Inbound Online Order Flow (Webhook Ingestion)
```
[External Aggregators Webhook]
             │
             ▼
[IntegrationController]  ──(Authentication Bypass)
             │
             ▼
[OrderGatewayService]    ──(Validate Mappings & Tenant isolation)
             │
             ▼
 [Canonical Order pipeline]
             │
             ▼
    [InventoryService]   ──(Lazy fallback inventory allocation)
             │
             ▼
   [Socket Broadcast]    ──(Alert staff admin cockpit & KDS screen)
```

### 2. QR Code Dine-In Flow
- Customer scans table QR -> resolves table code via public router -> retrieves/creates active `QRSession` and `BillSession`.
- Customer posts menu items -> `OrderService` verifies item availability -> creates a KDS preparation ticket -> broadcasts task alert to KDS.
- Cook marks prep ready -> broadcasts update -> waiter serves order.
- Customer requests checkout -> POS compiles bill from session items -> closes bill and updates table to `AVAILABLE`.

---

## 4. Workspaces & Operational Classification (Phase 3 Split)

* **Online Cockpit** (`/operations/online`): Dedicated board for online aggregator and digital channel orders. Filters by:
  `["SWIGGY", "ZOMATO", "WEBSITE", "ONLINE", "DELIVERY", "TAKEAWAY", "ONDC", "WHATSAPP"]`
* **Dine-In Cockpit** (`/operations/dine-in`): Dedicated tabbed view (Live Floor, KDS, waiter, etc.) with a new Dine-In Orders tab. Filters by:
  `["DINE_IN", "QR_DINE_IN", "WAITER", "POS"]`
* **Compatibility Routing**: `/orders` is preserved in `mode="ALL"` to keep external deep links from notification systems functioning correctly.
* **Realtime Sync**: WebSocket events reload workspaces using a scoped backend refetch strategy based on the workspace mode.
* **Technical Debt (Source/Fulfillment Overloading)**: The persisted database `source` field currently stores both the channel origin provider and fallback fulfillment type. A future migration should separate these into `Order.source` and `Order.fulfillmentType`.
