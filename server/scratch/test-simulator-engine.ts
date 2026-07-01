import dns from "dns";
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {
  console.warn("Unable to set DNS, using defaults:", e);
}

import mongoose, { Types } from "mongoose";
import Tenant from "../src/models/tenant.model.js";
import Outlet from "../src/models/outlet.model.js";
import Category from "../src/models/category.model.js";
import MenuItem from "../src/models/menuitems.model.js";
import ChannelMenuItemMapping from "../src/models/channelmenuitemmapping.model.js";
import ChannelOutletMapping from "../src/models/channeloutletmapping.model.js";
import Inventory from "../src/models/inventory.model.js";
import SimulationSession from "../src/models/simulationsession.model.js";
import SimulationLog from "../src/models/simulationlog.model.js";
import ExternalOrder from "../src/models/externalorder.model.js";
import { SimulatorService } from "../src/services/simulator.service.js";
import { SimulationMetricsService } from "../src/services/simulation-metrics.service.js";
import { IntegrationController } from "../src/controllers/integration.controller.js";
import "../src/integrations/adapters/adapter-registry.js";

const MONGO_URI = "mongodb+srv://futurestack07:nitishkumar07@teckstack.lqqhjs0.mongodb.net/FoodMesh-Test";

async function runSimulatorTest() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.log("Connected successfully.");

  // Fetch test tenant and outlet
  const tenant = await Tenant.findOne();
  const outlet = await Outlet.findOne();

  if (!tenant || !outlet) {
    console.error("Test tenant or outlet not found in database.");
    process.exit(1);
  }

  const tenantId = tenant._id.toString();
  const outletId = outlet._id.toString();
  const tenantObjectId = tenant._id;
  const outletObjectId = outlet._id;
  console.log(`Using Tenant: ${tenant.name} (${tenantId})`);
  console.log(`Using Outlet: ${outlet.name} (${outletId})`);

  // Seeding sandbox data programmatically
  const mockReq = {
    user: { tenantId },
    body: { outletId }
  } as any;

  const mockRes = {
    status: function(code: number) { this.statusCode = code; return this; },
    json: function(data: any) { this.body = data; return this; },
    statusCode: 200,
    body: null as any
  } as any;

  console.log("\n--- PRE-TEST: Seeding Sandbox Catalog & Mappings ---");
  await IntegrationController.loadDemoCatalog(mockReq, mockRes);
  console.log("Demo Catalog Seeding status:", (mockRes.statusCode === 200 || mockRes.statusCode === 201) ? "SUCCESS" : "ERROR", "Code:", mockRes.statusCode, "Body:", JSON.stringify(mockRes.body));

  await IntegrationController.generateMappings(mockReq, mockRes);
  console.log("Mappings Generation status:", (mockRes.statusCode === 200 || mockRes.statusCode === 201) ? "SUCCESS" : "ERROR", "Code:", mockRes.statusCode, "Body:", JSON.stringify(mockRes.body));

  // Force seed 3 Swiggy sandbox items and mappings to guarantee resolution
  console.log("Enforcing sandbox mapping records for Swiggy simulator...");
  const cat = await Category.findOneAndUpdate(
    { tenantId: tenantObjectId, outletId: outletObjectId, name: "Burgers" },
    { isActive: true, isSandbox: true, displayOrder: 1, isDeleted: false },
    { upsert: true, new: true }
  );

  const itemNames = ["Sandbox Veg Burger", "Sandbox Cheese Burger", "Sandbox Spicy Burger"];
  for (let i = 0; i < itemNames.length; i++) {
    const name = itemNames[i];
    const item = await MenuItem.findOneAndUpdate(
      { tenantId: tenantObjectId, outletId: outletObjectId, name },
      { categoryId: cat._id, price: 100 + i * 20, sku: `SB-ITEM-${i}`, isVeg: true, isAvailable: true, isSandbox: true, isDeleted: false },
      { upsert: true, new: true }
    );

    // MenuItem Mapping
    const numStr = String(i + 1).padStart(4, "0");
    await ChannelMenuItemMapping.findOneAndUpdate(
      { tenantId: tenantObjectId, outletId: outletObjectId, provider: "MOCK_SWIGGY", externalItemId: `SWG_ITEM_${numStr}` },
      { menuItemId: item._id, isActive: true, isSandbox: true, isDeleted: false },
      { upsert: true, new: true }
    );

    // MenuItem Inventory
    await Inventory.findOneAndUpdate(
      { tenantId: tenantObjectId, outletId: outletObjectId, menuItemId: item._id },
      { quantity: 100, threshold: 10, isLowStock: false, isSandbox: true, isDeleted: false },
      { upsert: true, new: true }
    );
  }

  // Generate Swiggy Outlet Mapping
  await ChannelOutletMapping.findOneAndUpdate(
    { tenantId: tenantObjectId, provider: "MOCK_SWIGGY", externalOutletId: "6a3c17666bb70afe757e4a91" },
    { outletId: outletObjectId, isActive: true, isSandbox: true, isDeleted: false },
    { upsert: true, new: true }
  );
  console.log("Seeding Swiggy mappings completed successfully.");

  // Part 1: Verify Seeded Randomness
  console.log("\n--- PART 1: Testing Seeded Randomness ---");
  const run1Orders: any[] = [];
  const run2Orders: any[] = [];

  const seed = 54321;

  // Launch Run 1
  console.log(`Triggering Simulation Run 1 (Seed: ${seed}, 3 orders)...`);
  const session1 = await SimulatorService.startSimulation({
    tenantId,
    outletId,
    provider: "MOCK_SWIGGY",
    mode: "BURST",
    totalOrders: 3,
    speed: "FAST",
    chaosMode: false,
    seed
  });

  // Wait for session 1 to complete
  await waitForSession(session1._id.toString());
  
  // Collect details of generated orders
  const orders1 = await ExternalOrder.find({ sessionId: session1._id }).sort({ createdAt: 1 });
  orders1.forEach((ord, i) => {
    const pay = ord.rawPayload as any;
    console.log(`Run 1 Order ${i + 1}: ID=${ord.externalOrderId}, Status=${ord.status}, Total=${pay?.pricing?.total_amount}, Items=${pay?.items?.map((it: any) => `${it.name} (qty ${it.quantity})`).join(", ")}`);
    run1Orders.push({
      total: pay?.pricing?.total_amount,
      items: pay?.items?.map((it: any) => `${it.name}:${it.quantity}`).join("|")
    });
  });

  // Part 2: Verify Metrics Aggregation (Run right after Session 1 finishes, before Session 2 steals the orders)
  console.log("\n--- PART 2: Testing Metrics Aggregation ---");
  const directCount = await ExternalOrder.countDocuments({ sessionId: session1._id });
  const rawAggregate = await ExternalOrder.aggregate([
    { $match: { sessionId: session1._id } }
  ]);
  console.log(`Diagnostic: countDocuments = ${directCount}`);
  console.log("Diagnostic: rawAggregate =", JSON.stringify(rawAggregate, null, 2));

  const metrics = await SimulationMetricsService.getMetrics(session1._id.toString());
  console.log("Aggregated KPIs for Session 1:");
  console.log(`- Throughput: ${metrics?.throughput} orders/sec`);
  console.log(`- Success Count: ${metrics?.successCount}`);
  console.log(`- Success Rate: ${metrics?.successRate}%`);
  console.log(`- Queue Depth: ${metrics?.queueDepth}`);
  console.log(`- Retries Count: ${metrics?.retries}`);
  console.log(`- Ingest Latency: ${metrics?.averageLatencyMs} ms`);

  // Part 3: Verify Simulation Event Stream Logs
  console.log("\n--- PART 3: Testing Event Stream Logs ---");
  const logs = await SimulationLog.find({ sessionId: session1._id }).sort({ timestamp: 1 });
  console.log("Emitted Event Logs sequence:");
  logs.forEach(log => {
    console.log(`[${log.timestamp.toLocaleTimeString()}] ${log.eventType} (Order: ${log.externalOrderId || "N/A"})`);
  });

  // Launch Run 2 with the same seed
  console.log(`\nTriggering Simulation Run 2 (Same Seed: ${seed}, 3 orders)...`);
  const session2 = await SimulatorService.startSimulation({
    tenantId,
    outletId,
    provider: "MOCK_SWIGGY",
    mode: "BURST",
    totalOrders: 3,
    speed: "FAST",
    chaosMode: false,
    seed
  });

  await waitForSession(session2._id.toString());

  const orders2 = await ExternalOrder.find({ sessionId: session2._id }).sort({ createdAt: 1 });
  orders2.forEach((ord, i) => {
    const pay = ord.rawPayload as any;
    console.log(`Run 2 Order ${i + 1}: ID=${ord.externalOrderId}, Status=${ord.status}, Total=${pay?.pricing?.total_amount}, Items=${pay?.items?.map((it: any) => `${it.name} (qty ${it.quantity})`).join(", ")}`);
    run2Orders.push({
      total: pay?.pricing?.total_amount,
      items: pay?.items?.map((it: any) => `${it.name}:${it.quantity}`).join("|")
    });
  });

  // Assert seeded randomness matches
  console.log("\nVerifying deterministic equivalence of seeded runs:");
  let matchCount = 0;
  for (let i = 0; i < 3; i++) {
    const r1 = run1Orders[i];
    const r2 = run2Orders[i];
    if (r1 && r2 && r1.total === r2.total && r1.items === r2.items) {
      console.log(`✓ Order ${i + 1} matches perfectly!`);
      matchCount++;
    } else {
      console.error(`✗ Order ${i + 1} mismatch:`, r1, r2);
    }
  }

  if (matchCount === 3) {
    console.log("SUCCESS: Seeded traffic generation is 100% reproducible.");
  } else {
    console.error("FAILURE: Seeded randomness is non-deterministic!");
    process.exit(1);
  }

  // Part 4: Verify Graceful Cancellation
  console.log("\n--- PART 4: Testing Graceful Cancellation ---");
  console.log("Triggering continuous simulation run...");
  const sessionCancel = await SimulatorService.startSimulation({
    tenantId,
    outletId,
    provider: "MOCK_SWIGGY",
    mode: "CONTINUOUS",
    durationMinutes: 5,
    speed: "FAST",
    chaosMode: false
  });

  // Wait a moment for it to start placing orders
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  console.log("Triggering Stop/Cancellation...");
  const stoppedSession = await SimulatorService.stopSimulation(sessionCancel._id.toString());
  console.log(`Stopped Session Status: ${stoppedSession?.status}`);
  
  if (stoppedSession?.status === "CANCELLED") {
    console.log("SUCCESS: Simulation cancelled and cleaned up successfully.");
  } else {
    console.error(`FAILURE: Expected status to be CANCELLED but got ${stoppedSession?.status}`);
    process.exit(1);
  }

  // Part 5: Verify Performance limits and STRESS_TEST profile
  console.log("\n--- PART 5: Testing Performance Limits & STRESS_TEST Profile ---");
  console.log("Triggering 3 concurrent fast sessions to fill concurrent limit...");
  const sList = [];
  try {
    for (let i = 0; i < 3; i++) {
      sList.push(await SimulatorService.startSimulation({
        tenantId,
        outletId,
        provider: "MOCK_SWIGGY",
        mode: "BURST",
        totalOrders: 5,
        speed: "FAST",
        chaosMode: false
      }));
    }
    console.log("Starting 4th concurrent session (should fail)...");
    await SimulatorService.startSimulation({
      tenantId,
      outletId,
      provider: "MOCK_SWIGGY",
      mode: "BURST",
      totalOrders: 5,
      speed: "FAST",
      chaosMode: false
    });
    console.error("FAILURE: 4th concurrent session did not fail!");
    process.exit(1);
  } catch (err: any) {
    console.log(`✓ Concurrent limit check successful: ${err.message}`);
  }

  // Cleanup the active concurrent sessions
  for (const s of sList) {
    await SimulatorService.stopSimulation(s._id.toString());
  }

  // Run a short burst using STRESS_TEST profile
  console.log("Triggering 50 orders using STRESS_TEST profile...");
  const stressSession = await SimulatorService.startSimulation({
    tenantId,
    outletId,
    provider: "MOCK_SWIGGY",
    mode: "BURST",
    totalOrders: 50,
    speed: "STRESS_TEST",
    chaosMode: false
  });
  await waitForSession(stressSession._id.toString());
  console.log("✓ STRESS_TEST session completed successfully.");

  console.log("\nAll manual simulator tests passed cleanly!");
  console.log("Waiting 3 seconds for background operations to drain before disconnecting Mongoose...");
  await new Promise(resolve => setTimeout(resolve, 3000));
  await mongoose.disconnect();
  console.log("Mongoose disconnected successfully.");
  process.exit(0);
}

async function waitForSession(sessionId: string) {
  while (true) {
    const session = await SimulationSession.findById(sessionId);
    if (!session) return;
    if (session.status !== "RUNNING") {
      console.log(`Session finished with status: ${session.status}`);
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 800));
  }
}

runSimulatorTest().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
