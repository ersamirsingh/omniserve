import mongoose from "mongoose";
import { connectTestDB, closeTestDB } from "../shared/shared-utils.js";
import Tenant from "../../../src/models/tenant.model.js";
import Outlet from "../../../src/models/outlet.model.js";
import Table from "../../../src/models/table.model.js";
import Coupon from "../../../src/models/coupon.model.js";
import Reservation from "../../../src/models/reservation.model.js";
import TableLock from "../../../src/models/tableLock.model.js";
import Customer from "../../../src/models/customer.model.js";
import QRSession from "../../../src/models/qrsession.model.js";
import Order from "../../../src/models/order.model.js";
import { CouponService } from "../../../src/modules/coupon/coupon.service.js";
import { ReservationService } from "../../../src/modules/order/reservation.service.js";
import { TableService } from "../../../src/modules/outlet/table.service.js";

async function runReservationAndCouponTests() {
  console.log("[ResCouponTest] Starting Reservation & Coupon Feature Acceptance Tests...");
  await connectTestDB();

  const tid = new mongoose.Types.ObjectId();
  const oid = new mongoose.Types.ObjectId();
  const tableId1 = new mongoose.Types.ObjectId();
  const tableId2 = new mongoose.Types.ObjectId();

  // Cleanup
  await Tenant.deleteMany({ _id: tid });
  await Outlet.deleteMany({ _id: oid });
  await Table.deleteMany({ tenantId: tid });
  await Coupon.deleteMany({ code: { $in: ["HELD10", "SINGLE20"] } });
  await Reservation.deleteMany({ tenantId: tid });
  await TableLock.deleteMany({});
  await Customer.deleteMany({ tenantId: tid });
  await QRSession.deleteMany({ tenantId: tid });
  await Order.deleteMany({ tenantId: tid });

  // 1. Seed structures
  await Tenant.create({
    _id: tid,
    name: "Res Coupon Tenant",
    slug: "res-coupon-tenant",
    ownerId: new mongoose.Types.ObjectId(),
    status: "ACTIVE"
  });

  await Outlet.create({
    _id: oid,
    tenantId: tid,
    restaurantId: new mongoose.Types.ObjectId(),
    name: "Res Coupon Outlet",
    slug: "res-coupon-outlet",
    address: "Res Coupon Road",
    city: "Bangalore",
    state: "Karnataka",
    pincode: "560001",
    isDeleted: false
  });

  const table1 = await Table.create({
    _id: tableId1,
    tenantId: tid,
    outletId: oid,
    tableNumber: "R-10",
    seatCount: 4,
    qrToken: "qr_token_res_coupon_1",
    status: "ACTIVE",
    operationalStatus: "AVAILABLE"
  });

  const table2 = await Table.create({
    _id: tableId2,
    tenantId: tid,
    outletId: oid,
    tableNumber: "R-11",
    seatCount: 6,
    qrToken: "qr_token_res_coupon_2",
    status: "ACTIVE",
    operationalStatus: "AVAILABLE"
  });

  // --- Coupon Test Suite ---
  console.log("\n--- Testing Coupon Subsystem Security & Restrictions ---");

  // Create a Held Coupon
  await Coupon.create({
    code: "HELD10",
    discountType: "PERCENTAGE",
    discountValue: 10,
    minAmount: 100,
    isActive: true,
    status: "HELD",
    isDeleted: false
  });

  // Validate Held Coupon fails validation
  const heldValidation = await CouponService.validateSubscriptionCoupon("HELD10", 150, tid.toString());
  if (heldValidation.isValid) {
    throw new Error("Expected validation to fail for a HELD coupon!");
  } else {
    console.log("✔ Held coupon successfully blocked: ", heldValidation.reason);
  }

  // Create a Single-use subscription coupon
  await Coupon.create({
    code: "SINGLE20",
    discountType: "PERCENTAGE",
    discountValue: 20,
    minAmount: 100,
    isActive: true,
    status: "ACTIVE",
    isRedeemed: false,
    redeemedTenants: [],
    isDeleted: false
  });

  // Validate Single-use initially succeeds
  const firstUse = await CouponService.validateSubscriptionCoupon("SINGLE20", 200, tid.toString());
  if (!firstUse.isValid) {
    throw new Error(`Expected first coupon use to be valid: ${firstUse.reason}`);
  }
  console.log("✔ Initial validation for single-use coupon succeeded!");

  // Redeem the coupon
  await CouponService.redeemSubscriptionCoupon("SINGLE20", tid.toString());

  // Second validation attempt should fail
  const secondUse = await CouponService.validateSubscriptionCoupon("SINGLE20", 200, tid.toString());
  if (secondUse.isValid) {
    throw new Error("Expected second coupon validation attempt to fail!");
  } else {
    console.log("✔ Duplicate redemption of single-use coupon successfully blocked: ", secondUse.reason);
  }

  // --- Table Holds & Locks ---
  console.log("\n--- Testing Table holds & locks ---");

  // Lock table
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await TableLock.create({
    tableId: tableId1,
    ipAddress: "127.0.0.1",
    lockedAt: new Date(),
    expiresAt
  });
  table1.operationalStatus = "HELD";
  await table1.save();
  console.log("✔ Table 1 successfully placed on HELD status!");

  // Verify TableLock exists
  const lockExists = await TableLock.findOne({ tableId: tableId1 });
  if (!lockExists) {
    throw new Error("Expected table lock to exist!");
  }

  // --- Duplicate Booking Guard & Merge ---
  console.log("\n--- Testing Duplicate-Booking Guard & Merges ---");

  // Create primary reservation
  const resInput = {
    outletId: oid,
    guestName: "Aman Sen",
    partySize: 2,
    scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
    guestPhone: "9876543210",
    tableId: tableId2.toString(),
    seatNumbers: ["Seat 1", "Seat 2"]
  };

  const primaryRes = await ReservationService.createReservation(tid, resInput);
  console.log("✔ Primary reservation created successfully!");

  // Confirm primary reservation
  await ReservationService.confirmReservation(tid, primaryRes.reservationId);
  console.log("✔ Primary reservation confirmed!");

  // Check table status became RESERVED
  const reservedTable = await Table.findById(tableId2);
  if (reservedTable?.operationalStatus !== "RESERVED") {
    throw new Error(`Expected table operational status to be RESERVED, got: ${reservedTable?.operationalStatus}`);
  }
  console.log("✔ Table operational status correctly transitioned to RESERVED!");

  // Attempt duplicate booking under the same phone number
  try {
    await ReservationService.createReservation(tid, {
      ...resInput,
      guestName: "Aman Sen Duplicate",
      partySize: 2,
      seatNumbers: ["Seat 3", "Seat 4"]
    });
    throw new Error("Expected duplicate booking creation to fail!");
  } catch (err: any) {
    if (err.message.startsWith("ACTIVE_BOOKING_EXISTS:")) {
      console.log("✔ Duplicate booking correctly blocked with ACTIVE_BOOKING_EXISTS payload!");
    } else {
      throw err;
    }
  }

  // Perform a merge action instead
  const mergedResult = await ReservationService.createReservation(tid, {
    ...resInput,
    guestName: "Aman Sen Duplicate",
    partySize: 2,
    seatNumbers: ["Seat 3", "Seat 4"],
    allowMerge: true
  });

  // Verify merged reservation size
  const finalRes = await Reservation.findById(primaryRes.reservationId);
  if (!finalRes || finalRes.partySize !== 4) {
    throw new Error(`Expected merged party size of 4, got: ${finalRes?.partySize}`);
  }
  if (finalRes.seatNumbers?.length !== 4) {
    throw new Error(`Expected merged seats to be 4, got: ${finalRes.seatNumbers?.length}`);
  }
  console.log("✔ Booking and seat selections merged successfully! Final party size: 4");

  // Clean up
  await Tenant.deleteMany({ _id: tid });
  await Outlet.deleteMany({ _id: oid });
  await Table.deleteMany({ tenantId: tid });
  await Coupon.deleteMany({ code: { $in: ["HELD10", "SINGLE20"] } });
  await Reservation.deleteMany({ tenantId: tid });
  await TableLock.deleteMany({});
  await Customer.deleteMany({ tenantId: tid });
  await QRSession.deleteMany({ tenantId: tid });
  await Order.deleteMany({ tenantId: tid });

  await closeTestDB();
  console.log("\n[ResCouponTest] All Reservation & Coupon Acceptance Tests Passed successfully!");
}

runReservationAndCouponTests().catch(err => {
  console.error("Test failed: ", err);
  process.exit(1);
});
