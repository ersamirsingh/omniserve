import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });

import dns from 'dns';
try {
   dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
   console.warn('Unable to set custom DNS servers, using system defaults:', e);
}

import mongoose from 'mongoose';
const originalStartSession = mongoose.startSession;
mongoose.startSession = async function(options) {
  const session = await originalStartSession.call(mongoose, options);
  session.startTransaction = () => {};
  session.commitTransaction = async () => {};
  session.abortTransaction = async () => {};
  session.inTransaction = () => false;
  return session;
};
import jwt from 'jsonwebtoken';
import app from '../../../server/src/app.js';
import Tenant from '../../../server/src/models/tenant.model.js';
import User from '../../../server/src/models/user.model.js';
import Restaurant from '../../../server/src/models/restaurant.model.js';
import Outlet from '../../../server/src/models/outlet.model.js';
import Order from '../../../server/src/models/order.model.js';
import Customer from '../../../server/src/models/customer.model.js';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key';

const MONGO_URIS = [
  process.env.MONGO_URI,
  "mongodb+srv://futurestack07:nitishkumar07@teckstack.lqqhjs0.mongodb.net/FoodMesh-Test-New",
  "mongodb://127.0.0.1:27017/FoodMesh-AcceptanceShared"
].filter(Boolean);
const PORT = 5005;

