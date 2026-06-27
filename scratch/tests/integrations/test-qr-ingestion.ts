import { configDotenv } from 'dotenv';
configDotenv({ path: 'server/.env' });

import dns from 'dns';
try {
   dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
   console.warn('Unable to set custom DNS servers, using system defaults:', e);
}

import mongoose from "mongoose";
import jwt from "jsonwebtoken";

// Mock transaction support for standalone MongoDB instances used in tests
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
import DiningArea from "../../../server/src/models/diningarea.model.js";
import Table from "../../../server/src/models/table.model.js";
import QRSession from "../../../server/src/models/qrsession.model.js";
import OrderGroup from "../../../server/src/models/ordergroup.model.js";
import BillSession from "../../../server/src/models/billsession.model.js";
import ExternalOrder from "../../../server/src/models/externalorder.model.js";
import Order from "../../../server/src/models/order.model.js";
import Customer from "../../../server/src/models/customer.model.js";
import Notification from "../../../server/src/models/notification.model.js";

// Set testing environment
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test_jwt_secret_key";

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
    throw new Error("Unable to connect to MongoDB.");
  }

  console.log("Cleaning up test collections...");
  const tenantName = "E2E QR Commerce Tenant";
  const existingTenant = await Tenant.findOne({ name: tenantName });
  if (existingTenant) {
    const tid = existingTenant._id;
    await Tenant.deleteMany({ _id: tid });
    await User.deleteMany({ tenantId: tid });
    await Restaurant.deleteMany({ tenantId: tid });
    await Outlet.deleteMany({ tenantId: tid });
    await Category.deleteMany({ tenantId: tid });
    await MenuItem.deleteMany({ tenantId: tid });
    await DiningArea.deleteMany({ tenantId: tid });
    await Table.deleteMany({ tenantId: tid });
    await QRSession.deleteMany({ tenantId: tid });
    await OrderGroup.deleteMany({ tenantId: tid });
    await BillSession.deleteMany({ tenantId: tid });
    await ExternalOrder.deleteMany({ tenantId: tid });
    await Order.deleteMany({ tenantId: tid });
    await Customer.deleteMany({ tenantId: tid });
    await Notification.deleteMany({ tenantId: tid });
  }

  // 1. Seed Tenant, Owner User, staff user (to receive notifications)
  console.log("Seeding Test Tenant and Users...");
  const ownerId = new mongoose.Types.ObjectId();
  const staffId = new mongoose.Types.ObjectId();
  const tenantId = new mongoose.Types.ObjectId();

  const tenant = await Tenant.create({
    _id: tenantId,
    name: tenantName,
    slug: `test-qr-commerce-${Date.now()}`,
    ownerId: ownerId,
    status: "ACTIVE"
  });

  const owner = await User.create({
    _id: ownerId,
    tenantId: tenantId,
    firstName: "Owner",
    lastName: "User",
    email: "owner-qr@foodmesh.io",
    passwordHash: "testpasswordhash",
    role: "RESTAURANT_OWNER",
    status: "ACTIVE"
  });

  // Staff user at outlet to receive operational alerts
  const staff = await User.create({
    _id: staffId,
    tenantId: tenantId,
    firstName: "Staff",
    lastName: "User",
    email: "staff-qr@foodmesh.io",
    passwordHash: "testpasswordhash",
    role: "OUTLET_MANAGER", // managers and staff receive notifications
    status: "ACTIVE"
  });

  const restaurant = await Restaurant.create({
    tenantId: tenant._id,
    name: "QR Restaurant",
    status: "ACTIVE"
  });

  // 2. Seed Outlet
  console.log("Seeding Test Outlet...");
  const outlet = await Outlet.create({
    tenantId: tenant._id,
    restaurantId: restaurant._id,
    name: "QR Outlet Bhopal",
    code: "QR-BHP",
    email: "qr-bhp@example.com",
    phone: "9988776622",
    address: "Rooftop Plaza, Bhopal",
    city: "Bhopal",
    state: "MP",
    pincode: "462016",
    isActive: true
  });
  const outletId = outlet._id.toString();
  const outletSlug = outlet.slug; // generated slug
  console.log(`Outlet created with slug: ${outletSlug}`);

  // Seed staff user to this outlet
  await User.updateOne({ _id: staffId }, { $set: { outletIds: [outlet._id] } });

  // 3. Seed Dining Area and Table
  console.log("Seeding Dining Area and Table...");
  const diningArea = await DiningArea.create({
    tenantId: tenant._id,
    outletId: outlet._id,
    name: "Rooftop Deck",
    isActive: true
  });

  const table = await Table.create({
    tenantId: tenant._id,
    outletId: outlet._id,
    diningAreaId: diningArea._id,
    tableNumber: "T-15",
    seatCount: 4,
    status: "ACTIVE",
    metadata: { floor: "Rooftop" }
  });
  const tableToken = table.qrToken;
  console.log(`Table T-15 created with qrToken: ${tableToken}`);

  // 4. Seed Category & MenuItem
  console.log("Seeding Test Category and Menu Items...");
  const category = await Category.create({
    tenantId: tenant._id,
    outletId: outlet._id,
    name: "Starters & Drinks",
    isActive: true
  });

  const burger = await MenuItem.create({
    tenantId: tenant._id,
    categoryId: category._id,
    outletId: outlet._id,
    name: "Dynamic Veg Burger",
    price: 180,
    isActive: true,
    outlets: [outlet._id]
  });

  console.log("Seeding complete. Starting server...");
  const PORT = 5003;
  const server = app.listen(PORT, async () => {
    console.log(`Server listening on port ${PORT}`);

    try {
      // Test Case 1: Scan Table -> Initialize Session & Verify menuViewedAt is set
      console.log("\n--- TEST 1: Scanning Table / Retrieving Table Menu ---");
      const scanRes = await fetch(`http://localhost:${PORT}/api/public/o/${outletSlug}/t/${tableToken}/menu`, {
        method: "GET"
      });
      const scanData: any = await scanRes.json();
      console.log("Response status:", scanRes.status);
      console.log("Response body fields:", Object.keys(scanData.data || {}));
      
      if (scanRes.status !== 200) {
        throw new Error(`Scan table failed. Status: ${scanRes.status}`);
      }

      const activeSession = await QRSession.findOne({ tableId: table._id, status: "OPEN" });
      if (!activeSession) {
        throw new Error("QRSession was not initialized upon table scan");
      }
      if (!activeSession.menuViewedAt) {
        throw new Error("menuViewedAt was not set on the QR session scan");
      }
      console.log("PASSED: QRSession initialized and menuViewedAt timestamp recorded.");

      // Test Case 2: Place QR order
      console.log("\n--- TEST 2: Placing QR Order ---");
      const orderPayload = {
        tableToken: tableToken,
        seatNumber: "3",
        customer: {
          name: "John Doe",
          phone: "9876543210"
        },
        items: [
          {
            itemId: burger._id.toString(),
            name: burger.name,
            quantity: 2,
            price: burger.price
          }
        ],
        notes: "No onions please"
      };

      const orderRes = await fetch(`http://localhost:${PORT}/api/public/qr/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload)
      });
      const orderData: any = await orderRes.json();
      console.log("Response status:", orderRes.status);
      console.log("Response body:", JSON.stringify(orderData));

      if (orderRes.status !== 200 && orderRes.status !== 201) {
        throw new Error(`Order placement failed. Status: ${orderRes.status}, Message: ${orderData.message}`);
      }

      // Assert QRSession updated
      const updatedSession = await QRSession.findOne({ tableId: table._id });
      if (!updatedSession || updatedSession.status !== "ORDERED") {
        throw new Error(`QRSession not transitioned to ORDERED. Current: ${updatedSession?.status}`);
      }
      if (!updatedSession.orderPlacedAt) {
        throw new Error("orderPlacedAt timestamp was not recorded in QRSession");
      }

      // Assert OrderGroup exists
      const group = await OrderGroup.findOne({ sessionId: updatedSession._id });
      if (!group) {
        throw new Error("OrderGroup was not created for the session");
      }
      if (group.orderIds.length !== 1) {
        throw new Error("OrderGroup does not contain the placed order ID");
      }

      // Assert BillSession exists
      const bill = await BillSession.findOne({ sessionId: updatedSession._id });
      if (!bill || bill.status !== "OPEN") {
        throw new Error("BillSession was not initialized");
      }
      if (bill.totalAmount !== burger.price * 2) {
        throw new Error(`BillSession amount mismatch. Expected: ${burger.price * 2}, Found: ${bill.totalAmount}`);
      }

      // Assert internal Order document exists and has diningContext
      const internalOrder = await Order.findById(group.orderIds[0]);
      if (!internalOrder) {
        throw new Error("Internal Order document not found in DB");
      }
      console.log("Internal Order diningContext:", JSON.stringify(internalOrder.diningContext));
      if (!internalOrder.diningContext || internalOrder.diningContext.tableNumber !== "T-15") {
        throw new Error("diningContext missing or incorrect in internal Order document");
      }
      if (internalOrder.source !== "QR_DINE_IN") {
        throw new Error(`Internal Order source mismatch. Expected QR_DINE_IN, found: ${internalOrder.source}`);
      }
      console.log("PASSED: Order processed E2E through pipeline, QRSession updated, OrderGroup and BillSession linked, diningContext stored.");

      // Test Case 3: Customer Assistance Call
      console.log("\n--- TEST 3: Triggering QR Assistance Call ---");
      const assistPayload = {
        tableToken: tableToken,
        action: "CALL_WAITER",
        seatNumber: "3"
      };

      const assistRes = await fetch(`http://localhost:${PORT}/api/public/qr/assist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assistPayload)
      });
      const assistData: any = await assistRes.json();
      console.log("Response status:", assistRes.status);
      console.log("Response body:", JSON.stringify(assistData));

      if (assistRes.status !== 200) {
        throw new Error(`Assistance call failed. Status: ${assistRes.status}`);
      }

      // Assert that a notification record was created in the database
      const notification = await Notification.findOne({
        tenantId: tenant._id,
        title: "Waiter Requested"
      });

      if (!notification) {
        throw new Error("Notification record was not created for the Call Waiter request");
      }
      console.log("Notification message in DB:", notification.message);
      if (!notification.message.includes("Table T-15 (Seat 3)")) {
        throw new Error("Notification message does not include correct table and seat context");
      }
      console.log("PASSED: Customer assistance notification successfully dispatched to staff.");

      console.log("\n=============================");
      console.log("ALL QR INGESTION E2E TESTS PASSED!");
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
