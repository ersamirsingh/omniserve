import mongoose from "mongoose";
import { connectTestDB, closeTestDB } from "../shared/shared-utils.js";
import Tenant from "../../../src/models/tenant.model.js";
import User from "../../../src/models/user.model.js";
import Table from "../../../src/models/table.model.js";
import HelpRequest from "../../../src/models/helpRequest.model.js";
import Notification from "../../../src/models/notification.model.js";
import Reservation from "../../../src/models/reservation.model.js";
import { HelpRequestController } from "../../../src/modules/helpRequest/helpRequest.controller.js";
import { ReservationService } from "../../../src/modules/order/reservation.service.js";
import Customer from "../../../src/models/customer.model.js";
import QRSession from "../../../src/models/qrsession.model.js";
async function runSupportAndLockTests() {
  console.log("[SupportLockTest] Starting Support Ticketing & Reservation Lock Acceptance Tests...");
  await connectTestDB();

  const tid = new mongoose.Types.ObjectId();
  const requesterId = new mongoose.Types.ObjectId();
  const adminId = new mongoose.Types.ObjectId();
  const tableId = new mongoose.Types.ObjectId();
  const outletId = new mongoose.Types.ObjectId();

  // Cleanup
  await Tenant.deleteMany({ $or: [{ _id: tid }, { slug: "support-lock-tenant" }] });
  await User.deleteMany({ $or: [{ _id: { $in: [requesterId, adminId] } }, { email: { $in: ["staff@omniserve.com", "sysadmin@omniserve.com"] } }] });
  await Table.deleteMany({ $or: [{ tenantId: tid }, { qrToken: "qr_token_sl" }] });
  await HelpRequest.deleteMany({});
  await Notification.deleteMany({});
  await Reservation.deleteMany({ tenantId: tid });
  await Customer.deleteMany({ tenantId: tid });
  await QRSession.deleteMany({ tenantId: tid });

  // 1. Seed base data
  await Tenant.create({
    _id: tid,
    name: "Support Lock Tenant",
    slug: "support-lock-tenant",
    ownerId: new mongoose.Types.ObjectId(),
    status: "ACTIVE"
  });

  const requester = await User.create({
    _id: requesterId,
    tenantId: tid,
    firstName: "Staff",
    lastName: "Member",
    email: "staff@omniserve.com",
    passwordHash: "dummy_hash",
    role: "STAFF",
    status: "ACTIVE",
    isDeleted: false
  });

  const admin = await User.create({
    _id: adminId,
    tenantId: null,
    firstName: "System",
    lastName: "Admin",
    email: "sysadmin@omniserve.com",
    passwordHash: "dummy_hash",
    role: "SYSTEM_ADMIN",
    status: "ACTIVE",
    isDeleted: false
  });

  const table = await Table.create({
    _id: tableId,
    tenantId: tid,
    outletId,
    tableNumber: "SL-1",
    seatCount: 4,
    qrToken: "qr_token_sl",
    status: "ACTIVE",
    operationalStatus: "AVAILABLE"
  });

  // Mock Outlet as active
  const Outlet = mongoose.model("Outlet");
  await Outlet.create({
    _id: outletId,
    tenantId: tid,
    restaurantId: new mongoose.Types.ObjectId(),
    name: "Support Lock Outlet",
    slug: "support-lock-outlet",
    address: "SL Street",
    city: "Bangalore",
    state: "Karnataka",
    pincode: "560001",
    status: "ACTIVE",
    isDeleted: false
  });

  // --- 2. Test Help Support Ticketing & Notifications ---
  console.log("\n--- Testing Help Ticketing & Notification Pipelines ---");

  // Create Help Request via Controller (Mock Request/Response objects)
  let createResPayload: any = null;
  const mockReq = {
    user: { userId: requesterId.toString(), tenantId: tid.toString(), role: "STAFF" },
    body: {
      description: "App crashed when opening Billing splits on route /operations/billing",
      screenshot: "data:image/png;base64,mock_screenshot_data",
      context: {
        pageRoute: "/operations/billing",
        timestamp: new Date().toISOString(),
        errorLogSnippet: "[TypeError] Cannot read properties of undefined (reading 'price')"
      }
    }
  } as any;

  const mockRes = {
    status: (code: number) => {
      return {
        json: (data: any) => {
          createResPayload = { code, data };
        }
      };
    }
  } as any;

  await HelpRequestController.createHelpRequest(mockReq, mockRes);
  if (createResPayload?.code !== 201) {
    throw new Error(`Failed to create help request: ${JSON.stringify(createResPayload)}`);
  }
  console.log("✔ Help request successfully registered via controller!");

  const ticket = await HelpRequest.findOne({ userId: requesterId });
  if (!ticket || ticket.description !== mockReq.body.description) {
    throw new Error("HelpRequest database persistence failed!");
  }
  console.log("✔ Help request validated in DB!");

  // Verify Admin received the notification
  const adminNotification = await Notification.findOne({ userId: adminId });
  if (!adminNotification || adminNotification.title !== "New Support Request") {
    throw new Error("System Admin failed to receive help request notification!");
  }
  console.log("✔ System Admin received help alert notification correctly!");

  const mockResolveReq = {
    user: { userId: adminId.toString(), role: "SYSTEM_ADMIN" },
    params: { id: ticket._id.toString() },
    body: {
      status: "RESOLVED",
      resolutionNote: "Resolved issue. Fixed Null pointer reference in Billing component."
    }
  } as any;

  let resolveResPayload: any = null;
  const mockResolveRes = {
    status: (code: number) => {
      return {
        json: (data: any) => {
          resolveResPayload = { code, data };
        }
      };
    }
  } as any;

  await HelpRequestController.resolveHelpRequest(mockResolveReq, mockResolveRes);
  if (resolveResPayload?.code !== 200) {
    throw new Error(`Failed to resolve help request: ${JSON.stringify(resolveResPayload)}`);
  }
  console.log("✔ Help request successfully resolved by admin!");

  // Verify requester received resolution notification
  const userNotification = await Notification.findOne({ userId: requesterId });
  if (!userNotification || !userNotification.title.startsWith("Support Request Status Update")) {
    throw new Error("Requester failed to receive resolution notification!");
  }
  console.log("✔ Requester received resolve alert notification successfully! Title: ", userNotification.title);

  // --- 3. Test Table Status Booking Guards ---
  console.log("\n--- Testing Reservation Operational Status Guards ---");

  const resInput = {
    outletId: outletId.toString(),
    guestName: "Praveen",
    partySize: 2,
    scheduledAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes later (within 2-hour operational check window)
    guestPhone: "9876543211",
    tableId: tableId.toString(),
    seatNumbers: ["Seat 1", "Seat 2"]
  };

  // Try when table is AVAILABLE
  const successRes = await ReservationService.createReservation(tid, resInput);
  if (!successRes.reservationId) {
    throw new Error("Expected reservation to succeed for AVAILABLE table status!");
  }
  console.log("✔ Reservation successfully created on AVAILABLE table status!");

  // Delete previous reservation to clean overlap checks
  await Reservation.deleteMany({ tenantId: tid });

  // Update table status to BILL_REQUESTED
  table.operationalStatus = "BILL_REQUESTED";
  await table.save();

  // Try creating reservation now
  try {
    await ReservationService.createReservation(tid, resInput);
    throw new Error("Expected reservation on BILL_REQUESTED table to fail!");
  } catch (err: any) {
    if (err.message.includes("is currently bill requested and cannot be reserved")) {
      console.log("✔ Reservation on BILL_REQUESTED table correctly blocked with descriptive error message!");
    } else {
      throw err;
    }
  }

  // Update table status to OCCUPIED
  table.operationalStatus = "OCCUPIED";
  await table.save();

  // Try creating reservation now
  try {
    await ReservationService.createReservation(tid, resInput);
    throw new Error("Expected reservation on OCCUPIED table to fail!");
  } catch (err: any) {
    if (err.message.includes("is currently occupied and cannot be reserved")) {
      console.log("✔ Reservation on OCCUPIED table correctly blocked with descriptive error message!");
    } else {
      throw err;
    }
  }

  // Clean up
  await Tenant.deleteMany({ _id: tid });
  await User.deleteMany({ _id: { $in: [requesterId, adminId] } });
  await Table.deleteMany({ tenantId: tid });
  await HelpRequest.deleteMany({});
  await Notification.deleteMany({});
  await Reservation.deleteMany({ tenantId: tid });

  await closeTestDB();
  console.log("\n[SupportLockTest] All Support Ticket & Reservation Lock Tests Passed successfully! ✅");
}

runSupportAndLockTests().catch(err => {
  console.error("Test execution failed: ", err);
  process.exit(1);
});
