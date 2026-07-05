# End-to-End Workflows

This document outlines the step-by-step API flows representing core business operations in the **FoodMesh Platform**.

---

## 1. Authentication Workflow
```
[POST /auth/register] ──> [POST /auth/login] ──> [GET /auth/me]
```
- **Step 1**: Register tenant admin user via `/auth/register`.
- **Step 2**: Login via `/auth/login` to obtain access cookies and `accessToken` JWT.
- **Step 3**: Fetch profile info via `/auth/me` to ensure session persistence.

---

## 2. Online Aggregator Webhook Ordering (Swiggy / Zomato)
```
[Webhook Ingest API] ──> [Adapter Registry] ──> [Canonical Pipeline] ──> [KDS Queue]
```
- **Step 1**: Swiggy order lands at `/api/v1/integrations/mock/swiggy/orders`.
- **Step 2**: Integrations controller maps external payload structure into a unified **Canonical Order** envelope.
- **Step 3**: Order is validated against Menu Mappings. If valid, state transitions to `PLACED`, stock is decremented in `InventoryService`, and order lands in KDS.
- **Step 4**: Reject/Accept actions update aggregators via callback syncs.

---

## 3. Website Ordering Flow
```
[Outlet Slug Menu] ──> [Create Cart] ──> [Checkout Cart] ──> [POS Process]
```
- **Step 1**: Customer queries menu via `GET /public/o/:outletSlug/menu`.
- **Step 2**: Customer populates shopping cart via `POST /public/cart`.
- **Step 3**: Customer executes `POST /public/checkout` specifying name, phone, and delivery address.
- **Step 4**: Order moves through preparation (`ACCEPTED` -> `READY` -> `DELIVERED`).

---

## 4. QR Code Dine-In Operations
```
[Resolve QR Token] ──> [Place Table Order] ──> [KDS Prep] ──> [Waiter Assist] ──> [POS Bill]
```
- **Step 1**: Scan table QR. App resolves token via `GET /public/qr/resolve/:tableToken` creating a new `QRSession` and `BillSession`.
- **Step 2**: Customer posts table orders via `POST /public/qr/orders`.
- **Step 3**: Chef views tickets on KDS screen (`GET /kds/orders`).
- **Step 4**: Customer requests assistance (e.g., "WATER") via `POST /public/qr/assist` generating a waiter queue task.
- **Step 5**: POS prints session bill via `POST /billing/sessions/:sessionId/bill` finalizing taxes and restoring table status to `AVAILABLE`.
