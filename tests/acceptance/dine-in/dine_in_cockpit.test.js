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
import Table from '../../../server/src/models/table.model.js';
import Category from '../../../server/src/models/category.model.js';
import MenuItem from '../../../server/src/models/menuitems.model.js';
import Order from '../../../server/src/models/order.model.js';
import QRSession from '../../../server/src/models/qrsession.model.js';
import OrderTimeline from '../../../server/src/models/ordertimeline.model.js';
import { RealtimeService } from '../../../server/src/services/realtime.service.js';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key';

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/FoodMesh-AcceptanceDineIn";
const PORT = 5004;

async function runDineInAcceptance() {
  console.log('--- STARTING DINE-IN COCKPIT ACCEPTANCE TEST ---');
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB.');

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

  await Tenant.create({ _id: tenantId, name: 'Acceptance DineIn Tenant', slug: 'acceptance-dinein', ownerId: userId, status: 'ACTIVE' });
  await User.create({ _id: userId, tenantId, firstName: 'Accept', lastName: 'Tester', email: 'test@acceptance.com', passwordHash: 'hash', role: 'SUPER_ADMIN' });
  await Restaurant.create({ _id: restaurantId, tenantId, name: 'Burger Land', cuisineType: ['Fast Food'] });
  
  await Outlet.create({
    _id: outletId,
    tenantId,
    restaurantId,
    name: 'Acceptance Outlet',
    address: '123 Main Road, Delhi',
    city: 'Delhi',
    state: 'Delhi',
    pincode: '110001'
  });

  const table = await Table.create({
    tenantId,
    outletId,
    tableNumber: 'Table A',
    qrToken: 'T101-ACCEPT',
    status: 'ACTIVE',
    operationalStatus: 'AVAILABLE',
    seatCount: 4
  });

  const category = await Category.create({ tenantId, outletId, name: 'Main' });
  const menuItem = await MenuItem.create({
    tenantId,
    outletId,
    categoryId: category._id,
    name: 'Cheese Burger',
    price: 150,
    isAvailable: true
  });

  const token = jwt.sign({ userId: userId.toString(), tenantId: tenantId.toString(), role: 'SUPER_ADMIN', status: 'ACTIVE' }, process.env.JWT_SECRET);

  const server = app.listen(PORT, async () => {
    console.log(`Server listening on port ${PORT}`);
    // Initialize RealtimeService so QR resolve and WebSocket paths work
    RealtimeService.initialize(server);
    try {
      // ─── STEP 1: Resolve QR token ───
      console.log('\n[1] Resolving QR Token...');
      // Public routes are at /api/public/ (NOT /api/v1/public/)
      const resolveRes = await fetch(`http://localhost:${PORT}/api/public/qr/resolve/T101-ACCEPT`);
      const resolveData = await resolveRes.json();
      console.log('  Resolve HTTP status:', resolveRes.status, resolveData.success);
      if (resolveRes.status !== 200 || !resolveData.success) {
        console.log('  Resolve response:', JSON.stringify(resolveData));
        throw new Error('QR Token resolution failed!');
      }
      console.log('  ✓ PASS: QR token resolved successfully.');

      // ─── STEP 2: Place QR Order ───
      console.log('\n[2] Placing QR Dine-In Order...');
      const orderPayload = {
        tableToken: 'T101-ACCEPT',
        seatNumber: 'Seat 2',
        customer: { name: 'DineIn Customer', phone: '9876543212' },
        items: [{ itemId: menuItem._id.toString(), name: 'Cheese Burger', quantity: 1, price: 150 }]
      };

      // QR order route at /api/public/qr/orders
      const orderRes = await fetch(`http://localhost:${PORT}/api/public/qr/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });
      const orderData = await orderRes.json();
      console.log('  Order Placement HTTP status:', orderRes.status, orderData.success);
      if (orderRes.status !== 201 || !orderData.success) {
        console.log('  Order response:', JSON.stringify(orderData));
        throw new Error('Dine-In order placement failed!');
      }

      // The QR order response may use internalOrderId or _id or orderId
      const internalOrderId = orderData.data?.internalOrderId || orderData.data?.orderId || orderData.data?._id;
      console.log(`  Dine-In Order created. ID: ${internalOrderId}`);
      if (!internalOrderId) {
        console.log('  Full response data:', JSON.stringify(orderData.data));
        throw new Error('Could not extract order ID from response!');
      }

      // Verify classification
      const checkOrder = await Order.findById(internalOrderId);
      if (!checkOrder) throw new Error('Order not found in DB after placement!');
      console.log(`  Order source: ${checkOrder.source}`);
      if (checkOrder.source !== 'QR_DINE_IN') {
        throw new Error(`Expected source QR_DINE_IN, got ${checkOrder.source}`);
      }
      console.log('  ✓ PASS: Dine-In source verified.');

      // ─── STEP 3: Verify table session ───
      console.log('\n[3] Verifying table and QR session state...');
      const checkTable = await Table.findById(table._id);
      console.log(`  Table activeSessionId: ${checkTable.activeSessionId}`);
      if (!checkTable.activeSessionId) {
        throw new Error('Table did not acquire activeSessionId!');
      }
      const session = await QRSession.findById(checkTable.activeSessionId);
      if (!session) throw new Error('QR Session not found!');
      console.log(`  QR Session status: ${session.status}`);
      // After order placement, session transitions from ACTIVE to ORDERED
      const validStatuses = ['OPEN', 'ACTIVE', 'ORDERED'];
      if (!validStatuses.includes(session.status)) {
        throw new Error(`Expected session status OPEN/ACTIVE/ORDERED, got ${session.status}`);
      }
      console.log('  ✓ PASS: QR Session and table state verified.');

      // ─── STEP 4: Query Dine-In Cockpit ───
      console.log('\n[4] Querying operationalMode=DINE_IN orders list...');
      // Orders route is at /api/orders (NOT /api/v1/orders)
      const listRes = await fetch(`http://localhost:${PORT}/api/orders?operationalMode=DINE_IN`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const listData = await listRes.json();
      console.log(`  API returned ${listData.data?.orders?.length || 0} orders`);
      
      // Response uses 'id' field (mapped from _id)
      const hasOrder = (listData.data?.orders || []).some(o => 
        o.id?.toString() === internalOrderId?.toString()
      );
      console.log(`  Order exists in DINE_IN workspace list: ${hasOrder}`);
      if (!hasOrder) {
        console.log('  Order IDs in response:', listData.data?.orders?.map(o => o.id));
        throw new Error('Order not found in operationalMode=DINE_IN query!');
      }

      // Verify NOT in Online Cockpit
      console.log('  Querying operationalMode=ONLINE orders list...');
      const onlineListRes = await fetch(`http://localhost:${PORT}/api/orders?operationalMode=ONLINE`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const onlineListData = await onlineListRes.json();
      const inOnline = (onlineListData.data?.orders || []).some(o => 
        o.id?.toString() === internalOrderId?.toString()
      );
      console.log(`  Order exists in ONLINE workspace list: ${inOnline}`);
      if (inOnline) {
        throw new Error('Dine-In order leaked into ONLINE workspace!');
      }
      console.log('  ✓ PASS: Dine-In Cockpit isolation verified.');

      // ─── STEP 5: Full lifecycle ───
      console.log('\n[5] Running full lifecycle transitions...');
      // Status update route is at /api/orders/:id/status
      const statuses = ['ACCEPTED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED'];
      for (const s of statuses) {
        console.log(`  Advancing status to: ${s}`);
        const transitionRes = await fetch(`http://localhost:${PORT}/api/orders/${internalOrderId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ orderStatus: s })
        });
        if (transitionRes.status !== 200) {
          const errBody = await transitionRes.json();
          throw new Error(`Transition to ${s} failed: ${JSON.stringify(errBody)}`);
        }
      }

      // Verify final order status
      const finalOrder = await Order.findById(internalOrderId);
      console.log(`  Final order status in DB: ${finalOrder.orderStatus}`);
      if (finalOrder.orderStatus !== 'COMPLETED') {
        throw new Error(`Expected COMPLETED, got ${finalOrder.orderStatus}`);
      }
      console.log('  ✓ PASS: Full Dine-In Lifecycle transitions verified.');

      console.log('\n═══════════════════════════════════════════════');
      console.log('  DINE-IN COCKPIT ACCEPTANCE TEST: ALL PASSED');
      console.log('═══════════════════════════════════════════════');
      server.close();
      await mongoose.disconnect();
      process.exit(0);
    } catch (err) {
      console.error('\n✗ FAIL: Dine-In Cockpit Acceptance failed:', err.message || err);
      server.close();
      await mongoose.disconnect();
      process.exit(1);
    }
  });
}

runDineInAcceptance();
