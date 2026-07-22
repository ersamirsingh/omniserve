import mongoose from "mongoose";
import app from "../../../src/app.js";
import { connectTestDB, closeTestDB } from "../shared/shared-utils.js";
import Tenant from "../../../src/models/tenant.model.js";
import User from "../../../src/models/user.model.js";
import Outlet from "../../../src/models/outlet.model.js";
import Table from "../../../src/models/table.model.js";
import MenuItem from "../../../src/models/menuitems.model.js";
import Category from "../../../src/models/category.model.js";
import QRSession from "../../../src/models/qrsession.model.js";
import GuestSession from "../../../src/models/guestsession.model.js";
import Cart from "../../../src/models/cart.model.js";
import Order from "../../../src/models/order.model.js";
import Payment from "../../../src/models/payment.model.js";
import ReviewAnalytics from "../../../src/models/reviewanalytics.model.js";
import { PublicController } from "../../../src/modules/auth/public.controller.js";
import { OrderGatewayService } from "../../../src/modules/order/ordergateway.service.js";
import { OrderStatus } from "../../../src/models/enums.js";
import { IntegrationProvider } from "../../../src/types/integration.type.js";
import { MockSwiggyAdapter } from "../../../src/integrations/adapters/mock-swiggy.adapter.js";
import { MockZomatoAdapter } from "../../../src/integrations/adapters/mock-zomato.adapter.js";
import { QrAdapter } from "../../../src/integrations/adapters/qr.adapter.js";
import { WebsiteAdapter } from "../../../src/integrations/adapters/website.adapter.js";

