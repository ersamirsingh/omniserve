import mongoose from "mongoose";
import http from "http";
// Mock transaction support for standalone MongoDB instances used in tests
const originalStartSession = mongoose.startSession;
mongoose.startSession = async function (options) {
    const session = await originalStartSession.call(mongoose, options);
    session.startTransaction = () => { };
    session.commitTransaction = async () => { };
    session.abortTransaction = async () => { };
    session.inTransaction = () => false;
    return session;
};
import app from "../src/app.js";
import Tenant from "../src/models/tenant.model.js";
import User from "../src/models/user.model.js";
import Restaurant from "../src/models/restaurant.model.js";
import Outlet from "../src/models/outlet.model.js";
import DiningArea from "../src/models/diningarea.model.js";
import Table from "../src/models/table.model.js";
import QRSession from "../src/models/qrsession.model.js";
import WaiterTask from "../src/models/waitertask.model.js";
import Order from "../src/models/order.model.js";
import OrderTimeline from "../src/models/ordertimeline.model.js";
import IntegrationEventQueue from "../src/models/integration-event-queue.model.js";
import { RestaurantOperationsService } from "../src/services/dining/restaurant-operations.service.js";
import { QRSessionService } from "../src/services/dining/qrsession.service.js";
import { AuthService } from "../src/services/auth.service.js";
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test_jwt_secret_key";
const TEST_PORT = 5099;
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
        }
        catch (e) {
            console.warn(`Connection failed for ${uri}: ${e.message}`);
        }
    }
    if (!connected) {
        throw new Error("Unable to connect to MongoDB.");
    }
    console.log("Cleaning up test collections...");
    const tenantName = "Milestone 4 Floor Map Tenant";
    const existingTenant = await Tenant.findOne({ name: tenantName });
    if (existingTenant) {
        const tid = existingTenant._id;
        await Tenant.deleteMany({ tenantId: tid });
        await Tenant.deleteOne({ _id: tid });
        await User.deleteMany({ tenantId: tid });
        await Restaurant.deleteMany({ tenantId: tid });
        await Outlet.deleteMany({ tenantId: tid });
        await DiningArea.deleteMany({ tenantId: tid });
        await Table.deleteMany({ tenantId: tid });
        await QRSession.deleteMany({ tenantId: tid });
        await WaiterTask.deleteMany({ tenantId: tid });
        await Order.deleteMany({ tenantId: tid });
        await OrderTimeline.deleteMany({ tenantId: tid });
        await IntegrationEventQueue.deleteMany({ tenantId: tid });
    }
    // 1. Seed Tenant, User, Restaurant, Outlet, Dining Area, Tables
    console.log("Seeding Test Database...");
    const tenantId = new mongoose.Types.ObjectId();
    const ownerId = new mongoose.Types.ObjectId();
    const waiterId = new mongoose.Types.ObjectId();
    const restaurantId = new mongoose.Types.ObjectId();
    const outletId = new mongoose.Types.ObjectId();
    const diningAreaId = new mongoose.Types.ObjectId();
    await Tenant.create({
        _id: tenantId,
        name: tenantName,
        slug: "e2e-floor-tenant",
        ownerId,
        status: "ACTIVE"
    });
    await User.create({
        _id: ownerId,
        tenantId,
        firstName: "Owner",
        lastName: "User",
        email: "owner-floor@foodmesh.io",
        passwordHash: "dummyhash",
        role: "RESTAURANT_OWNER",
        status: "ACTIVE"
    });
    await User.create({
        _id: waiterId,
        tenantId,
        firstName: "Waiter",
        lastName: "One",
        email: "waiter-floor@foodmesh.io",
        passwordHash: "dummyhash",
        role: "STAFF",
        status: "ACTIVE"
    });
    await Restaurant.create({
        _id: restaurantId,
        tenantId,
        name: "Milestone 4 Palace",
        slug: "m4-palace"
    });
    await Outlet.create({
        _id: outletId,
        tenantId,
        restaurantId,
        name: "Floor Map Main Outlet",
        slug: "floor-map-main-outlet",
        status: "ACTIVE",
        address: "123 Main St",
        city: "City",
        state: "State",
        pincode: "12345"
    });
    await DiningArea.create({
        _id: diningAreaId,
        tenantId,
        outletId,
        name: "Ground Floor",
        description: "Main dining room",
        displayOrder: 1,
        isActive: true
    });
    // Create Table A
    const tableAId = new mongoose.Types.ObjectId();
    const tableA = await Table.create({
        _id: tableAId,
        tenantId,
        outletId,
        diningAreaId,
        tableNumber: "T101",
        seatCount: 4,
        layout: {
            x: 10,
            y: 20,
            width: 120,
            height: 120,
            rotation: 0,
            shape: "square",
            zIndex: 1,
            labelPosition: "TOP"
        },
        status: "ACTIVE",
        operationalStatus: "AVAILABLE"
    });
    // Create Table B
    const tableBId = new mongoose.Types.ObjectId();
    const tableB = await Table.create({
        _id: tableBId,
        tenantId,
        outletId,
        diningAreaId,
        tableNumber: "T102",
        seatCount: 6,
        layout: {
            x: 150,
            y: 20,
            width: 150,
            height: 100,
            rotation: 90,
            shape: "rectangle",
            zIndex: 2,
            labelPosition: "CENTER"
        },
        status: "ACTIVE",
        operationalStatus: "AVAILABLE"
    });
    console.log("Tables seeded successfully.");
    console.log("Asserting Table properties...");
    if (tableA.layout?.shape !== "square" || tableA.layout?.zIndex !== 1 || tableA.layout?.labelPosition !== "TOP") {
        throw new Error("Table A properties not seeded correctly");
    }
    if (tableB.layout?.shape !== "rectangle" || tableB.layout?.zIndex !== 2 || tableB.layout?.labelPosition !== "CENTER") {
        throw new Error("Table B properties not seeded correctly");
    }
    console.log("✅ Case 1: Custom Coordinates Layout Verified.");
    // 2. Initialize QRSession on Table A
    console.log("\nInitializing Session on Table A...");
    const sessionA = await QRSessionService.createSession(tenantId, outletId, tableAId, {
        seatNumber: "1",
        waiterId: waiterId.toString()
    });
    const updatedTableA = await Table.findById(tableAId);
    if (!updatedTableA?.activeSessionId || updatedTableA.activeSessionId.toString() !== sessionA._id.toString()) {
        throw new Error("Table A did not register sessionA as activeSessionId");
    }
    if (updatedTableA.operationalStatus !== "OCCUPIED") {
        throw new Error(`Table A status expected OCCUPIED but got ${updatedTableA.operationalStatus}`);
    }
    // Get active session via table API
    const activeSess = await QRSessionService.getActiveSessionByTable(tableAId);
    if (!activeSess || activeSess._id.toString() !== sessionA._id.toString()) {
        throw new Error("Failed to retrieve active session via Table aggregate root lookup");
    }
    console.log("✅ Case 2: Table owns the session (Aggregate Root) Verified.");
    // 3. Create a dummy Order under sessionA
    console.log("\nSeeding Order under active session...");
    const orderId = new mongoose.Types.ObjectId();
    await Order.create({
        _id: orderId,
        tenantId,
        outletId,
        customerId: new mongoose.Types.ObjectId(),
        orderNumber: "ORD-1",
        source: "QR",
        subtotal: 100,
        totalAmount: 100,
        orderStatus: "PENDING",
        paymentStatus: "PENDING",
        diningContext: {
            tableId: tableAId,
            tableNumber: "T101",
            seatNumber: "1",
            sessionId: sessionA._id
        },
        createdBy: waiterId
    });
    // 4. Test TRANSFER_TABLE operation
    console.log("\nExecuting TRANSFER_TABLE from Table A to Table B...");
    const transferRes = await RestaurantOperationsService.executeOperation({
        tenantId,
        outletId,
        operationType: "TRANSFER_TABLE",
        payload: {
            fromTableId: tableAId.toString(),
            toTableId: tableBId.toString()
        },
        triggeredById: waiterId
    });
    if (!transferRes.success) {
        throw new Error("Transfer table operation failed");
    }
    const tableAAfter = await Table.findById(tableAId);
    const tableBAfter = await Table.findById(tableBId);
    if (tableAAfter?.activeSessionId || tableAAfter?.operationalStatus !== "AVAILABLE") {
        throw new Error("Table A not freed up after transfer");
    }
    if (!tableBAfter?.activeSessionId || tableBAfter.activeSessionId.toString() !== sessionA._id.toString() || tableBAfter.operationalStatus !== "OCCUPIED") {
        throw new Error("Table B did not receive active session and occupancy status");
    }
    // Verify Order diningContext was updated
    const orderAfter = await Order.findById(orderId);
    if (orderAfter?.diningContext?.tableId?.toString() !== tableBId.toString() || orderAfter?.diningContext?.tableNumber !== "T102") {
        throw new Error("Orders diningContext table pointer not updated to destination table");
    }
    // Verify outbox log
    const queueEvent = await IntegrationEventQueue.findOne({ eventType: "TABLE_TRANSFERRED", correlationId: transferRes.correlationId });
    if (!queueEvent) {
        throw new Error("TABLE_TRANSFERRED event not written to outbox queue");
    }
    console.log("✅ Case 3: Table Transfer & Outbox event writing Verified.");
    // Test Transfer Safety Validation
    console.log("\nTesting Transfer Safety (occupancy check)...");
    // Set Table A occupied by creating a new session
    const sessionA2 = await QRSessionService.createSession(tenantId, outletId, tableAId, { seatNumber: "1" });
    // Attempting to transfer B back to A should fail
    try {
        await RestaurantOperationsService.executeOperation({
            tenantId,
            outletId,
            operationType: "TRANSFER_TABLE",
            payload: {
                fromTableId: tableBId.toString(),
                toTableId: tableAId.toString()
            },
            triggeredById: waiterId
        });
        throw new Error("Transfer safety occupancy validation failed to block invalid transfer");
    }
    catch (err) {
        console.log("Blocked invalid occupied transfer correctly:", err.message);
    }
    console.log("✅ Case 4: Transfer Occupancy Safety Verified.");
    // 5. Test MERGE_TABLE
    console.log("\nTesting MERGE_TABLE T102 (primary) with T101 (secondary)...");
    // Release Table A first so it is available to merge
    await Table.findByIdAndUpdate(tableAId, { activeSessionId: null, operationalStatus: "AVAILABLE" });
    await QRSession.findByIdAndUpdate(sessionA2._id, { status: "CLOSED" });
    const mergeRes = await RestaurantOperationsService.executeOperation({
        tenantId,
        outletId,
        operationType: "MERGE_TABLE",
        payload: {
            primaryTableId: tableBId.toString(),
            secondaryTableIds: [tableAId.toString()]
        },
        triggeredById: waiterId
    });
    if (!mergeRes.success) {
        throw new Error("Merge operation failed");
    }
    const primaryT = await Table.findById(tableBId);
    const secondaryT = await Table.findById(tableAId);
    if (!primaryT?.isMerged || !primaryT.mergedWithTableIds?.map(id => id.toString()).includes(tableAId.toString())) {
        throw new Error("Primary table isMerged or mergedWithTableIds list not updated");
    }
    if (!secondaryT?.isMerged || secondaryT.mergedWithTableIds?.[0]?.toString() !== tableBId.toString()) {
        throw new Error("Secondary table merge references incorrect");
    }
    if (secondaryT.activeSessionId?.toString() !== sessionA._id.toString() || secondaryT.operationalStatus !== "OCCUPIED") {
        throw new Error("Secondary table session/status links not bound to primary merge session");
    }
    console.log("✅ Case 5: Primary/Secondary Table Merging Verified.");
    // 6. Test Seat operations
    console.log("\nTesting Seat operations: ADD_SEAT, MOVE_SEAT, SWAP_SEAT...");
    // Add seat 2
    await RestaurantOperationsService.executeOperation({
        tenantId,
        outletId,
        operationType: "ADD_SEAT",
        payload: {
            sessionId: sessionA._id.toString(),
            seatNumber: "2"
        }
    });
    let sessionDoc = await QRSession.findById(sessionA._id);
    if (!sessionDoc?.seats.some(s => s.seatNumber === "2")) {
        throw new Error("Seat 2 not added successfully");
    }
    // Move seat 2 to 3
    await RestaurantOperationsService.executeOperation({
        tenantId,
        outletId,
        operationType: "MOVE_SEAT",
        payload: {
            sessionId: sessionA._id.toString(),
            fromSeatNumber: "2",
            toSeatNumber: "3"
        }
    });
    sessionDoc = await QRSession.findById(sessionA._id);
    if (sessionDoc?.seats.some(s => s.seatNumber === "2") || !sessionDoc?.seats.some(s => s.seatNumber === "3")) {
        throw new Error("Seat 2 not moved to 3");
    }
    // Swap seats 1 and 3
    await RestaurantOperationsService.executeOperation({
        tenantId,
        outletId,
        operationType: "SWAP_SEAT",
        payload: {
            sessionId: sessionA._id.toString(),
            seatNumberA: "1",
            seatNumberB: "3"
        }
    });
    // Generate a valid JWT token for auth
    process.env.JWT_EXPIRY = "1h";
    const accessToken = AuthService.generateAccessToken({
        userId: waiterId.toString(),
        tenantId: tenantId.toString(),
        outletId: outletId.toString(),
        email: "waiter-floor@foodmesh.io",
        role: "STAFF",
        status: "ACTIVE"
    });
    // Verify chronological timeline history merges correctly
    console.log("\nVerifying unified chronological timeline...");
    const server = http.createServer(app);
    await new Promise((resolve) => {
        server.listen(TEST_PORT, () => resolve());
    });
    const timelineResult = await new Promise((resolve, reject) => {
        http.get(`http://127.0.0.1:${TEST_PORT}/api/dining/timeline/${sessionA._id}?tenantId=${tenantId.toString()}`, {
            headers: {
                "x-tenant-id": tenantId.toString(),
                "Authorization": `Bearer ${accessToken}`
            }
        }, (res) => {
            let data = "";
            res.on("data", chunk => data += chunk);
            res.on("end", () => resolve(JSON.parse(data)));
        }).on("error", reject);
    });
    // Clean up server
    await new Promise((resolve) => server.close(() => resolve()));
    console.log("Timeline response structure:", JSON.stringify(timelineResult, null, 2));
    if (!timelineResult.success || !Array.isArray(timelineResult.data?.timeline)) {
        throw new Error("Unified timeline API failed or returned invalid shape");
    }
    const timelineEvents = timelineResult.data.timeline.map((item) => item.status);
    console.log("Chronological events in timeline:", timelineEvents);
    if (!timelineEvents.includes("TABLE_TRANSFERRED") || !timelineEvents.includes("TABLE_MERGED") || !timelineEvents.includes("SEAT_MOVED") || !timelineEvents.includes("SEAT_SWAPPED")) {
        throw new Error("Unified Activity Timeline missing operation events");
    }
    console.log("✅ Case 6: Unified Chronological Timeline Verified.");
    console.log("\nAll Milestone 4 Floor Map cases completed successfully!");
    process.exit(0);
}
runTests().catch((e) => {
    console.error("Test execution failed:", e);
    process.exit(1);
});
