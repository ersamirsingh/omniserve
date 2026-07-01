import mongoose from "mongoose";
import http from "http";

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

import app from "../src/app.js";
import Tenant from "../src/models/tenant.model.js";
import User from "../src/models/user.model.js";
import Restaurant from "../src/models/restaurant.model.js";
import Outlet from "../src/models/outlet.model.js";
import Table from "../src/models/table.model.js";
import QRSession from "../src/models/qrsession.model.js";
import WaiterTask from "../src/models/waitertask.model.js";
import Order from "../src/models/order.model.js";
import IntegrationEventQueue from "../src/models/integration-event-queue.model.js";
import { WaiterTaskService } from "../src/services/dining/waiter-task.service.js";
import { checkSlaBreaches } from "../src/workers/waiter-task-escalation.worker.js";
import { OutboxPollerService } from "../src/services/outbox-poller.service.js";
import { EventBusService } from "../src/services/event-bus.service.js";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test_jwt_secret_key";

const TEST_PORT = 5098;
const MONGO_URIS = [
  "mongodb://127.0.0.1:27017/FoodMesh-Test"
];

async function runTests() {
  console.log("Connecting to MongoDB...");
  let connected = false;
  for (const uri of MONGO_URIS) {
    try {
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
  const tenantName = "E2E Operations Tenant";
  const existingTenant = await Tenant.findOne({ name: tenantName });
  if (existingTenant) {
    const tid = existingTenant._id;
    await Tenant.deleteMany({ _id: tid });
    await User.deleteMany({ tenantId: tid });
    await Restaurant.deleteMany({ tenantId: tid });
    await Outlet.deleteMany({ tenantId: tid });
    await Table.deleteMany({ tenantId: tid });
    await QRSession.deleteMany({ tenantId: tid });
    await WaiterTask.deleteMany({ tenantId: tid });
    await Order.deleteMany({ tenantId: tid });
    await IntegrationEventQueue.deleteMany({ tenantId: tid });
  }

  // 1. Seed Tenant, Users, Restaurant, Outlet, Table
  console.log("Seeding Test Database...");
  const tenantId = new mongoose.Types.ObjectId();
  const ownerId = new mongoose.Types.ObjectId();
  const waiterId = new mongoose.Types.ObjectId();
  const restaurantId = new mongoose.Types.ObjectId();
  const outletId = new mongoose.Types.ObjectId();
  const tableId = new mongoose.Types.ObjectId();

  await Tenant.create({
    _id: tenantId,
    name: tenantName,
    slug: "e2e-ops-tenant",
    ownerId,
    status: "ACTIVE"
  });

  await User.create({
    _id: ownerId,
    tenantId,
    firstName: "Owner",
    lastName: "User",
    email: "owner-ops@foodmesh.io",
    passwordHash: "dummyhash",
    role: "RESTAURANT_OWNER",
    status: "ACTIVE"
  });

  await User.create({
    _id: waiterId,
    tenantId,
    firstName: "Waiter",
    lastName: "One",
    email: "waiter-ops@foodmesh.io",
    passwordHash: "dummyhash",
    role: "STAFF",
    status: "ACTIVE"
  });

  await Restaurant.create({
    _id: restaurantId,
    tenantId,
    name: "Ops Restaurant",
    status: "ACTIVE"
  });

  // Seed outlet with custom waiter task SLAs (very short for testing)
  await Outlet.create({
    _id: outletId,
    tenantId,
    restaurantId,
    name: "Ops Outlet",
    address: "123 Ops Lane",
    city: "Bangalore",
    state: "Karnataka",
    pincode: "560001",
    status: "ACTIVE",
    waiterTaskSlas: {
      WATER: 2000,       // 2 seconds SLA for testing breaches!
      BILL: 3000,        // 3 seconds
      SERVE_FOOD: 2000,  // 2 seconds
      CLEANING: 2000,    // 2 seconds
      CUSTOM: 2000
    }
  });

  const table = await Table.create({
    _id: tableId,
    tenantId,
    outletId,
    tableNumber: "T10",
    seatCount: 4,
    operationalStatus: "AVAILABLE",
    status: "ACTIVE"
  });

  console.log("Test data seeded successfully.");

  // Boot server
  const server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(TEST_PORT, () => {
      console.log(`Test server booted on port ${TEST_PORT}`);
      resolve();
    });
  });

  try {
    // -------------------------------------------------------------
    // TEST 1: QR Assistance Request API (Event-Driven Ingestion)
    // -------------------------------------------------------------
    console.log("\n--- TEST 1: QR Assistance Request API ---");
    const fetchRes = await fetch(`http://localhost:${TEST_PORT}/api/public/qr/assist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tableToken: table.qrToken,
        action: "WATER",
        seatNumber: "A2"
      })
    });

    if (fetchRes.status !== 200) {
      const text = await fetchRes.text();
      throw new Error(`FAIL: Assistance request failed with status: ${fetchRes.status}. Body: ${text}`);
    }

    const assistRes: any = await fetchRes.json();
    console.log("Assistance request response:", assistRes);
    const { sessionId } = assistRes.data;
    if (!sessionId) {
      throw new Error("FAIL: No sessionId returned in response.");
    }

    // Verify session is active
    const session = await QRSession.findById(sessionId);
    if (!session || session.status !== "ACTIVE") {
      throw new Error("FAIL: Active QRSession was not resolved or opened.");
    }
    console.log(`SUCCESS: Resolved active session ${sessionId}.`);

    // Verify outbox queue contains QR_ASSISTANCE_REQUESTED
    const outboxEvents = await IntegrationEventQueue.find({
      tenantId,
      eventType: "QR_ASSISTANCE_REQUESTED"
    });
    if (outboxEvents.length !== 1) {
      throw new Error(`FAIL: Expected 1 outbox event for QR_ASSISTANCE_REQUESTED, found ${outboxEvents.length}`);
    }
    console.log("SUCCESS: QR_ASSISTANCE_REQUESTED event logged in transactional outbox.");

    // -------------------------------------------------------------
    // TEST 2: Ingest & Orchestrate outbox event to spawn Waiter Task
    // -------------------------------------------------------------
    console.log("\n--- TEST 2: Ingesting QR_ASSISTANCE_REQUESTED Outbox Event ---");
    await OutboxPollerService.triggerManualRun();

    // Verify Waiter Task is created
    const tasks = await WaiterTask.find({ sessionId });
    if (tasks.length !== 1) {
      throw new Error(`FAIL: Expected 1 WaiterTask to be created via outbox worker, found ${tasks.length}`);
    }

    const task = tasks[0];
    console.log("Created WaiterTask:", {
      id: task._id,
      type: task.taskType,
      source: task.source,
      status: task.status,
      priority: task.priority,
      slaLimitMs: task.slaLimitMs,
      seatNumber: task.seatNumber,
      metadata: task.metadata
    });

    if (task.taskType !== "WATER" || task.source !== "QR_ASSISTANCE" || task.status !== "CREATED" || task.priority !== "LOW") {
      throw new Error("FAIL: WaiterTask fields do not match expected mapped values.");
    }
    if (task.slaLimitMs !== 2000) {
      throw new Error(`FAIL: Configured SLA limit was not loaded from Outlet settings. Found: ${task.slaLimitMs}`);
    }
    console.log("SUCCESS: WaiterTask spawned with generalized properties and custom SLA.");

    // Verify WAITER_TASK_CREATED outbox event was generated
    const createdEvent = await IntegrationEventQueue.findOne({
      tenantId,
      eventType: "WAITER_TASK_CREATED",
      aggregateId: task._id
    });
    if (!createdEvent) {
      throw new Error("FAIL: WAITER_TASK_CREATED outbox event was not generated.");
    }
    console.log("SUCCESS: WAITER_TASK_CREATED outbox event generated.");

    // -------------------------------------------------------------
    // TEST 3: SLA Breach Checker and Escalation Daemon
    // -------------------------------------------------------------
    console.log("\n--- TEST 3: WaiterTask SLA Escalation Daemon ---");
    
    // Wait 2.5 seconds to trigger SLA breach (SLA is set to 2 seconds)
    console.log("Waiting 2.5 seconds for SLA timer breach...");
    await new Promise(resolve => setTimeout(resolve, 2500));

    // Run escalation worker check
    await checkSlaBreaches();

    const escalatedTask = await WaiterTask.findById(task._id);
    if (!escalatedTask || escalatedTask.status !== "ESCALATED") {
      throw new Error(`FAIL: Task status was not transitioned to ESCALATED. Found: ${escalatedTask?.status}`);
    }
    if (!escalatedTask.escalatedAt) {
      throw new Error("FAIL: escalatedAt timestamp was not recorded.");
    }

    console.log("Escalated Task details:", {
      id: escalatedTask._id,
      status: escalatedTask.status,
      escalatedAt: escalatedTask.escalatedAt
    });
    console.log("SUCCESS: SLA breach correctly escalated status and recorded timestamp.");

    // Verify outbox queue contains WAITER_TASK_ESCALATED
    const escalatedEvent = await IntegrationEventQueue.findOne({
      tenantId,
      eventType: "WAITER_TASK_ESCALATED",
      aggregateId: task._id
    });
    if (!escalatedEvent) {
      throw new Error("FAIL: WAITER_TASK_ESCALATED outbox event was not generated.");
    }
    console.log("SUCCESS: WAITER_TASK_ESCALATED outbox event logged in transactional outbox.");

    // -------------------------------------------------------------
    // TEST 4: WaiterTask Lifecycle Transitions
    // -------------------------------------------------------------
    console.log("\n--- TEST 4: WaiterTask Lifecycle Transitions ---");
    
    // Transition: CREATED/ESCALATED -> ACKNOWLEDGED
    console.log("Acknowledging task...");
    const ackTask = await WaiterTaskService.acknowledgeTask(task._id, waiterId);
    if (ackTask.status !== "ACKNOWLEDGED" || !ackTask.acknowledgedAt || ackTask.assignedWaiterId?.toString() !== waiterId.toString()) {
      throw new Error("FAIL: Transition to ACKNOWLEDGED failed.");
    }
    console.log(`SUCCESS: Transitioned to ACKNOWLEDGED. AcknowledgedAt: ${ackTask.acknowledgedAt}`);

    // Transition: ACKNOWLEDGED -> IN_PROGRESS
    console.log("Starting task progress...");
    const progTask = await WaiterTaskService.startTaskProgress(task._id);
    if (progTask.status !== "IN_PROGRESS" || !progTask.inProgressAt) {
      throw new Error("FAIL: Transition to IN_PROGRESS failed.");
    }
    console.log(`SUCCESS: Transitioned to IN_PROGRESS. InProgressAt: ${progTask.inProgressAt}`);

    // Transition: IN_PROGRESS -> COMPLETED
    console.log("Completing task...");
    const compTask = await WaiterTaskService.completeTask(task._id);
    if (compTask.status !== "COMPLETED" || !compTask.completedAt) {
      throw new Error("FAIL: Transition to COMPLETED failed.");
    }
    console.log(`SUCCESS: Transitioned to COMPLETED. CompletedAt: ${compTask.completedAt}`);

    // Run poller to clear outbox events
    await OutboxPollerService.triggerManualRun();

    // -------------------------------------------------------------
    // TEST 5: Event-Driven Waiter Workflow - ORDER_READY
    // -------------------------------------------------------------
    console.log("\n--- TEST 5: Event-Driven Waiter Workflow - ORDER_READY ---");
    const orderId = new mongoose.Types.ObjectId();
    const order = await Order.create({
      _id: orderId,
      tenantId,
      outletId,
      customerId: new mongoose.Types.ObjectId(),
      orderNumber: "ORD-999",
      fulfillmentType: "DINE_IN",
      orderStatus: "READY",
      subtotal: 450,
      totalAmount: 450,
      source: "QR_DINE_IN",
      items: [],
      diningContext: {
        tableId,
        tableNumber: "T10",
        seatNumber: "A2",
        sessionId
      }
    });

    // Publish ORDER_STATUS_CHANGED event to trigger composite worker
    await EventBusService.publishOrderStatusChanged(
      tenantId,
      outletId,
      orderId,
      order
    );

    // Run poller
    await OutboxPollerService.triggerManualRun();

    // Verify serve food task created
    const serveFoodTask = await WaiterTask.findOne({
      sessionId,
      taskType: "SERVE_FOOD"
    });

    if (!serveFoodTask || serveFoodTask.source !== "KITCHEN" || serveFoodTask.priority !== "HIGH") {
      throw new Error("FAIL: Serve food task was not correctly spawned from kitchen event.");
    }
    console.log("SUCCESS: Event-driven SERVE_FOOD task spawned correctly:", {
      id: serveFoodTask._id,
      type: serveFoodTask.taskType,
      source: serveFoodTask.source,
      status: serveFoodTask.status
    });

    // -------------------------------------------------------------
    // TEST 6: Event-Driven Waiter Workflow - TABLE_CLEANING_STARTED
    // -------------------------------------------------------------
    console.log("\n--- TEST 6: Event-Driven Waiter Workflow - TABLE_CLEANING_STARTED ---");
    
    // Transition Table to CLEANING
    const tableCleaningPayload = {
      tableId: tableId.toString(),
      tableNumber: "T10",
      status: "CLEANING",
      updatedAt: new Date()
    };
    await EventBusService.publishTableCleaningStarted(tenantId, outletId, tableId, tableCleaningPayload);

    // Run poller
    await OutboxPollerService.triggerManualRun();

    // Verify cleaning task created
    const cleaningTask = await WaiterTask.findOne({
      sessionId,
      taskType: "CLEANING"
    });

    if (!cleaningTask || cleaningTask.source !== "TABLE_CLEANING" || cleaningTask.status !== "CREATED") {
      throw new Error("FAIL: Cleaning task was not correctly spawned from table cleaning started event.");
    }
    console.log("SUCCESS: Event-driven CLEANING task spawned correctly:", {
      id: cleaningTask._id,
      type: cleaningTask.taskType,
      source: cleaningTask.source,
      status: cleaningTask.status
    });

    console.log("\nAll Milestone 3 targeted verification tests passed successfully!");
    
    // Cleanup
    server.close();
    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    server.close();
    await mongoose.disconnect();
    throw error;
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
