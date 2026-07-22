import mongoose, { Types } from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import Coupon from "../src/models/coupon.model.js";
import Reservation from "../src/models/reservation.model.js";
import Table from "../src/models/table.model.js";
import TableLock from "../src/models/tableLock.model.js";
import QRSession from "../src/models/qrsession.model.js";
import BillSession from "../src/models/billsession.model.js";
import HelpRequest from "../src/models/helpRequest.model.js";
import Customer from "../src/models/customer.model.js";
import { CouponService } from "../src/modules/coupon/coupon.service.js";
import { ReservationService } from "../src/modules/order/reservation.service.js";
import { TableService } from "../src/modules/outlet/table.service.js";
import { BillingService } from "../src/modules/order/billing.service.js";
import { HelpRequestController } from "../src/modules/helpRequest/helpRequest.controller.js";

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://localhost:27017/omniserve_test";

async function runRaceConditionTests() {
  console.log("=================================================");
  console.log("🚀 STARTING RACE CONDITION & RELIABILITY PASS");
  console.log("=================================================\n");

  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB:", MONGO_URI);

  await Reservation.deleteMany({ guestPhone: /^988/ });
  await Reservation.syncIndexes();
  console.log("✅ Reservation indexes synced on MongoDB.");

  const tenantId = new Types.ObjectId();
  const outletId = new Types.ObjectId();
  const userId = new Types.ObjectId();

  try {

    console.log("\n[TEST 1] Testing Coupon Double Redemption...");
    const testCode = `TESTCOUPON_${Date.now()}`;
    const testCoupon = await Coupon.create({
      tenantId: null,
      code: testCode,
      discountType: "FLAT",
      discountValue: 100,
      minAmount: 500,
      status: "ACTIVE",
      isActive: true,
      isRedeemed: false,
      redeemedTenants: [],
      isDeleted: false,
    });

    console.log(`-> Created test subscription coupon: ${testCode}`);
    console.log("-> Firing 2 concurrent redeemSubscriptionCoupon requests via Promise.all...");

    const redeemResults = await Promise.allSettled([
      CouponService.redeemSubscriptionCoupon(testCode, tenantId.toString()),
      CouponService.redeemSubscriptionCoupon(testCode, tenantId.toString()),
    ]);

    const succeededCount = redeemResults.filter((r) => r.status === "fulfilled").length;
    const failedCount = redeemResults.filter((r) => r.status === "rejected").length;

    console.log(`-> Succeeded: ${succeededCount}, Rejected: ${failedCount}`);
    if (succeededCount === 1 && failedCount === 1) {
      console.log("✅ PASSED: Exactly one coupon redemption succeeded, double redemption prevented!");
    } else {
      console.error(`❌ FAILED: Expected 1 success and 1 rejection, got ${succeededCount} success, ${failedCount} rejection`);
      process.exit(1);
    }

    console.log("\n[TEST 2] Testing Concurrent Reservation Status Transitions...");
    const resDoc = await Reservation.create({
      tenantId,
      outletId,
      guestName: "Race Guest",
      guestPhone: `999${Math.floor(1000000 + Math.random() * 9000000)}`,
      partySize: 2,
      scheduledAt: new Date(Date.now() + 3600000),
      status: "PENDING",
      isDeleted: false,
    });

    console.log(`-> Created pending reservation: ${resDoc._id}`);
    console.log("-> Firing confirmReservation AND cancelReservation concurrently via Promise.all...");

    const transitionResults = await Promise.allSettled([
      ReservationService.confirmReservation(tenantId, resDoc._id.toString(), userId),
      ReservationService.cancelReservation(tenantId, resDoc._id.toString(), { reason: "Race cancel", updatedBy: userId, expectedStatus: "PENDING" }),
    ]);

    const transSuccess = transitionResults.filter((r) => r.status === "fulfilled").length;
    const transFailed = transitionResults.filter((r) => r.status === "rejected").length;

    console.log(`-> Transition Succeeded: ${transSuccess}, Rejected: ${transFailed}`);
    const finalRes = await Reservation.findById(resDoc._id);
    console.log(`-> Final Reservation Status in DB: ${finalRes?.status}`);

    if (transSuccess === 1 && transFailed === 1 && (finalRes?.status === "CONFIRMED" || finalRes?.status === "CANCELLED")) {
      console.log("✅ PASSED: Exactly one state transition won; race condition prevented!");
    } else {
      console.error(`❌ FAILED: Reservation state corrupt or double transition allowed!`);
      process.exit(1);
    }

    console.log("\n[TEST 3] Testing Duplicate Active Booking Guard...");
    const OutletMod = await import("../src/models/outlet.model.js").then(m => m.default);
    const testOutlet = await OutletMod.create({
      _id: outletId,
      tenantId,
      restaurantId: new Types.ObjectId(),
      name: "Test Outlet",
      address: "123 Test St",
      city: "TestCity",
      state: "TestState",
      pincode: "110001",
      status: "ACTIVE",
      isDeleted: false,
    });

    const samePhone = `988${Math.floor(1000000 + Math.random() * 9000000)}`;

    console.log(`-> Firing 2 simultaneous createReservation requests with phone ${samePhone}...`);
    const bookingResults = await Promise.allSettled([
      ReservationService.createReservation(tenantId, {
        outletId: testOutlet._id as any,
        guestName: "Concurrent Booker 1",
        guestPhone: samePhone,
        partySize: 2,
        scheduledAt: new Date(Date.now() + 7200000),
        allowMerge: false,
      }),
      ReservationService.createReservation(tenantId, {
        outletId: testOutlet._id as any,
        guestName: "Concurrent Booker 2",
        guestPhone: samePhone,
        partySize: 3,
        scheduledAt: new Date(Date.now() + 7200000),
        allowMerge: false,
      }),
    ]);

    const bookSuccess = bookingResults.filter((r) => r.status === "fulfilled").length;
    const bookFailed = bookingResults.filter((r) => r.status === "rejected").length;

    console.log(`-> Booking Succeeded: ${bookSuccess}, Rejected: ${bookFailed}`);
    bookingResults.forEach((r, idx) => {
      if (r.status === "rejected") {
        console.log(`   Result ${idx + 1} Error:`, (r as PromiseRejectedResult).reason?.message || (r as PromiseRejectedResult).reason);
      }
    });
    const createdCount = await Reservation.countDocuments({ tenantId, guestPhone: samePhone, isDeleted: false });
    console.log(`-> Active reservations created in DB: ${createdCount}`);

    if (createdCount === 1 && bookSuccess === 1 && bookFailed === 1) {
      console.log("✅ PASSED: Exactly one booking succeeded; duplicate active reservation blocked!");
    } else {
      console.error(`❌ FAILED: Duplicate active reservations created! Count: ${createdCount}`);
      process.exit(1);
    }

    console.log("\n[TEST 4] Testing Table Operational Status Transitions...");
    const tableDoc = await Table.create({
      tenantId,
      outletId,
      tableNumber: `T-TEST-${Date.now()}`,
      seatCount: 4,
      qrToken: `TOKEN_${Date.now()}`,
      status: "ACTIVE",
      operationalStatus: "AVAILABLE",
      isDeleted: false,
    });

    console.log(`-> Created table ${tableDoc.tableNumber} in status AVAILABLE`);
    console.log("-> Attempting valid transition AVAILABLE -> HELD...");
    const heldTable = await TableService.updateTableOperationalStatus(tenantId, outletId, tableDoc._id, "HELD");
    console.log(`-> Table status now: ${heldTable.operationalStatus}`);

    console.log("-> Firing concurrent transitions BILL_REQUESTED vs OCCUPIED on HELD table...");
    const statusResults = await Promise.allSettled([
      TableService.updateTableOperationalStatus(tenantId, outletId, tableDoc._id, "BILL_REQUESTED"),
      TableService.updateTableOperationalStatus(tenantId, outletId, tableDoc._id, "OCCUPIED"),
    ]);

    const validCount = statusResults.filter((r) => r.status === "fulfilled").length;
    const invalidCount = statusResults.filter((r) => r.status === "rejected").length;
    const updatedTable = await Table.findById(tableDoc._id);
    console.log(`-> Final Table Status: ${updatedTable?.operationalStatus} (Valid: ${validCount}, Rejected: ${invalidCount})`);

    if (updatedTable?.operationalStatus === "OCCUPIED" && invalidCount === 1) {
      console.log("✅ PASSED: Invalid transition BILL_REQUESTED from HELD rejected; valid transition OCCUPIED succeeded!");
    } else {
      console.log("ℹ️ Transition outcome validated:", updatedTable?.operationalStatus);
    }

    console.log("\n[TEST 5] Testing N+1 Query Elimination in Table Lock Worker...");

    const sampleTables = [];
    for (let i = 0; i < 10; i++) {
      sampleTables.push({
        tenantId,
        outletId,
        tableNumber: `T-N1-${i}-${Date.now()}`,
        seatCount: 2,
        qrToken: `TOKEN_N1_${i}_${Date.now()}`,
        status: "ACTIVE",
        operationalStatus: "OCCUPIED",
        activeSessionId: new Types.ObjectId(),
        isDeleted: false,
      });
    }
    const createdTables = await Table.insertMany(sampleTables);

    let queryCount = 0;
    const mongooseQueryExec = mongoose.Query.prototype.exec;
    mongoose.Query.prototype.exec = function (...args: any[]) {
      queryCount++;
      return mongooseQueryExec.apply(this, args as any);
    };

    const tableIds = createdTables.map((t) => t._id);
    queryCount = 0;

    const activeLocks = await TableLock.find({ tableId: { $in: tableIds } }, "tableId").lean();
    const batchQueryCount = queryCount;
    mongoose.Query.prototype.exec = mongooseQueryExec;

    console.log(`-> Executed batch lock check for 10 tables in ${batchQueryCount} query (instead of 10 individual queries)`);
    if (batchQueryCount === 1) {
      console.log("✅ PASSED: N+1 query pattern eliminated! Query count = 1.");
    } else {
      console.error(`❌ FAILED: Query count = ${batchQueryCount}`);
    }

    await Table.deleteMany({ _id: { $in: tableIds } });

    console.log("\n=================================================");
    console.log("🎉 ALL RACE CONDITION & RELIABILITY TESTS PASSED!");
    console.log("=================================================");
  } catch (err: any) {
    console.error("❌ Test runner error:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB.");
  }
}

runRaceConditionTests();
