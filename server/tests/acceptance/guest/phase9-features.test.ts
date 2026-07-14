import mongoose from "mongoose";
import { connectTestDB, closeTestDB } from "../shared/shared-utils.js";
import Tenant from "../../../src/models/tenant.model.js";
import Outlet from "../../../src/models/outlet.model.js";
import Table from "../../../src/models/table.model.js";
import MenuItem from "../../../src/models/menuitems.model.js";
import Category from "../../../src/models/category.model.js";
import QRSession from "../../../src/models/qrsession.model.js";
import GuestSession from "../../../src/models/guestsession.model.js";
import Order from "../../../src/models/order.model.js";
import OrderItem from "../../../src/models/orderItem.model.js";
import Inventory from "../../../src/models/inventory.model.js";
import WaiterTask from "../../../src/models/waitertask.model.js";
import IdempotencyKey from "../../../src/models/idempotencyKey.model.js";
import { PublicController } from "../../../src/modules/auth/public.controller.js";
import { OrderGatewayService } from "../../../src/modules/order/ordergateway.service.js";
import { OrderStatus } from "../../../src/models/enums.js";
import { QrAdapter } from "../../../src/integrations/adapters/qr.adapter.js";
import { BillingService } from "../../../src/modules/order/billing.service.js";
import BillSession from "../../../src/models/billsession.model.js";

