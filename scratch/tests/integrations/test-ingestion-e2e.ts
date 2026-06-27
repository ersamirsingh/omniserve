import mongoose from "mongoose";
import jwt from "jsonwebtoken";

const originalStartSession = mongoose.startSession;
(mongoose as any).startSession = async function(options?: any) {
  const session = await originalStartSession.call(mongoose, options);
  session.startTransaction = () => {};
  session.commitTransaction = async () => {};
  session.abortTransaction = async () => {};
  session.inTransaction = () => false;
  return session;
};

import app from "../../../server/src/app.js";
import Tenant from "../../../server/src/models/tenant.model.js";
import User from "../../../server/src/models/user.model.js";
import Restaurant from "../../../server/src/models/restaurant.model.js";
import Outlet from "../../../server/src/models/outlet.model.js";
import Category from "../../../server/src/models/category.model.js";
import MenuItem from "../../../server/src/models/menuitems.model.js";
import Variant from "../../../server/src/models/variant.model.js";
import Addon from "../../../server/src/models/addon.model.js";
import Inventory from "../../../server/src/models/inventory.model.js";
import ChannelOutletMapping from "../../../server/src/models/channeloutletmapping.model.js";
import ChannelMenuItemMapping from "../../../server/src/models/channelmenuitemmapping.model.js";
import ChannelVariantMapping from "../../../server/src/models/channelvariantmapping.model.js";
import ChannelAddonMapping from "../../../server/src/models/channeladdonmapping.model.js";
import ExternalOrder from "../../../server/src/models/externalorder.model.js";
import Order from "../../../server/src/models/order.model.js";

// Set testing environment
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test_jwt_secret_key";
process.env.WEBHOOK_SECRET = "whsec_test";

const MONGO_URIS = [
  "mongodb+srv://futurestack07:nitishkumar07@teckstack.lqqhjs0.mongodb.net/FoodMesh-Test",
  "mongodb://127.0.0.1:27017/FoodMesh-Test"
];

