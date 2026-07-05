# Postman Testing Guide

This guide explains how to set up, configure, and execute tests for the **FoodMesh Platform** using Postman.

---

## 1. Import Collections & Environments

1. **Import Collections**:
   - Open Postman, click **Import**, and select the files:
     - `FoodMesh.postman_collection.json` (Complete Reference catalog).
     - `FoodMesh_Smoke_Tests.postman_collection.json` (Happy Path validation suite).
2. **Import Environments**:
   - Select and import:
     - `FoodMesh.postman_environment_local.json` (For localhost test servers).
     - `FoodMesh.postman_environment_staging.json` (Staging environment).
     - `FoodMesh.postman_environment_production.json` (Production environment).

---

## 2. Authentication Flow

1. Set the active environment to **FoodMesh - Local** in the top right.
2. In the **Authentication** folder of the collection, locate the **User Login** request.
3. Submit the request.
4. The embedded Postman **Test Script** will execute automatically and parse the response:
   ```javascript
   const res = pm.response.json();
   if (res.success && res.data && res.data.accessToken) {
       pm.environment.set("JWT_TOKEN", res.data.accessToken);
       pm.environment.set("TENANT_ID", res.data.user.tenantId || "");
       pm.environment.set("RESTAURANT_ID", res.data.user.restaurantId || "");
       pm.environment.set("OUTLET_ID", res.data.user.outletId || "");
   }
   ```
5. All subsequent requests are pre-configured to use `{{JWT_TOKEN}}` and other environment variables.

---

## 3. Running automated Smoke Tests

To verify that the entire platform is healthy:
1. Open the **Runner** tab in Postman.
2. Drag and drop the **FoodMesh - Smoke Tests** collection.
3. Select the **FoodMesh - Local** environment.
4. Click **Run FoodMesh - Smoke Tests**.
5. Postman will automatically cycle through the login, tenant registration, menu query, cart additions, checkout, order placement, and kitchen status flows, reporting pass/fail outcomes.
