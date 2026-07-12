# API Reference Documentation

This document provides a comprehensive API specification for the core business domains of the **OmniServe Platform**.

---

## 1. Authentication (`/api/v1/auth`)

### POST `/auth/register`
- **Purpose**: Create a new tenant enterprise and register the primary System Admin user.
- **Authentication**: None (Public).
- **Rate Limit**: Max 15 requests per 15 minutes.
- **Request Body**:
  ```json
  {
    "email": "admin@palace.com",
    "password": "Password123!",
    "firstName": "System",
    "lastName": "Admin",
    "tenantName": "Burger Palace Group"
  }
  ```
- **Validation**:
  - `email`: Valid format required, must be unique.
  - `password`: At least 8 characters, containing uppercase, lowercase, numbers, and special symbols.
- **Response (`201 Created`)**:
  ```json
  {
    "success": true,
    "message": "User registered successfully",
    "user": {
      "id": "tenant_admin_id",
      "tenantId": "tenant_guid",
      "email": "admin@palace.com",
      "role": "SYSTEM_ADMIN"
    }
  }
  ```

### POST `/auth/login`
- **Purpose**: Authenticate user credentials and issue active HTTP-only cookies and payload tokens.
- **Authentication**: None (Public).
- **Request Body**:
  ```json
  {
    "email": "admin@palace.com",
    "password": "Password123!"
  }
  ```
- **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "accessToken": "jwt_header_payload_signature",
      "refreshToken": "refresh_token_guid"
    }
  }
  ```

---

## 2. Restaurants & Outlets (`/api/v1/restaurants`, `/api/v1/outlets`)

### POST `/restaurants`
- **Purpose**: Provision a new brand/restaurant entity under the tenant.
- **Authentication**: Bearer JWT.
- **Request Body**:
  ```json
  {
    "name": "Burger Palace",
    "cuisineType": ["Burgers", "Fast Food"]
  }
  ```
- **Response (`201 Created`)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "restaurant_id",
      "name": "Burger Palace",
      "tenantId": "tenant_id"
    }
  }
  ```

### POST `/outlets`
- **Purpose**: Create a physical outlet location under a restaurant brand.
- **Authentication**: Bearer JWT.
- **Request Body**:
  ```json
  {
    "name": "Connaught Place Outlet",
    "restaurantId": "restaurant_id",
    "address": {
      "street": "H-Block",
      "city": "New Delhi",
      "location": {
        "type": "Point",
        "coordinates": [77.2197, 28.6304]
      }
    }
  }
  ```
- **Response (`201 Created`)**: Returns outlet details including mapping codes.

---

## 3. Public Web & QR ordering (`/api/v1/public`)

### GET `/public/o/:outletSlug/menu`
- **Purpose**: Fetch public digital menu for delivery/takeaway matching active outlet.
- **Authentication**: None (Public).
- **Response (`200 OK`)**: Returns category-grouped lists of items, variants, and addon groups.

### GET `/public/qr/resolve/:tableToken`
- **Purpose**: Resolve table token and create or retrieve active QR customer dine-in session.
- **Authentication**: None (Public).
- **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "tableId": "table_id",
      "tableName": "Table 1",
      "sessionId": "qr_session_id",
      "status": "ACTIVE"
    }
  }
  ```

### POST `/public/qr/orders`
- **Purpose**: Place an order from the resolved QR session directly to KDS.
- **Authentication**: None (Public).
- **Request Body**:
  ```json
  {
    "tableToken": "table_token_string",
    "customerName": "John Doe",
    "customerPhone": "9876543210",
    "items": [
      {
        "menuItemId": "menu_item_id",
        "quantity": 2
      }
    ]
  }
  ```
- **Response (`201 Created`)**: Returns placed order ticket and logs KDS ticket.

---

## 4. Kitchen Display System (`/api/v1/kds`)

### GET `/kds/orders`
- **Purpose**: Retrieve KDS tickets queue.
- **Authentication**: Bearer JWT.
- **Response (`200 OK`)**: Returns an array of items grouped by cooking status (`PENDING`, `PREPARING`, `READY`).