async function runTests() {
  console.log("Connecting to MongoDB...");
  let connected = false;
  for (const uri of MONGO_URIS) {
    try {
      console.log(`Trying connection to: ${uri}`);
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 4000 });
      console.log(`Connected successfully to ${uri}`);
      connected = true;
      break;
    } catch (e: any) {
      console.warn(`Connection failed for ${uri}: ${e.message}`);
    }
  }

  if (!connected) {
    throw new Error("Unable to connect to MongoDB Atlas or local MongoDB.");
  }

  // Clean up existing test data
  console.log("Cleaning up test collections...");
  const tenantName = "E2E Test Ingestion Tenant";
  const existingTenant = await Tenant.findOne({ name: tenantName });
  if (existingTenant) {
    const tid = existingTenant._id;
    await Tenant.deleteMany({ _id: tid });
    await User.deleteMany({ tenantId: tid });
    await Restaurant.deleteMany({ tenantId: tid });
    await Outlet.deleteMany({ tenantId: tid });
    await Category.deleteMany({ tenantId: tid });
    await MenuItem.deleteMany({ tenantId: tid });
    await Variant.deleteMany({ tenantId: tid });
    await Addon.deleteMany({ tenantId: tid });
    await Inventory.deleteMany({ tenantId: tid });
    await ChannelOutletMapping.deleteMany({ tenantId: tid });
    await ChannelMenuItemMapping.deleteMany({ tenantId: tid });
    await ChannelVariantMapping.deleteMany({ tenantId: tid });
    await ChannelAddonMapping.deleteMany({ tenantId: tid });
    await ExternalOrder.deleteMany({ tenantId: tid });
    await Order.deleteMany({ tenantId: tid });
  }

  // 1. Seed Tenant & User & Restaurant (resolve circular dependency)
  console.log("Seeding Test Tenant and Owner User...");
  const userId = new mongoose.Types.ObjectId();
  const tenantId = new mongoose.Types.ObjectId();

  const tenant = await Tenant.create({
    _id: tenantId,
    name: tenantName,
    slug: `test-ingestion-${Date.now()}`,
    ownerId: userId,
    status: "ACTIVE"
  });

  const user = await User.create({
    _id: userId,
    tenantId: tenantId,
    firstName: "E2E Ingestion",
    lastName: "Admin",
    email: "e2e-admin@foodmesh.io",
    passwordHash: "testpasswordhash",
    role: "RESTAURANT_OWNER",
    status: "ACTIVE"
  });

  const restaurant = await Restaurant.create({
    tenantId: tenant._id,
    name: "KFC Brand Test",
    status: "ACTIVE"
  });

  // 2. Seed Outlet
  console.log("Seeding Test Outlet...");
  const outlet = await Outlet.create({
    tenantId: tenant._id,
    restaurantId: restaurant._id,
    name: "KFC Bhopal Test",
    code: "KFC-BHP",
    email: "kfc-bhp@example.com",
    phone: "9988776655",
    address: "123 Main Road, Bhopal",
    city: "Bhopal",
    state: "MP",
    pincode: "462001",
    isActive: true
  });
  const outletId = outlet._id.toString();

  // 3. Seed Category & MenuItem
  console.log("Seeding Test Category and Menu Items...");
  const category = await Category.create({
    tenantId: tenant._id,
    outletId: outlet._id,
    name: "Burgers & Pizza",
    isActive: true
  });

  const burger = await MenuItem.create({
    tenantId: tenant._id,
    categoryId: category._id,
    outletId: outlet._id,
    name: "Veg Burger",
    price: 180,
    isActive: true,
    outlets: [outlet._id]
  });

  const pizza = await MenuItem.create({
    tenantId: tenant._id,
    categoryId: category._id,
    outletId: outlet._id,
    name: "Cheese Veg Pizza",
    price: 250,
    isActive: true,
    outlets: [outlet._id]
  });

  // 4. Seed Variant and Addon
  console.log("Seeding Test Variants and Addons...");
  const variant = await Variant.create({
    tenantId: tenant._id,
    menuItemId: burger._id,
    name: "Cheese variant",
    price: 20,
    isActive: true
  });

  const addon = await Addon.create({
    tenantId: tenant._id,
    menuItemId: pizza._id,
    name: "Extra Jalapenos",
    price: 30,
    isActive: true
  });

  // 5. Seed Inventory
  console.log("Seeding inventories...");
  await Inventory.create({
    tenantId: tenant._id,
    outletId: outlet._id,
    menuItemId: burger._id,
    quantity: 100,
    minThreshold: 5,
    status: "IN_STOCK"
  });

  await Inventory.create({
    tenantId: tenant._id,
    outletId: outlet._id,
    menuItemId: pizza._id,
    quantity: 100,
    minThreshold: 5,
    status: "IN_STOCK"
  });

  // 6. Seed Mappings
  console.log("Seeding integration mappings...");
  // Outlet mapping (maps external outlet id 6a3c17666bb70afe757e4a91 to our outlet)
  const extOutletId = "6a3c17666bb70afe757e4a91";
  await ChannelOutletMapping.create({
    tenantId: tenant._id,
    outletId: outlet._id,
    provider: "MOCK_SWIGGY",
    externalOutletId: extOutletId,
    isActive: true
  });
  await ChannelOutletMapping.create({
    tenantId: tenant._id,
    outletId: outlet._id,
    provider: "MOCK_ZOMATO",
    externalOutletId: extOutletId,
    isActive: true
  });

  // MenuItem mappings
  await ChannelMenuItemMapping.create({
    tenantId: tenant._id,
    outletId: outlet._id,
    provider: "MOCK_SWIGGY",
    externalItemId: "1001",
    menuItemId: burger._id,
    isActive: true
  });
  await ChannelMenuItemMapping.create({
    tenantId: tenant._id,
    outletId: outlet._id,
    provider: "MOCK_ZOMATO",
    externalItemId: "2002",
    menuItemId: pizza._id,
    isActive: true
  });

  // Variant/Addon mappings (with required menuItemId)
  await ChannelVariantMapping.create({
    tenantId: tenant._id,
    outletId: outlet._id,
    menuItemId: burger._id,
    provider: "MOCK_SWIGGY",
    externalVariantId: "V201",
    variantId: variant._id,
    isActive: true
  });
  await ChannelAddonMapping.create({
    tenantId: tenant._id,
    outletId: outlet._id,
    menuItemId: pizza._id,
    provider: "MOCK_ZOMATO",
    externalAddonId: "A402",
    addonId: addon._id,
    isActive: true
  });

  console.log("Seeding complete. Starting server...");
  const PORT = 5002;
  const server = app.listen(PORT, async () => {
    console.log(`Server listening on port ${PORT}`);

    try {
      // Create admin token
      const tokenPayload = {
        userId: userId.toString(),
        tenantId: tenantId.toString(),
        email: "e2e-admin@foodmesh.io",
        role: "RESTAURANT_OWNER",
        status: "ACTIVE"
      };
      const token = jwt.sign(tokenPayload, process.env.JWT_SECRET || "");

      // Test Case 1: Swiggy Ingestion Success Path
      console.log("\n--- TEST 1: Ingesting valid Swiggy order ---");
      const swiggyPayload = {
        order_id: "SW-E2E-111",
        outlet_id: extOutletId,
        customer: {
          name: "Rahul E2E",
          phone: "9876543210"
        },
        items: [
          {
            item_id: "1001",
            name: "Veg Burger",
            quantity: 2,
            price: 180,
            variant_id: "V201"
          }
        ],
        pricing: {
          subtotal: 360,
          total_amount: 360
        }
      };

      const swiggyRes = await fetch(`http://localhost:${PORT}/api/v1/integrations/mock/swiggy/orders?tenantId=${tenantId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(swiggyPayload)
      });
      const swiggyData: any = await swiggyRes.json();
      console.log("Response status:", swiggyRes.status);
      console.log("Response body:", JSON.stringify(swiggyData));
      if (swiggyRes.status !== 201 || swiggyData.data?.status !== "PLACED") {
        throw new Error(`Swiggy Ingestion failed. Error: ${swiggyData.message}`);
      }
      console.log("PASSED: Valid Swiggy order placed successfully.");

      // Test Case 2: Zomato Ingestion Success Path
      console.log("\n--- TEST 2: Ingesting valid Zomato order ---");
      const zomatoPayload = {
        orderId: "ZOM-E2E-222",
        outletCode: extOutletId,
        customerDetails: {
          customerName: "Amit Zomato",
          customerPhone: "9876543222"
        },
        cart: {
          items: [
            {
              itemId: "2002",
              title: "Cheese Veg Pizza",
              qty: 1,
              rate: 250,
              extraAddons: [
                {
                  addonCode: "A402",
                  title: "Extra Jalapenos",
                  charge: 30
                }
              ]
            }
          ]
        },
        billDetails: {
          itemSubTotal: 250,
          totalBill: 280
        }
      };

      const zomatoRes = await fetch(`http://localhost:${PORT}/api/v1/integrations/mock/zomato/orders?tenantId=${tenantId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(zomatoPayload)
      });
      const zomatoData: any = await zomatoRes.json();
      console.log("Response status:", zomatoRes.status);
      console.log("Response body:", JSON.stringify(zomatoData));
      if (zomatoRes.status !== 201 || zomatoData.data?.status !== "PLACED") {
        throw new Error(`Zomato Ingestion failed. Error: ${zomatoData.message}`);
      }
      console.log("PASSED: Valid Zomato order placed successfully.");

      // Test Case 3: Ingesting Swiggy order with missing item mapping
      console.log("\n--- TEST 3: Ingesting Swiggy order with missing item mapping ---");
      const unmappedPayload = {
        ...swiggyPayload,
        order_id: "SW-E2E-UNMAPPED-333",
        items: [
          {
            item_id: "9999", // Unmapped ID
            name: "Unmapped Special Burger",
            quantity: 1,
            price: 150
          }
        ]
      };

      const unmappedRes = await fetch(`http://localhost:${PORT}/api/v1/integrations/mock/swiggy/orders?tenantId=${tenantId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(unmappedPayload)
      });
      const unmappedData: any = await unmappedRes.json();
      console.log("Response status:", unmappedRes.status);
      console.log("Response body:", JSON.stringify(unmappedData));
      if (unmappedRes.status !== 400 || unmappedData.data?.status !== "MAPPING_REVIEW_REQUIRED") {
        throw new Error("Failed to transition to MAPPING_REVIEW_REQUIRED");
      }
      console.log("PASSED: Missing mapping correctly transitioned order to MAPPING_REVIEW_REQUIRED.");

      // Test Case 4: Mapping Visibility APIs
      console.log("\n--- TEST 4: Mapping Visibility APIs ---");
      const healthRes = await fetch(`http://localhost:${PORT}/api/v1/integrations/mappings/health`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const healthData: any = await healthRes.json();
      console.log("Health stats:", JSON.stringify(healthData.data));
      if (healthRes.status !== 200 || !healthData.data?.menuItems) {
        throw new Error("Health mapping visibility failed");
      }

      const unmappedItemsRes = await fetch(`http://localhost:${PORT}/api/v1/integrations/mappings/unmapped?provider=MOCK_SWIGGY`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const unmappedItemsData: any = await unmappedItemsRes.json();
      console.log("Unmapped items count:", unmappedItemsData.data?.totalUnmapped);
      if (unmappedItemsRes.status !== 200 || !Array.isArray(unmappedItemsData.data?.items)) {
        throw new Error("Unmapped items visibility failed");
      }
      console.log("PASSED: Mappings visibility endpoints returned expected structure.");

      // Test Case 5: Correct mapping and Replay Order
      console.log("\n--- TEST 5: Correct mapping and Replay Order ---");
      const externalOrderRef = unmappedData.data?._id;
      if (!externalOrderRef) {
        throw new Error("External order ID reference missing from previous test");
      }

      // Add the missing mapping
      console.log("Adding missing item mapping in DB for item 9999...");
      await ChannelMenuItemMapping.create({
        tenantId: tenant._id,
        outletId: outlet._id,
        provider: "MOCK_SWIGGY",
        externalItemId: "9999",
        menuItemId: burger._id,
        isActive: true
      });

      // Call replay
      console.log(`Replaying order ID: ${externalOrderRef}...`);
      const replayRes = await fetch(`http://localhost:${PORT}/api/v1/integrations/external-orders/${externalOrderRef}/replay?tenantId=${tenantId}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const replayData: any = await replayRes.json();
      console.log("Replay response status:", replayRes.status);
      console.log("Replay order status:", replayData.data?.status);
      if (replayRes.status !== 200 || replayData.data?.status !== "PLACED") {
        throw new Error("Replay failed");
      }
      console.log("PASSED: Order replayed and placed successfully after correct mapping added.");

      console.log("\n=============================");
      console.log("ALL E2E INTEGRATION TESTS PASSED!");
      console.log("=============================");
    } catch (e: any) {
      console.error("\nTEST RUN FAILED:", e.message);
      process.exitCode = 1;
    } finally {
      console.log("Shutting down test server and disconnecting...");
      server.close();
      await mongoose.disconnect();
      console.log("Clean exit.");
      process.exit(process.exitCode || 0);
    }
  });
}

runTests().catch(err => {
  console.error("Test runner crash:", err);
  process.exit(1);
});
