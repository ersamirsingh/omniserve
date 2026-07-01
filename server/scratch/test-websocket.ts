import dns from "dns";
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {
  console.warn("Unable to set DNS, using defaults:", e);
}

import express from "express";
import http from "http";
import jwt from "jsonwebtoken";
import { io as ioClient } from "socket.io-client";
import { RealtimeService } from "../src/services/realtime.service.js";

const TEST_PORT = 5099;
const JWT_SECRET = "test-secret-key-123456";
process.env.JWT_SECRET = JWT_SECRET;

async function runWebSocketTest() {
  console.log("Setting up Express app & HTTP server...");
  const app = express();
  const server = http.createServer(app);

  console.log("Initializing RealtimeService WebSocket Server...");
  const ioServer = RealtimeService.initialize(server);

  await new Promise<void>((resolve) => {
    server.listen(TEST_PORT, () => {
      console.log(`Test server listening on port ${TEST_PORT}`);
      resolve();
    });
  });

  // 1. Generate Waiter token
  const waiterToken = jwt.sign({
    userId: "6a3edae1bdb53e1ce514d8cf",
    tenantId: "6a37bcb95603e7018ba3f6cd",
    outletId: "6a37bd0b5603e7018ba3f6fc",
    email: "waiter@example.com",
    role: "WAITER",
    status: "ACTIVE"
  }, JWT_SECRET);

  // 2. Connect client 1 (Waiter Socket)
  console.log("\n--- TEST 1: Waiter Connection & Auto-Join Outlet Room ---");
  const waiterSocket = ioClient(`http://localhost:${TEST_PORT}`, {
    auth: { token: waiterToken }
  });

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Waiter socket connection timeout")), 5000);
    waiterSocket.on("connect", () => {
      clearTimeout(timeout);
      console.log("Waiter Socket connected successfully! ID:", waiterSocket.id);
      resolve();
    });
    waiterSocket.on("connect_error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

  // 3. Connect client 2 (Customer Socket with sessionId)
  console.log("\n--- TEST 2: Customer Connection & Auto-Join Session Room ---");
  const sessionId = "6a3edae1bdb53e1ce514d888";
  const customerToken = jwt.sign({
    tenantId: "6a37bcb95603e7018ba3f6cd",
    outletId: "6a37bd0b5603e7018ba3f6fc",
    role: "CUSTOMER",
    sessionId
  }, JWT_SECRET);

  const customerSocket = ioClient(`http://localhost:${TEST_PORT}`, {
    auth: { token: customerToken }
  });

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Customer socket connection timeout")), 5000);
    customerSocket.on("connect", () => {
      clearTimeout(timeout);
      console.log("Customer Socket connected successfully! ID:", customerSocket.id);
      resolve();
    });
    customerSocket.on("connect_error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

  // 4. Test Outlet Room Broadcast
  console.log("\n--- TEST 3: Broadcast to Outlet Room ---");
  const testPayload = { tableId: "table123", status: "OCCUPIED" };
  
  const waiterReceivedPromise = new Promise<void>((resolve) => {
    waiterSocket.on("TABLE_STATUS_CHANGED", (data: any) => {
      console.log("Waiter received TABLE_STATUS_CHANGED:", data);
      if (data.data.tableId === "table123" && data.data.status === "OCCUPIED") {
        resolve();
      }
    });
  });

  // Since customer is not in outlet room, they shouldn't receive this
  let customerReceived = false;
  customerSocket.on("TABLE_STATUS_CHANGED", () => {
    customerReceived = true;
  });

  RealtimeService.sendToOutlet("6a37bcb95603e7018ba3f6cd", "6a37bd0b5603e7018ba3f6fc", "TABLE_STATUS_CHANGED", {
    event: "TABLE_STATUS_CHANGED",
    meta: {},
    data: testPayload
  });

  await waiterReceivedPromise;
  await new Promise(resolve => setTimeout(resolve, 500));
  
  if (customerReceived) {
    throw new Error("FAIL: Customer received outlet room message but is not in outlet room!");
  }
  console.log("SUCCESS: Only waiter socket received the outlet broadcast.");

  // 5. Test Session Room Broadcast
  console.log("\n--- TEST 4: Broadcast to Session Room ---");
  const cartPayload = { itemsCount: 3, total: 360 };

  const customerReceivedPromise = new Promise<void>((resolve) => {
    customerSocket.on("CART_UPDATED", (data: any) => {
      console.log("Customer received CART_UPDATED:", data);
      if (data.data.total === 360) {
        resolve();
      }
    });
  });

  RealtimeService.sendToSession(sessionId, "CART_UPDATED", {
    event: "CART_UPDATED",
    meta: {},
    data: cartPayload
  });

  await customerReceivedPromise;
  console.log("SUCCESS: Customer socket received the session broadcast.");

  // 6. Test Authentication Rejection
  console.log("\n--- TEST 5: Authentication Rejection on Invalid Token ---");
  const badSocket = ioClient(`http://localhost:${TEST_PORT}`, {
    auth: { token: "invalid-token-string" }
  });

  await new Promise<void>((resolve, reject) => {
    badSocket.on("connect", () => {
      reject(new Error("FAIL: Connection succeeded with an invalid token!"));
    });
    badSocket.on("connect_error", (err) => {
      console.log("SUCCESS: Connection rejected as expected. Error:", err.message);
      resolve();
    });
  });

  console.log("\nAll WebSocket targeted tests passed cleanly!");

  // Cleanup
  console.log("Disconnecting sockets and shutting down test server...");
  waiterSocket.disconnect();
  customerSocket.disconnect();
  badSocket.disconnect();
  ioServer.close();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  console.log("Clean exit.");
  process.exit(0);
}

runWebSocketTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
