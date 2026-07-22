import mongoose from "mongoose";
import app from "../../../src/app.js";
import { connectTestDB, closeTestDB } from "../shared/shared-utils.js";
import Tenant from "../../../src/models/tenant.model.js";
import Outlet from "../../../src/models/outlet.model.js";
import MenuItem from "../../../src/models/menuitems.model.js";
import Category from "../../../src/models/category.model.js";
import ExternalOrder from "../../../src/models/externalorder.model.js";
import Order from "../../../src/models/order.model.js";
import OrderTimeline from "../../../src/models/ordertimeline.model.js";
import ChannelOutletMapping from "../../../src/models/channeloutletmapping.model.js";
import ChannelMenuItemMapping from "../../../src/models/channelmenuitemmapping.model.js";
import { OrderGatewayService } from "../../../src/modules/order/ordergateway.service.js";
import { OrderService } from "../../../src/modules/order/order.service.js";
import { OrderStatus } from "../../../src/models/enums.js";
import { IntegrationProvider } from "../../../src/types/integration.type.js";
import { MockSwiggyAdapter } from "../../../src/integrations/adapters/mock-swiggy.adapter.js";
import { MockZomatoAdapter } from "../../../src/integrations/adapters/mock-zomato.adapter.js";

async function runOnlineAcceptanceTest() {
  console.log("[OnlineTest] Starting Acceptance Test...");
  await connectTestDB();

  const swiggy = new MockSwiggyAdapter();
  OrderGatewayService.registerAdapter(swiggy);

  const swiggyReal = new MockSwiggyAdapter();
  (swiggyReal as any).provider = "SWIGGY";
  OrderGatewayService.registerAdapter(swiggyReal);

  const zomato = new MockZomatoAdapter();
  OrderGatewayService.registerAdapter(zomato);

  const zomatoReal = new MockZomatoAdapter();
  (zomatoReal as any).provider = "ZOMATO";
  OrderGatewayService.registerAdapter(zomatoReal);

  const tenantName = "Acceptance Test Tenant - Online";
  const tid = new mongoose.Types.ObjectId();
  const oid = new mongoose.Types.ObjectId();

  await Tenant.deleteMany({ name: tenantName });
  await Outlet.deleteMany({ tenantId: tid });
  await ExternalOrder.deleteMany({ tenantId: tid });
  await Order.deleteMany({ tenantId: tid });
  await OrderTimeline.deleteMany({ tenantId: tid });
  await ChannelOutletMapping.deleteMany({ tenantId: tid });
  await ChannelMenuItemMapping.deleteMany({ tenantId: tid });

  const tenant = await Tenant.create({
    _id: tid,
    name: tenantName,
    slug: `acc-online-tenant-${Date.now()}`,
    ownerId: new mongoose.Types.ObjectId(),
    status: "ACTIVE"
  });

  const outlet = await Outlet.create({
    _id: oid,
    tenantId: tid,
    restaurantId: new mongoose.Types.ObjectId(),
    name: "Acceptance Online Outlet",
    slug: `acc-online-outlet-${Date.now()}`,
    address: "Online Street, Block A",
    city: "Delhi",
    state: "Delhi",
    pincode: "110001",
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
    name: "Acceptance Pizza",
    price: 350,
    isAvailable: true,
    isDeleted: false
  });

  await ChannelOutletMapping.create({
    tenantId: tid,
    outletId: oid,
    provider: "SWIGGY",
    externalOutletId: oid.toString(),
    isActive: true,
    isDeleted: false
  });

  await ChannelMenuItemMapping.create({
    tenantId: tid,
    outletId: oid,
    menuItemId: menuItem._id,
    provider: "SWIGGY",
    externalItemId: menuItem._id.toString(),
    isActive: true,
    isDeleted: false
  });

  console.log("[OnlineTest] Base records and mappings seeded successfully.");

  console.log("[OnlineTest] Ingesting Swiggy Order payload...");
  const externalOrderId = `SWIGGY-${Date.now()}`;
  const rawPayload = {
    order_id: externalOrderId,
    outlet_id: oid.toString(),
    customer: {
      name: "Rohan Varma",
      phone: "9812345678",
      email: "rohan@swiggy-user.io"
    },
    delivery_address: {
      line1: "Flat 402, Block A",
      city: "Delhi",
      state: "Delhi",
      pincode: "110001"
    },
    payment: {
      mode: "ONLINE",
      status: "PAID",
      transaction_id: "TXN-SWIGGY-123"
    },
    pricing: {
      subtotal: 350,
      tax: 17.5,
      delivery_fee: 30,
      discount: 0,
      total_amount: 397.5
    },
    items: [
      {
        item_id: menuItem._id.toString(),
        name: menuItem.name,
        quantity: 1,
        price: menuItem.price
      }
    ]
  };

  const { externalOrder } = await OrderGatewayService.ingestExternalOrder({
    tenantId: tid.toString(),
    provider: IntegrationProvider.SWIGGY,
    externalOrderId,
    rawPayload,
    outletId: oid.toString()
  });

  if (!externalOrder || externalOrder.status !== "RECEIVED") {
    throw new Error("Swiggy order ingestion failed to register RECEIVED status");
  }
  console.log("[OnlineTest] Ingested Swiggy order saved in DB. IngestId:", externalOrder._id);

  console.log("[OnlineTest] Processing external order to generate CanonicalOrder...");
  const processed = await OrderGatewayService.processExternalOrder({
    externalOrderId: externalOrder._id.toString(),
    tenantId: tid.toString()
  });

  if (!processed || processed.status !== "PLACED" || !processed.internalOrderId) {
    throw new Error(`Order processing failed: ${processed.failureReason}`);
  }
  const internalOrderId = processed.internalOrderId.toString();
  console.log("[OnlineTest] CanonicalOrder generated successfully. InternalId:", internalOrderId);

  console.log("[OnlineTest] Testing status transitions (ACCEPTED -> PREPARING -> READY -> PICKED_UP -> DELIVERED)...");

  let updatedOrder = await OrderService.updateOrderStatus(
    internalOrderId,
    tid.toString(),
    OrderStatus.ACCEPTED
  );
  if (!updatedOrder || updatedOrder.orderStatus !== OrderStatus.ACCEPTED) {
    throw new Error("Transition to ACCEPTED failed");
  }

  updatedOrder = await OrderService.updateOrderStatus(
    internalOrderId,
    tid.toString(),
    OrderStatus.PREPARING
  );
  if (!updatedOrder || updatedOrder.orderStatus !== OrderStatus.PREPARING) {
    throw new Error("Transition to PREPARING failed");
  }

  updatedOrder = await OrderService.updateOrderStatus(
    internalOrderId,
    tid.toString(),
    OrderStatus.READY
  );
  if (!updatedOrder || updatedOrder.orderStatus !== OrderStatus.READY) {
    throw new Error("Transition to READY failed");
  }

  updatedOrder = await OrderService.updateOrderStatus(
    internalOrderId,
    tid.toString(),
    OrderStatus.PICKED_UP
  );
  if (!updatedOrder || updatedOrder.orderStatus !== OrderStatus.PICKED_UP) {
    throw new Error("Transition to PICKED_UP failed");
  }

  updatedOrder = await OrderService.updateOrderStatus(
    internalOrderId,
    tid.toString(),
    OrderStatus.DELIVERED
  );
  if (!updatedOrder || updatedOrder.orderStatus !== OrderStatus.DELIVERED) {
    throw new Error("Transition to DELIVERED failed");
  }

  console.log("[OnlineTest] All order status transitions verified successfully.");

  const timelineEntries = await OrderTimeline.find({ orderId: internalOrderId });
  if (timelineEntries.length === 0) {
    throw new Error("Order timeline is empty");
  }
  console.log("[OnlineTest] Timeline entries verified. Total entries:", timelineEntries.length);

  console.log("[OnlineTest] Online Ingestion Acceptance test passed successfully! ✅");
  await closeTestDB();
}

runOnlineAcceptanceTest().catch(async (e) => {
  console.error("[OnlineTest] Acceptance test failed with error: ❌", e);
  await closeTestDB();
  process.exit(1);
});