async function runPhase9Tests() {
  console.log("[Phase9Test] Starting Phase 9 Feature Acceptance Tests...");
  await connectTestDB();

  OrderGatewayService.registerAdapter(new QrAdapter());

  const tenantName = "Phase 9 Test Tenant";
  const tid = new mongoose.Types.ObjectId();
  const oid = new mongoose.Types.ObjectId();
  const tableId = new mongoose.Types.ObjectId();

  // Cleanup
  await Table.deleteMany({ qrToken: "qr_token_phase9_test" });
  await Tenant.deleteMany({ name: tenantName });
  await Outlet.deleteMany({ name: "Phase 9 Outlet" });
  await QRSession.deleteMany({ tenantId: tid });
  await GuestSession.deleteMany({ tenantId: tid });
  await Order.deleteMany({ tenantId: tid });
  await OrderItem.deleteMany({ tenantId: tid });
  await Inventory.deleteMany({ tenantId: tid });
  await WaiterTask.deleteMany({ tenantId: tid });
  await IdempotencyKey.deleteMany({});
  try {
    await mongoose.connection.collection("idempotencykeys").dropIndexes();
  } catch (err) {}

  // 1. Seed base data
  await Tenant.create({
    _id: tid,
    name: tenantName,
    slug: "phase9-tenant",
    ownerId: new mongoose.Types.ObjectId(),
    status: "ACTIVE"
  });

  const outlet = await Outlet.create({
    _id: oid,
    tenantId: tid,
    restaurantId: new mongoose.Types.ObjectId(),
    name: "Phase 9 Outlet",
    slug: "phase9-outlet",
    address: "Phase 9 Road",
    city: "Bangalore",
    state: "Karnataka",
    pincode: "560001",
    orderCancellationApproval: "WAITER",
    isDeleted: false
  });

  const category = await Category.create({
    tenantId: tid,
    outletId: oid,
    name: "Fast Food",
    isActive: true,
    isDeleted: false
  });

  const menuItem = await MenuItem.create({
    tenantId: tid,
    outletId: oid,
    categoryId: category._id,
    name: "Burger",
    price: 100,
    isAvailable: true,
    isDeleted: false
  });

  const table = await Table.create({
    _id: tableId,
    tenantId: tid,
    outletId: oid,
    tableNumber: "T-99",
    seatCount: 4,
    qrToken: "qr_token_phase9_test",
    status: "ACTIVE",
    operationalStatus: "AVAILABLE"
  });

  // Seed inventory
  const inventory = await Inventory.create({
    tenantId: tid,
    outletId: oid,
    menuItemId: menuItem._id,
    quantity: 5,
    threshold: 2,
    isLowStock: false,
    isDeleted: false
  });

  console.log("[Phase9Test] Base records and inventory seeded.");

  // Test 1: Reserved/Cleaning Table Scan Block
  console.log("[Phase9Test] Testing Table operationalStatus Blocks...");
  table.operationalStatus = "RESERVED";
  await table.save();

  let resolveResError: any = null;
  const mockResResolveError = {
    status: (code: number) => ({
      json: (data: any) => {
        resolveResError = { code, data };
      }
    })
  } as any;

  await PublicController.resolveQrCode({ params: { tableToken: table.qrToken }, query: {}, headers: {} } as any, mockResResolveError);
  if (!resolveResError || resolveResError.code !== 400 || !resolveResError.data.message.includes("reserved")) {
    throw new Error("Failed to block scan for RESERVED table");
  }
  console.log("-> RESERVED table blocked successfully.");

  table.operationalStatus = "CLEANING";
  await table.save();

  await PublicController.resolveQrCode({ params: { tableToken: table.qrToken }, query: {}, headers: {} } as any, mockResResolveError);
  if (!resolveResError || resolveResError.code !== 400 || !resolveResError.data.message.includes("cleaned")) {
    throw new Error("Failed to block scan for CLEANING table");
  }
  console.log("-> CLEANING table blocked successfully.");

  // Restore table status
  table.operationalStatus = "AVAILABLE";
  await table.save();

  // 2. Scan and Join
  let resolvedData: any = null;
  const mockResResolve = {
    status: (code: number) => ({
      json: (data: any) => {
        resolvedData = data.data;
      }
    })
  } as any;
  await PublicController.resolveQrCode({ params: { tableToken: table.qrToken }, query: {}, headers: {} } as any, mockResResolve);

  // Set up guest session profile
  let guestProfile: any = null;
  await PublicController.updateGuestSession({
    headers: { "x-guest-session-token": resolvedData.guestSessionToken },
    body: { name: "Aman", phone: "9876543210", seatNumber: "1" }
  } as any, {
    status: (code: number) => ({
      json: (data: any) => {
        guestProfile = data.data;
      }
    })
  } as any);

  // Test 2: Waiter Assistance Duplicate Prevention
  console.log("[Phase9Test] Testing Waiter Assistance Spam Prevention...");
  let assistData1: any = null;
  await PublicController.requestQrAssistance({
    body: { tableToken: table.qrToken, action: "NEED_SPOON", seatNumber: "1" }
  } as any, {
    status: (code: number) => ({
      json: (data: any) => { assistData1 = data; }
    })
  } as any);

  if (!assistData1 || assistData1.success !== true) {
    throw new Error("Failed to request waiter assistance first time");
  }

  let assistData2: any = null;
  await PublicController.requestQrAssistance({
    body: { tableToken: table.qrToken, action: "NEED_SPOON", seatNumber: "1" }
  } as any, {
    status: (code: number) => ({
      json: (data: any) => { assistData2 = data; }
    })
  } as any);

  if (!assistData2 || assistData2.success === true || !assistData2.message.includes("already requested")) {
    throw new Error("Failed to prevent duplicate waiter assistance within 15 minutes");
  }
  console.log("-> Waiter assistance spam protection verified.");

  // Test 3: Price and Stock validation
  console.log("[Phase9Test] Testing Stock & Price Checkout validation...");
  
  // 3a. Price tamper check
  let orderResult: any = null;
  await PublicController.placeQrOrder({
    headers: {},
    body: {
      tableToken: table.qrToken,
      seatNumber: "1",
      customer: { name: "Aman", phone: "9876543210" },
      items: [{ menuItemId: menuItem._id.toString(), name: "Burger", price: 80, quantity: 1 }] // original ₹100
    }
  } as any, {
    status: (code: number) => ({
      json: (data: any) => { orderResult = data; }
    })
  } as any);

  console.log("[Phase9Test] orderResult:", JSON.stringify(orderResult, null, 2));
  if (!orderResult || orderResult.success !== false) {
    throw new Error("Tampered price check failed to catch discrepancy");
  }
  console.log("-> Price tampering protection verified.");

  // 3b. Stock checkout check
  let orderResultStock: any = null;
  await PublicController.placeQrOrder({
    headers: {},
    body: {
      tableToken: table.qrToken,
      seatNumber: "1",
      customer: { name: "Aman", phone: "9876543210" },
      items: [{ menuItemId: menuItem._id.toString(), name: "Burger", price: 100, quantity: 10 }] // stock is 5
    }
  } as any, {
    status: (code: number) => ({
      json: (data: any) => { orderResultStock = data; }
    })
  } as any);

  if (!orderResultStock || orderResultStock.success !== false || orderResultStock.data.status !== "STOCK_UNAVAILABLE") {
    throw new Error("Stock check failed to prevent checkout of unavailable items");
  }
  console.log("-> Stock inventory checkout check verified.");

  // Test 4: Stripe-style Idempotency Keys
  console.log("[Phase9Test] Testing Stripe-style Idempotency keys...");
  const idempotencyKey = "key-test-123456";

  let firstOrderRes: any = null;
  await PublicController.placeQrOrder({
    headers: { "idempotency-key": idempotencyKey },
    body: {
      tableToken: table.qrToken,
      seatNumber: "1",
      customer: { name: "Aman", phone: "9876543210" },
      items: [{ menuItemId: menuItem._id.toString(), name: "Burger", price: 100, quantity: 1 }]
    }
  } as any, {
    status: (code: number) => ({
      json: (data: any) => { firstOrderRes = data; }
    })
  } as any);

  console.log("[Phase9Test] firstOrderRes:", JSON.stringify(firstOrderRes, null, 2));
  if (!firstOrderRes || firstOrderRes.success !== true) {
    throw new Error("Idempotency order placement failed first time");
  }

  let secondOrderRes: any = null;
  await PublicController.placeQrOrder({
    headers: { "idempotency-key": idempotencyKey },
    body: {
      tableToken: table.qrToken,
      seatNumber: "1",
      customer: { name: "Aman", phone: "9876543210" },
      items: [{ menuItemId: menuItem._id.toString(), name: "Burger", price: 100, quantity: 1 }]
    }
  } as any, {
    status: (code: number) => ({
      json: (data: any) => { secondOrderRes = data; }
    })
  } as any);

  if (firstOrderRes.data.internalOrderId.toString() !== secondOrderRes.data.internalOrderId.toString()) {
    throw new Error("Idempotent key test did not return identical order responses");
  }
  console.log("-> Idempotency keys order protection verified.");

  const orderId = firstOrderRes.data.internalOrderId;

  // Test 5: Safe Leave - Case 2 (Cancel pending orders on leave)
  console.log("[Phase9Test] Testing Safe Leave Case 2 (Auto cancel pending orders)...");
  let leaveRes: any = null;
  await PublicController.leaveGuestSession({
    headers: { "x-guest-session-token": resolvedData.guestSessionToken },
    body: {}
  } as any, {
    status: (code: number) => ({
      json: (data: any) => { leaveRes = data; }
    })
  } as any);

  if (!leaveRes || leaveRes.success !== true) {
    throw new Error("Failed to leave guest session with pending order");
  }

  const orderCheck = await Order.findById(orderId);
  if (!orderCheck || orderCheck.orderStatus !== OrderStatus.CANCELLED) {
    throw new Error("Pending order was not automatically cancelled upon safe leave");
  }
  console.log("-> Safe Leave Case 2 (Cancel pending) verified.");

  // Re-join and place preparation order for Case 3
  resolvedData = null;
  await PublicController.resolveQrCode({ params: { tableToken: table.qrToken }, query: {}, headers: {} } as any, mockResResolve);

  guestProfile = null;
  await PublicController.updateGuestSession({
    headers: { "x-guest-session-token": resolvedData.guestSessionToken },
    body: { name: "Aman", phone: "9876543210", seatNumber: "1" }
  } as any, {
    status: (code: number) => ({
      json: (data: any) => { guestProfile = data.data; }
    })
  } as any);

  // Place order
  let order2Res: any = null;
  await PublicController.placeQrOrder({
    headers: {},
    body: {
      tableToken: table.qrToken,
      seatNumber: "1",
      customer: { name: "Aman", phone: "9876543210" },
      items: [{ menuItemId: menuItem._id.toString(), name: "Burger", price: 100, quantity: 1 }]
    }
  } as any, {
    status: (code: number) => ({
      json: (data: any) => { order2Res = data; }
    })
  } as any);

  const order2Id = order2Res.data.internalOrderId;

  // Move order to PREPARING
  await Order.updateOne({ _id: order2Id }, { orderStatus: OrderStatus.PREPARING });

  // Test 6: Safe Leave - Case 3 (Prepare order triggers waiter cancel request)
  console.log("[Phase9Test] Testing Safe Leave Case 3 (PREPARING order blocks direct leave, raises request)...");
  let leaveRes3: any = null;
  await PublicController.leaveGuestSession({
    headers: { "x-guest-session-token": resolvedData.guestSessionToken },
    body: {}
  } as any, {
    status: (code: number) => ({
      json: (data: any) => { leaveRes3 = data; }
    })
  } as any);

  if (!leaveRes3 || leaveRes3.data.status !== "REQUIRES_APPROVAL") {
    throw new Error("PREPARING order did not prompt/block for waiter approval");
  }

  const qrSess = await QRSession.findOne({ sessionToken: resolvedData.sessionToken });
  if (!qrSess) throw new Error("QRSession not found");

  const cancelTask = await WaiterTask.findOne({ sessionId: qrSess._id, taskType: "ORDER_CANCEL_REQUEST" });
  if (!cancelTask) {
    throw new Error("WaiterTask ORDER_CANCEL_REQUEST was not created for Case 3");
  }
  console.log("-> Safe Leave Case 3 (Requires approval WaiterTask) verified.");

  // Test 7: Safe Leave - Case 4 (Served order blocks direct leave)
  console.log("[Phase9Test] Testing Safe Leave Case 4 (SERVED order blocks leave)...");
  await Order.updateOne({ _id: order2Id }, { orderStatus: OrderStatus.SERVED });

  // Recalculate bill session
  await BillingService.recalculateBillSession(tid, qrSess._id);

  let leaveRes4: any = null;
  await PublicController.leaveGuestSession({
    headers: { "x-guest-session-token": resolvedData.guestSessionToken },
    body: {}
  } as any, {
    status: (code: number) => ({
      json: (data: any) => { leaveRes4 = data; }
    })
  } as any);

  if (!leaveRes4 || leaveRes4.data.status !== "BILL_OUTSTANDING") {
    throw new Error("SERVED order did not block leaving guest session");
  }
  console.log("-> Safe Leave Case 4 (Outstanding bill block) verified.");

  // Test 8: Bill Split Strategies (CUSTOM Split validations)
  console.log("[Phase9Test] Testing Custom Split validation...");
  const billSess = await BillSession.findOne({ sessionId: qrSess._id, tenantId: tid });
  if (!billSess) throw new Error("BillSession not found");

  let splitResult: any = null;
  try {
    // Total is ₹100. Attempt split of ₹40 + ₹40 = ₹80
    await BillingService.splitBill(tid, oid, billSess._id.toString(), "CUSTOM", [
      { seatNumber: "1", amount: 40 },
      { seatNumber: "2", amount: 40 }
    ]);
  } catch (err: any) {
    splitResult = err.message;
  }

  if (!splitResult || !splitResult.includes("must equal total bill amount")) {
    throw new Error("Failed to block custom split that diverges from total bill amount");
  }
  console.log("-> Custom split verification verified successfully.");

  console.log("[Phase9Test] All new Phase 9 Features verified successfully! ✅");
  await closeTestDB();
}

runPhase9Tests().catch(async (e) => {
  console.error("[Phase9Test] Phase 9 Acceptance test failed: ❌", e);
  await closeTestDB();
  process.exit(1);
});
