# Database Schema Documentation

This document describes the Mongoose models, data relationships, and indexes defined in the **FoodMesh Platform**.

---

## 1. Mongoose Collections Schema Map

### 1. Tenants (`tenants` collection)
- **Description**: Stores multi-tenant company details. All other models contain a reference pointer to this document to ensure strict tenant isolation.
- **Key Fields**:
  - `name`: String (Required)
  - `status`: String (Enum: `ACTIVE`, `SUSPENDED`)
  - `createdAt` / `updatedAt`: Date

### 2. Users (`users` collection)
- **Description**: Stores dashboard operator and client accounts.
- **Key Fields**:
  - `email`: String (Unique, Indexed)
  - `password`: String (Bcrypt encrypted)
  - `role`: String (Enum: `SYSTEM_ADMIN`, `STORE_MANAGER`, `WAITER`, `CHEF`, `CUSTOMER`)
  - `tenantId`: ObjectId (Ref: `Tenant`)

### 3. Outlets (`outlets` collection)
- **Description**: Physical location profiles.
- **Key Fields**:
  - `name`: String
  - `restaurantId`: ObjectId (Ref: `Restaurant`)
  - `address`: Object (Street, City, GeoJSON coordinates)

### 4. Menu Items & Categories
- **Menu Items (`menuitems` collection)**:
  - `name`: String
  - `price`: Number
  - `outletId`: ObjectId (Ref: `Outlet`)
  - `status`: String (Enum: `AVAILABLE`, `OUT_OF_STOCK`)
- **Categories (`categories` collection)**:
  - `name`: String
  - `outletId`: ObjectId (Ref: `Outlet`)

### 5. Orders (`orders` collection)
- **Description**: Core transaction log.
- **Key Fields**:
  - `externalOrderId`: String (Optional, for aggregator imports)
  - `status`: String (Enum: `PENDING`, `ACCEPTED`, `PREPARING`, `READY`, `DELIVERED`, `CANCELLED`)
  - `orderType`: String (Enum: `DINE_IN`, `DELIVERY`, `TAKEAWAY`)
  - `outletId`: ObjectId (Ref: `Outlet`)
  - `items`: Array of OrderItems (Subdocument reference)

### 6. Billing Sessions (`billsessions` collection)
- **Description**: Manages table sessions POS state.
- **Key Fields**:
  - `qrSessionId`: ObjectId (Ref: `QRSession`)
  - `orders`: Array of ObjectIds (Ref: `Order`)
  - `status`: String (Enum: `OPEN`, `PAID`)
  - `subtotal`: Number
  - `tax`: Number
  - `total`: Number

---

## 2. Strict Indexes

To guarantee maximum database performance:
1. `users.email` is uniquely indexed.
2. `externalorders.externalOrderId` has a compound unique index with `provider` to prevent double-ingestion of the same aggregator order event.
3. Geo-spatial index `2dsphere` is configured on `outlets.address.location` to support nearby location range queries.
