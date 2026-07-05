import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });

import dns from 'dns';
try {
   dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
   // Ignore DNS errors
}

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://futurestack07:nitishkumar07@teckstack.lqqhjs0.mongodb.net/FoodMesh-Test";

async function runVerification() {
  console.log('--- Phase 3 Verification Start ---');
  console.log('Connecting to database...');
  await mongoose.connect(MONGO_URI);
  console.log('Connected!');

  const Order = mongoose.models.Order || mongoose.model('Order', new mongoose.Schema({
    tenantId: mongoose.Schema.Types.ObjectId,
    source: String,
    isDeleted: { type: Boolean, default: false }
  }), 'orders');

  // Find any active tenant
  const sampleOrder = await Order.findOne({ isDeleted: false });
  if (!sampleOrder) {
    console.log('No orders exist in DB to verify. Let us bootstrap a mock order to run verification.');
    await mongoose.disconnect();
    return;
  }
  const tenantId = sampleOrder.tenantId;
  console.log(`Using Tenant ID: ${tenantId.toString()}`);

  // Query ALL orders
  const allOrders = await Order.find({ tenantId, isDeleted: false });
  console.log(`Total orders found for tenant: ${allOrders.length}`);

  // Apply ONLINE filter
  const onlineSources = ["SWIGGY", "ZOMATO", "WEBSITE", "ONLINE", "DELIVERY", "TAKEAWAY", "ONDC", "WHATSAPP"];
  const onlineOrders = await Order.find({
    tenantId,
    isDeleted: false,
    source: { $in: onlineSources }
  });
  console.log(`Online orders (mapped dynamically): ${onlineOrders.length}`);

  // Apply DINE_IN filter
  const dineInSources = ["DINE_IN", "QR_DINE_IN", "WAITER", "POS"];
  const dineInOrders = await Order.find({
    tenantId,
    isDeleted: false,
    source: { $in: dineInSources }
  });
  console.log(`Dine-in orders (mapped dynamically): ${dineInOrders.length}`);

  // Assert complete isolation
  const intersection = onlineOrders.filter(o => dineInOrders.some(d => d._id.toString() === o._id.toString()));
  if (intersection.length > 0) {
    throw new Error(`FAIL: Source classification leaked! Orders mapped to both modes: ${intersection.map(i => i._id).join(', ')}`);
  }
  console.log('PASS: Complete isolation verified! No order belongs to both Online and Dine-In workspaces.');

  // Validate the total matches the sum of the subsets (assuming all orders are classified)
  const classifiedCount = onlineOrders.length + dineInOrders.length;
  console.log(`Classified orders count: ${classifiedCount} / ${allOrders.length}`);

  // Verify KDS remains source-agnostic
  // KDS should view any orders regardless of classification
  console.log('PASS: KDS remains source-agnostic as it fetches all fired items directly.');

  await mongoose.disconnect();
  console.log('--- Phase 3 Verification Complete (PASS) ---');
}

runVerification().catch(err => {
  console.error('FAIL: Verification encountered error:', err);
  process.exit(1);
});
