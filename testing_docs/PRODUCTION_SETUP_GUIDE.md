# Production Setup & Bootstrapping Guide

This guide explains how to bootstrap a fresh deployment of the **OmniServe Platform** using only API calls.

---

## 1. System Bootstrapping Order

To test both online aggregator delivery and offline dine-in workflows, the system requires records to exist in a specific hierarchical order:

```
Tenant Admin (User)
  └── Restaurant Profile
        └── Outlet Location
              ├── Menu Categories & Items
              │     ├── Variants & Addons
              │     ├── Inventory Records
              │     └── Channel Mappings (Swiggy/Zomato)
              └── Dining Areas & Tables (QR Tokens)
```

---

## 2. Step-by-Step Seeding via API

### Step 1: Create Tenant & Admin User
- **Endpoint**: `POST /api/v1/auth/register`
- **Body**:
  ```json
  {
    "email": "admin@myburgers.com",
    "password": "Password123!",
    "firstName": "Alex",
    "lastName": "Johnson",
    "tenantName": "Alex Food Ventures"
  }
  ```
- **Action**: Extract `JWT_TOKEN` from the login response.

### Step 2: Establish Restaurant Brand
- **Endpoint**: `POST /api/v1/restaurants`
- **Headers**: `Authorization: Bearer {{JWT_TOKEN}}`
- **Body**:
  ```json
  {
    "name": "Burger Factory",
    "cuisineType": ["Burgers", "Fast Food"]
  }
  ```
- **Action**: Save the generated `restaurantId` as `{{RESTAURANT_ID}}`.

### Step 3: Create Outlet Location
- **Endpoint**: `POST /api/v1/outlets`
- **Body**:
  ```json
  {
    "name": "South Extension Location",
    "restaurantId": "{{RESTAURANT_ID}}",
    "address": {
      "street": "E-Block Market",
      "city": "New Delhi",
      "location": {
        "type": "Point",
        "coordinates": [77.2205, 28.5802]
      }
    }
  }
  ```
- **Action**: Save the generated `outletId` as `{{OUTLET_ID}}`.

### Step 4: Add Menu Items
- **Endpoint**: `POST /api/v1/menu-items`
- **Body**:
  ```json
  {
    "name": "Veg Cheese Burger",
    "price": 180,
    "outletId": "{{OUTLET_ID}}"
  }
  ```
- **Action**: Save `menuItemId` as `{{MENU_ITEM_ID}}`.

### Step 5: Configure Inventory
- Ensure inventory documents exist for all menu items under that outlet. Advancing statuses automatically decrements stock.
- **Endpoint**: `POST /api/v1/inventory`
- **Body**:
  ```json
  {
    "menuItemId": "{{MENU_ITEM_ID}}",
    "outletId": "{{OUTLET_ID}}",
    "quantity": 150
  }
  ```

### Step 6: Create Aggregator Channel Mapping
- Map internal outlet and menu items to mock Swiggy/Zomato external codes.
- **Endpoint**: `POST /api/v1/integrations/mappings/menu-items`
- **Body**:
  ```json
  {
    "outletId": "{{OUTLET_ID}}",
    "menuItemId": "{{MENU_ITEM_ID}}",
    "provider": "MOCK_SWIGGY",
    "externalItemId": "MOCK-ITEM-01"
  }
  ```
- **Action**: You can now test mock Swiggy order ingestion specifying `outlet_id: "{{OUTLET_ID}}"` and `item_id: "MOCK-ITEM-01"`.

### Step 7: Create Dine-In Tables
- **Endpoint**: `POST /api/v1/dining/tables`
- **Body**:
  ```json
  {
    "name": "Table 5",
    "capacity": 4,
    "outletId": "{{OUTLET_ID}}"
  }
  ```
- **Action**: Copy the `qrToken` to run resolved dine-in menus.
