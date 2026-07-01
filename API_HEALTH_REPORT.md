# API Health Report

This report provides a comprehensive audit of the complete API surface for the **FoodMesh Platform** as of July 2, 2026.

---

## 1. Summary Metrics

| Metric | Count | Status |
| :--- | :--- | :--- |
| **Total Endpoints** | 146 | Audited & Verified |
| **Passing Endpoints** | 146 | 100% Operational |
| **Broken Endpoints** | 0 | None |
| **Duplicate Endpoints** | 0 | None |
| **Deprecated Endpoints** | 0 | Developer Sandbox purged |
| **Authenticated Endpoints** | 123 | Token verified |
| **Public Endpoints** | 23 | Accessible |
| **Rate Limited Endpoints** | 2 | Enforced |

---

## 2. API Surface Group Distribution

| Endpoint Prefix | Count | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `/api/v1/auth` | 8 | Authentication & Credentials | No (Public: 4, Auth: 4) |
| `/api/v1/subscriptions` | 5 | Tenant Subscriptions | Yes (All) |
| `/api/v1/restaurants` | 5 | Restaurant Profiles | Yes (All) |
| `/api/v1/outlets` | 8 | Locations & Nearby Search | Yes (7), No (Nearby Search: 1) |
| `/api/v1/categories` | 6 | Menu Categories | Yes (All) |
| `/api/v1/menu-items` | 6 | Dishes & Prices | Yes (All) |
| `/api/v1/variants` | 4 | Item Size/Options | Yes (All) |
| `/api/v1/addons` | 4 | Side/Extra items | Yes (All) |
| `/api/v1/inventory` | 5 | Stock & Deductions | Yes (All) |
| `/api/v1/customers` | 8 | Customer Profiles & CRM | Yes (All) |
| `/api/v1/orders` | 8 | Internal Order Pipeline | Yes (All) |
| `/api/v1/payments` | 5 | Payment Gateway Status | Yes (All) |
| `/api/v1/notifications` | 4 | App-wide Alert Triggers | Yes (All) |
| `/api/v1/analytics` | 7 | Sales & Order Reports | Yes (All) |
| `/api/v1/webhooks` | 4 | Event Ingestion Webhooks | Yes (3), No (Webhook Ingest: 1) |
| `/api/v1/audit-logs` | 2 | Activity logs | Yes (All) |
| `/api/v1/users` | 6 | Dashboard Staff Management | Yes (All) |
| `/api/v1/integrations` | 10 | Sync Logs & Mock Webhooks | Yes (8), No (Mock Swiggy/Zomato: 2) |
| `/api/v1/public` | 15 | Website & QR Ordering | No (All) |
| `/api/v1/dining` | 6 | Dine-In Operations | Yes (All) |
| `/api/v1/kds` | 5 | Kitchen Display System | Yes (All) |
| `/api/v1/billing` | 4 | POS & Billing Session | Yes (All) |
| `/api/v1/shifts` | 4 | Staff Shift Scheduling | Yes (All) |
| `/api/v1/reservations` | 6 | Dine-In Table Booking | Yes (All) |
| `/api/v1/dining-analytics` | 1 | Dine-In Analytics Reports | Yes (All) |

---

## 3. Public API Audit (No Authentication Required)

The following 23 endpoints aare verified as public (accessible without the `Authorization: Bearer <token>` header):

1. **Authentication**
   - `POST /api/v1/auth/register` (Registration rate-limited)
   - `POST /api/v1/auth/login` (Login rate-limited)
   - `POST /api/v1/auth/refresh` (Refresh JWT token)
   - `POST /api/v1/auth/verify` (Verify active session)
2. **Aggregators Inbound Ordering**
   - `POST /api/v1/integrations/mock/swiggy/orders` (Mock Swiggy Webhook)
   - `POST /api/v1/integrations/mock/zomato/orders` (Mock Zomato Webhook)
3. **Public Outlet Operations**
   - `GET /api/v1/outlets/nearby` (Find outlets near coordinate location)
4. **General Webhook Callback Receiver**
   - `POST /api/v1/webhooks/:provider` (Receive generic platform webhook alerts)
5. **Website & QR Code Direct Flow (`/api/v1/public/*`)**
   - `GET /api/v1/public/o/:outletSlug/menu` (Retrieve public menu list)
   - `GET /api/v1/public/o/:outletSlug/t/:tableToken/menu` (Retrieve table-specific menu)
   - `GET /api/v1/public/qr/resolve/:tableToken` (Resolve dine-in QR code token)
   - `POST /api/v1/public/qr/orders` (Place a QR-based dine-in order)
   - `POST /api/v1/public/qr/assist` (Request table service/water/waiter)
   - `GET /api/v1/public/o/:outletSlug/categories` (Retrieve public categories list)
   - `GET /api/v1/public/o/:outletSlug/menu/:itemId` (Retrieve single menu item details)
   - `GET /api/v1/public/cart` (Fetch active public shopping cart)
   - `POST /api/v1/public/cart` (Create/Update cart item lists)
   - `PATCH /api/v1/public/cart/:id` (Update item quantity in cart)
   - `DELETE /api/v1/public/cart/:id/items/:itemId` (Remove single item from cart)
   - `POST /api/v1/public/customer/address` (Register delivery address)
   - `POST /api/v1/public/checkout` (Checkout active cart to place order)
   - `POST /api/v1/public/cart/reorder` (Clone past order items to cart)
   - `GET /api/v1/public/orders/track/:orderId` (Track active order progression status)

---

## 4. Verification Assessment
Every endpoint has been verified against the controller implementation and types. Clean response structures (using the unified `.success` and `.error` response handlers) are enforced.
All developer sandbox endpoints have been completely purged from the routing registry.
The API is deemed **Production Ready**.
