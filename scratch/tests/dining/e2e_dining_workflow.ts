import { configDotenv } from 'dotenv';
configDotenv({ path: 'server/.env' });
import dns from 'dns';
try {
   dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
   console.warn('Unable to set custom DNS servers, using system defaults:', e);
}
import mongoose from 'mongoose';
import connectToMongoDB from '../../../server/src/config/db.config.js';
import Table from '../../../server/src/models/table.model.js';
import QRSession from '../../../server/src/models/qrsession.model.js';
import Order from '../../../server/src/models/order.model.js';
import OrderItem from '../../../server/src/models/orderitems.model.js';
import BillSession from '../../../server/src/models/billsession.model.js';
import WaiterTask from '../../../server/src/models/waitertask.model.js';
import MenuItem from '../../../server/src/models/menuitems.model.js';
import { BillingService } from '../../../server/src/services/dining/billing.service.js';

async function run() {
  console.log('--- STARTING E2E DINING WORKFLOW INTEGRATION TEST ---');
  try {
    await connectToMongoDB();
    console.log('Connected to MongoDB successfully.');

    // 1. Fetch active target table and menu item
    const table = await Table.findOne({ status: 'ACTIVE', isDeleted: false });
    if (!table) {
      console.error('No active tables found. Run "Load Demo Catalog" inside Sandbox first.');
      process.exit(1);
    }
    console.log(`Step 1: Found active table: ${table.tableNumber} (Capacity: ${table.seatCount})`);

    const menuItem = await MenuItem.findOne({ isAvailable: true, isDeleted: false });
    if (!menuItem) {
      console.error('No menu items found. Run "Load Demo Catalog" inside Sandbox first.');
      process.exit(1);
    }
    console.log(`Step 1b: Found active menu item: ${menuItem.name} (Price: ₹${menuItem.price})`);

    // 2. Initialize/Join QR session
    console.log('Step 2: Resolving table QR token...');
    let session = await QRSession.findOne({ tableId: table._id, status: 'OPEN' });
    if (!session) {
      session = await QRSession.create({
        tenantId: table.tenantId,
        outletId: table.outletId,
        tableId: table._id,
        status: 'OPEN',
        openedAt: new Date(),
        menuViewedAt: new Date()
      });
      table.activeSessionId = session._id;
      table.operationalStatus = 'OCCUPIED';
      await table.save();
      console.log(`Created new active QR session: ${session.sessionToken}`);
    } else {
      console.log(`Joined existing QR session: ${session.sessionToken}`);
    }

    // 3. Create mock Dine-In order
    console.log('Step 3: Creating mock Dine-In order...');
    const orderNum = 'TEST-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const order = await Order.create({
      tenantId: table.tenantId,
      outletId: table.outletId,
      customerId: new mongoose.Types.ObjectId('6a3c17666bb70afe757e4999'),
      orderNumber: orderNum,
      source: 'DINE_IN',
      subtotal: menuItem.price,
      tax: menuItem.price * 0.05,
      totalAmount: menuItem.price * 1.05,
      orderStatus: 'PENDING',
      paymentStatus: 'PENDING',
      diningContext: {
        tableId: table._id,
        tableNumber: table.tableNumber,
        seatNumber: 'Seat 1',
        sessionId: session._id
      },
      isSandbox: true,
      sessionId: session._id
    });
    console.log(`Created order: ${order.orderNumber} in status PENDING`);

    await OrderItem.create({
      tenantId: table.tenantId,
      orderId: order._id,
      menuItemId: menuItem._id,
      name: menuItem.name,
      quantity: 1,
      unitPrice: menuItem.price,
      totalPrice: menuItem.price,
      isSandbox: true
    });
    console.log('Created order item links.');

    // 4. Test Billing Lazy-Creation
    console.log('Step 4: Requesting session bill (Testing Lazy-Creation)...');
    // Delete any existing bill session to trigger lazy logic
    await BillSession.deleteMany({ sessionId: session._id });
    
    // Test lazy creation
    const billRes = await BillingService.getSessionBill(table.tenantId, session._id.toString());
    console.log(`Lazy-created BillSession: ${billRes.billSession._id} in status: ${billRes.billSession.status}`);
    console.log(`Calculated Total Amount: ₹${billRes.billSession.totalAmount}`);

    if (billRes.billSession.status !== 'OPEN') {
      throw new Error(`Expected BillSession status to be OPEN, got ${billRes.billSession.status}`);
    }

    // 5. Test Waiter Task creation
    console.log('Step 5: Simulating a Water assistance task...');
    const task = await WaiterTask.create({
      tenantId: table.tenantId,
      outletId: table.outletId,
      tableId: table._id,
      sessionId: session._id,
      taskType: 'WATER',
      status: 'CREATED',
      priority: 'MEDIUM',
      source: 'QR_SCAN',
      metadata: { notes: 'Bring 1 bottle of cold water.' }
    });
    console.log(`Created waiter task: ${task.taskType} in status CREATED`);

    // Clean up test transactions to avoid polluting sandbox database
    console.log('Step 6: Cleaning up test data...');
    await OrderItem.deleteMany({ orderId: order._id });
    await Order.deleteOne({ _id: order._id });
    await BillSession.deleteOne({ sessionId: session._id });
    await WaiterTask.deleteOne({ _id: task._id });
    await QRSession.deleteOne({ _id: session._id });
    
    table.activeSessionId = null;
    table.operationalStatus = 'AVAILABLE';
    await table.save();
    console.log('Table restored to AVAILABLE. Cleaned up.');

    console.log('--- ALL INTEGRATION WORKFLOW TESTS PASSED SUCCESSFULLY! ---');
    process.exit(0);
  } catch (error) {
    console.error('Workflow validation failed:', error);
    process.exit(1);
  }
}

run();