async function runGuestAcceptanceTest() {
  console.log("[GuestTest] Starting Acceptance Test...");
  await connectTestDB();

  OrderGatewayService.registerAdapter(new MockSwiggyAdapter());
  OrderGatewayService.registerAdapter(new MockZomatoAdapter());
  OrderGatewayService.registerAdapter(new QrAdapter());
  OrderGatewayService.registerAdapter(new WebsiteAdapter());

  console.log("[GuestTest] Registered providers at test start:", OrderGatewayService.getRegisteredProviders());

  const tenantName = "Acceptance Test Tenant - Guest";
  const tid = new mongoose.Types.ObjectId();
  const oid = new mongoose.Types.ObjectId();
  const tableId = new mongoose.Types.ObjectId();

  await Tenant.deleteMany({ name: tenantName });
  await Outlet.deleteMany({ tenantId: tid });
  await Table.deleteMany({ tenantId: tid });
  await QRSession.deleteMany({ tenantId: tid });
  await GuestSession.deleteMany({ tenantId: tid });
  await Cart.deleteMany({ tenantId: tid });
  await Order.deleteMany({ tenantId: tid });
  await Payment.deleteMany({ tenantId: tid });
  await ReviewAnalytics.deleteMany({ tenantId: tid });

  const tenant = await Tenant.create({
    _id: tid,
    name: tenantName,
    slug: `acc-guest-tenant-${Date.now()}`,
    ownerId: new mongoose.Types.ObjectId(),
    status: "ACTIVE"
  });

  const outlet = await Outlet.create({
    _id: oid,
    tenantId: tid,
    restaurantId: new mongoose.Types.ObjectId(),
    name: "Acceptance Guest Outlet",
    slug: `acc-guest-outlet-${Date.now()}`,
    address: "Guest Street, Block C",
    city: "Bangalore",
    state: "Karnataka",
    pincode: "560001",
    isDeleted: false
  });

  const category = await Category.create({
    tenantId: tid,
    outletId: oid,
    name: "Mock Fast Food",
    isActive: true,
    isDeleted: false
  });

  const menuItem = await MenuItem.create({
    tenantId: tid,
    outletId: oid,
    categoryId: category._id,
    name: "Acceptance Burger",
    price: 150,
    isAvailable: true,
    isDeleted: false
  });

  const table = await Table.create({
    _id: tableId,
    tenantId: tid,
    outletId: oid,
    tableNumber: "T-Guest-40",
    seatCount: 4,
    qrToken: `qr_token_acc_guest_${Date.now()}`,
    status: "ACTIVE",
    operationalStatus: "AVAILABLE"
  });

  console.log("[GuestTest] Base records seeded successfully.");

  console.log("[GuestTest] Simulating QR Scan & Join...");
  const mockReqResolve = {
    params: { tableToken: table.qrToken },
    query: {},
    headers: {}
  } as any;

  let resolvedData: any = null;
  const mockResResolve = {
    status: (code: number) => ({
      json: (data: any) => {
        resolvedData = data.data;
      }
    })
  } as any;

  await PublicController.resolveQrCode(mockReqResolve, mockResResolve);
  if (!resolvedData || !resolvedData.sessionToken || !resolvedData.guestSessionToken) {
    throw new Error("QR Code resolution failed to return session tokens");
  }
  console.log("[GuestTest] Table scan resolved successfully. sessionToken:", resolvedData.sessionToken);

  console.log("[GuestTest] Simulating Guest Session Profile setup...");
  let guestProfile: any = null;
  const mockReqUpdateGuest = {
    headers: { "x-guest-session-token": resolvedData.guestSessionToken },
    body: { name: "Aman Sen", phone: "9876543210", seatNumber: "2" }
  } as any;
  const mockResUpdateGuest = {
    status: (code: number) => ({
      json: (data: any) => {
        guestProfile = data.data;
      }
    })
  } as any;

  await PublicController.updateGuestSession(mockReqUpdateGuest, mockResUpdateGuest);
  if (!guestProfile || guestProfile.name !== "Aman Sen" || guestProfile.seatNumber !== "2") {
    throw new Error("Guest Profile setup failed");
  }
  console.log("[GuestTest] Guest session profile saved. Name:", guestProfile.name);

  console.log("[GuestTest] Adding items to Cart...");
  let cartData: any = null;
  const mockReqAddCart = {
    headers: {},
    query: {},
    body: {
      sessionToken: resolvedData.guestSessionToken,
      outletId: oid.toString(),
      item: {
        menuItemId: menuItem._id.toString(),
        quantity: 2
      }
    }
  } as any;
  let cartResponse: any = null;
  const mockResAddCart = {
    status: (code: number) => ({
      json: (data: any) => {
        cartResponse = data;
        cartData = data.data;
      }
    })
  } as any;

  await PublicController.createOrUpdateCart(mockReqAddCart, mockResAddCart);
  if (!cartData || cartData.items.length === 0) {
    console.error("[GuestTest] Cart creation failed. Full response:", JSON.stringify(cartResponse, null, 2));
    throw new Error("Cart creation failed");
  }
  console.log("[GuestTest] Item added to cart. Subtotal:", cartData.subtotal);

  console.log("[GuestTest] Placing QR table order...");
  let orderData: any = null;
  const mockReqPlaceOrder = {
    headers: {},
    query: {},
    body: {
      tableToken: table.qrToken,
      seatNumber: guestProfile.seatNumber,
      customer: { name: guestProfile.name, phone: guestProfile.phone },
      items: [
        {
          menuItemId: menuItem._id.toString(),
          name: menuItem.name,
          price: menuItem.price,
          quantity: 2
        }
      ],
      notes: "Less Spicy"
    }
  } as any;
  let orderResponse: any = null;
  const mockResPlaceOrder = {
    status: (code: number) => ({
      json: (data: any) => {
        orderResponse = data;
        orderData = data.data;
      }
    })
  } as any;

  await PublicController.placeQrOrder(mockReqPlaceOrder, mockResPlaceOrder);
  if (!orderData || orderData.status !== "PLACED") {
    console.error("[GuestTest] QR Order placement failed. Full response:", JSON.stringify(orderResponse, null, 2));
    throw new Error("QR Order placement failed");
  }
  const orderId = orderData.internalOrderId;
  console.log("[GuestTest] QR Order placed successfully! Internal Order ID:", orderId);

  console.log("[GuestTest] Dispatching Waiter Assistance call...");
  let assistData: any = null;
  const mockReqAssist = {
    headers: {},
    query: {},
    body: {
      tableToken: table.qrToken,
      action: "NEED_WATER",
      seatNumber: "2"
    }
  } as any;
  const mockResAssist = {
    status: (code: number) => ({
      json: (data: any) => {
        assistData = data.data;
      }
    })
  } as any;

  await PublicController.requestQrAssistance(mockReqAssist, mockResAssist);
  if (!assistData || assistData.action !== "NEED_WATER") {
    throw new Error("Waiter assistance request failed");
  }
  console.log("[GuestTest] Waiter task alert dispatched.");

  console.log("[GuestTest] Settle postpaid Table Bill...");
  let paymentSettle: any = null;
  const mockReqPay = {
    headers: {},
    query: {},
    params: { sessionToken: resolvedData.sessionToken },
    body: { paymentMode: "UPI", tip: 20 }
  } as any;
  const mockResPay = {
    status: (code: number) => ({
      json: (data: any) => {
        paymentSettle = data.data;
      }
    })
  } as any;

  await PublicController.payQrSessionBill(mockReqPay, mockResPay);
  if (!paymentSettle || paymentSettle.status !== "SETTLED") {
    throw new Error("Postpaid bill settlement failed");
  }
  console.log("[GuestTest] Postpaid bill settled successfully.");

  console.log("[GuestTest] Submitting dining feedback review...");
  let feedbackData: any = null;
  const mockReqFeedback = {
    headers: {},
    query: {},
    params: { sessionToken: resolvedData.sessionToken },
    body: { rating: 5, reviewText: "Delicious food and prompt service!" }
  } as any;
  const mockResFeedback = {
    status: (code: number) => ({
      json: (data: any) => {
        feedbackData = data.data;
      }
    })
  } as any;

  await PublicController.submitQrSessionFeedback(mockReqFeedback, mockResFeedback);
  if (!feedbackData || feedbackData.rating !== 5) {
    throw new Error("Feedback submission failed");
  }
  console.log("[GuestTest] Feedback review registered. Rating:", feedbackData.rating);

  console.log("[GuestTest] Leaving guest table session...");
  let leaveData: any = null;
  const mockReqLeave = {
    headers: { "x-guest-session-token": resolvedData.guestSessionToken },
    query: {},
    body: {}
  } as any;
  const mockResLeave = {
    status: (code: number) => ({
      json: (data: any) => {
        leaveData = data.data;
      }
    })
  } as any;

  await PublicController.leaveGuestSession(mockReqLeave, mockResLeave);
  if (!leaveData || leaveData.remainingActive !== 0) {
    throw new Error("Leave table session failed");
  }
  console.log("[GuestTest] Guest session cleared. Remaining guests: 0");

  console.log("[GuestTest] All Acceptance test stages passed successfully! ✅");
  await closeTestDB();
}

runGuestAcceptanceTest().catch(async (e) => {
  console.error("[GuestTest] Acceptance test failed with error: ❌", e);
  await closeTestDB();
  process.exit(1);
});