async function runCompatibilityAcceptance() {
  console.log('--- STARTING SHARED COMPATIBILITY ACCEPTANCE TEST ---');
  
  let connected = false;
  for (const uri of MONGO_URIS) {
    try {
      console.log(`Connecting to: ${uri}`);
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 4000 });
      console.log('Connected successfully!');
      connected = true;
      break;
    } catch (e) {
      console.warn(`Connection failed: ${e.message}`);
    }
  }
  if (!connected) {
    throw new Error('Unable to connect to MongoDB.');
  }

  // Full cleanup
  const collections = await mongoose.connection.db.listCollections().toArray();
  for (const col of collections) {
    await mongoose.connection.db.dropCollection(col.name);
  }
  console.log('Test database cleaned.');

  const tenantId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();
  const outletId = new mongoose.Types.ObjectId();
  const restaurantId = new mongoose.Types.ObjectId();

  await Tenant.create({ _id: tenantId, name: 'Acceptance Shared Tenant', slug: 'acceptance-shared', ownerId: userId, status: 'ACTIVE' });
  await User.create({ _id: userId, tenantId, firstName: 'Accept', lastName: 'Tester', email: 'test@acceptance.com', passwordHash: 'hash', role: 'SUPER_ADMIN' });
  await Restaurant.create({ _id: restaurantId, tenantId, name: 'Compat Rest', cuisineType: ['General'] });
  await Outlet.create({
    _id: outletId,
    tenantId,
    restaurantId,
    name: 'Compat Outlet',
    address: '456 Test Road, Delhi',
    city: 'Delhi',
    state: 'Delhi',
    pincode: '110002'
  });

  // Create a test customer (required by Order schema)
  const customer = await Customer.create({
    tenantId,
    firstName: 'Test',
    lastName: 'Customer',
    phone: '9876543210',
    email: 'test.customer@compat.com'
  });

  // Create one Online order and one Dine-In order directly in DB
  const onlineOrder = await Order.create({
    tenantId,
    outletId,
    customerId: customer._id,
    orderNumber: 'COMPAT-ONLINE-101',
    source: 'WEBSITE',
    subtotal: 100,
    totalAmount: 100,
    orderStatus: 'PENDING',
    paymentStatus: 'PENDING'
  });

  const dineInOrder = await Order.create({
    tenantId,
    outletId,
    customerId: customer._id,
    orderNumber: 'COMPAT-DINEIN-202',
    source: 'QR_DINE_IN',
    subtotal: 200,
    totalAmount: 200,
    orderStatus: 'PENDING',
    paymentStatus: 'PENDING'
  });

  const token = jwt.sign({ userId: userId.toString(), tenantId: tenantId.toString(), role: 'SUPER_ADMIN', status: 'ACTIVE' }, process.env.JWT_SECRET);

  const server = app.listen(PORT, async () => {
    console.log(`Server listening on port ${PORT}`);
    try {
      // ─── STEP 1: Verify /api/orders (ALL mode) returns ALL orders ───
      console.log('\n[1] Querying GET /api/orders (ALL mode - no operationalMode filter)...');
      // Orders are at /api/orders (NOT /api/v1/orders)
      const allRes = await fetch(`http://localhost:${PORT}/api/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const allData = await allRes.json();
      console.log(`  ALL Mode count: ${allData.data?.orders?.length || 0}`);
      
      // Response uses 'id' field (mapped from _id)
      const hasOnline = (allData.data?.orders || []).some(o => 
        o.id?.toString() === onlineOrder._id.toString()
      );
      const hasDineIn = (allData.data?.orders || []).some(o => 
        o.id?.toString() === dineInOrder._id.toString()
      );
      console.log(`  Contains online order: ${hasOnline}, Contains dine-in order: ${hasDineIn}`);
      if (!hasOnline || !hasDineIn) {
        console.log('  Order IDs in response:', allData.data?.orders?.map(o => o.id));
        throw new Error('/orders compatibility mode did not return both online and dine-in orders!');
      }
      console.log('  ✓ PASS: Legacy /orders ALL mode compatibility verified.');

      // ─── STEP 2: Verify ONLINE filter ───
      console.log('\n[2] Querying GET /api/orders?operationalMode=ONLINE...');
      const onlineRes = await fetch(`http://localhost:${PORT}/api/orders?operationalMode=ONLINE`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const onlineData = await onlineRes.json();
      console.log(`  ONLINE Mode count: ${onlineData.data?.orders?.length || 0}`);
      const onlineHasWebsite = (onlineData.data?.orders || []).some(o => 
        o.id?.toString() === onlineOrder._id.toString()
      );
      const onlineHasDineIn = (onlineData.data?.orders || []).some(o => 
        o.id?.toString() === dineInOrder._id.toString()
      );
      if (!onlineHasWebsite) throw new Error('WEBSITE order missing from ONLINE filter!');
      if (onlineHasDineIn) throw new Error('QR_DINE_IN order leaked into ONLINE filter!');
      console.log('  ✓ PASS: ONLINE filter returns only online orders.');

      // ─── STEP 3: Verify DINE_IN filter ───
      console.log('\n[3] Querying GET /api/orders?operationalMode=DINE_IN...');
      const dineInRes = await fetch(`http://localhost:${PORT}/api/orders?operationalMode=DINE_IN`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dineInData = await dineInRes.json();
      console.log(`  DINE_IN Mode count: ${dineInData.data?.orders?.length || 0}`);
      const dineInHasQR = (dineInData.data?.orders || []).some(o => 
        o.id?.toString() === dineInOrder._id.toString()
      );
      const dineInHasWebsite = (dineInData.data?.orders || []).some(o => 
        o.id?.toString() === onlineOrder._id.toString()
      );
      if (!dineInHasQR) throw new Error('QR_DINE_IN order missing from DINE_IN filter!');
      if (dineInHasWebsite) throw new Error('WEBSITE order leaked into DINE_IN filter!');
      console.log('  ✓ PASS: DINE_IN filter returns only dine-in orders.');

      // ─── STEP 4: Verify GET /api/orders/:id works ───
      console.log(`\n[4] Querying GET /api/orders/${onlineOrder._id.toString()}...`);
      const getRes = await fetch(`http://localhost:${PORT}/api/orders/${onlineOrder._id.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const getData = await getRes.json();
      console.log('  Retrieve HTTP status:', getRes.status, getData.success);
      // The detail endpoint returns data.id (not data._id)
      if (getRes.status !== 200 || !getData.success || getData.data?.id?.toString() !== onlineOrder._id.toString()) {
        console.log('  Response data:', JSON.stringify(getData.data));
        throw new Error('Failed to retrieve specific order details!');
      }
      console.log('  ✓ PASS: GET by ID compatibility verified.');

      // ─── STEP 5: Verify invalid order ID returns clean error ───
      const invalidId = '6a3c17666bb70afe757e0000';
      console.log(`\n[5] Querying GET /api/orders/${invalidId} (Invalid ID)...`);
      const invalidRes = await fetch(`http://localhost:${PORT}/api/orders/${invalidId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const invalidData = await invalidRes.json();
      console.log('  Invalid ID HTTP status:', invalidRes.status, invalidData.success);
      if (invalidRes.status !== 404 && invalidRes.status !== 400) {
        throw new Error(`Invalid order ID did not trigger a clean error status code! Got: ${invalidRes.status}`);
      }
      console.log('  ✓ PASS: Invalid ID graceful recovery verified.');

      // ─── STEP 6: Verify classification math ───
      console.log('\n[6] Verifying classification math...');
      const allOrders = await Order.find({ tenantId, isDeleted: false });
      const onlineOrders = allOrders.filter(o => ['SWIGGY', 'ZOMATO', 'WEBSITE', 'ONLINE', 'DELIVERY', 'TAKEAWAY', 'ONDC', 'WHATSAPP'].includes(o.source));
      const dineInOrders = allOrders.filter(o => ['DINE_IN', 'QR_DINE_IN', 'WAITER', 'POS'].includes(o.source));
      console.log(`  Total: ${allOrders.length}, Online: ${onlineOrders.length}, DineIn: ${dineInOrders.length}`);
      const classified = onlineOrders.length + dineInOrders.length;
      if (classified !== allOrders.length) {
        throw new Error(`Classification gap: ${allOrders.length} total but only ${classified} classified!`);
      }
      console.log(`  ✓ PASS: Classification covers ${classified}/${allOrders.length} orders with 0 gaps.`);

      console.log('\n═══════════════════════════════════════════════════════');
      console.log('  SHARED COMPATIBILITY ACCEPTANCE TEST: ALL PASSED');
      console.log('═══════════════════════════════════════════════════════');
      server.close();
      await mongoose.disconnect();
      process.exit(0);
    } catch (err) {
      console.error('\n✗ FAIL: Compatibility Acceptance failed:', err.message || err);
      server.close();
      await mongoose.disconnect();
      process.exit(1);
    }
  });
}

runCompatibilityAcceptance();
