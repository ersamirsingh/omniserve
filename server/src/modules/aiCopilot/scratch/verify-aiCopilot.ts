import mongoose from 'mongoose';
import 'dotenv/config';

import { QueryRouter } from '../router/query-router.js';
import { AggregationTools } from '../tools/aggregation.tools.js';

async function runTests() {
  console.log('=== STARTING RAG SYSTEM VERIFICATION ===\n');

  console.log('--- 1. Testing Query Router Classifier ---');
  const queries = [
    { text: 'Which outlet had the highest revenue in May?', role: 'SUPER_ADMIN' },
    { text: 'Trace external order ext-9988 to internal payment status', role: 'RESTAURANT_OWNER' },
    { text: 'Analyze this webhook error log: invalid signature on event', role: 'SYSTEM_ADMIN' },
    { text: 'Search customer feedback for mentions of cold food', role: 'OUTLET_MANAGER' },
  ];

  for (const q of queries) {
    try {
      const decision = await QueryRouter.classifyQuery(q.text, q.role as any);
      console.log(`Query: "${q.text}"`);
      console.log(`Result: Intent = ${decision.intent}, Backend = ${decision.backend}, Tool = ${decision.toolName || 'none'}\n`);
    } catch (e: any) {
      console.error(`Classification failed for "${q.text}":`, e.message);
    }
  }

  console.log('--- 2. Testing Security Boundary Scope Enforcement ---');
  const testUsers = [
    {
      user: { role: 'OUTLET_MANAGER', tenantId: '60c72b2f9b1d8b2bad123456', outletId: '60c72b2f9b1d8b2bad999999' },
      rawParams: { outletId: '60c72b2f9b1d8b2bad000000', tenantId: '60c72b2f9b1d8b2bad111111' },
    },
    {
      user: { role: 'RESTAURANT_OWNER', tenantId: '60c72b2f9b1d8b2bad123456' },
      rawParams: { outletId: '60c72b2f9b1d8b2bad888888' },
    },
    {
      user: { role: 'SUPER_ADMIN' },
      rawParams: { tenantId: '60c72b2f9b1d8b2bad123456', outletId: '60c72b2f9b1d8b2bad999999' },
    },
  ];

  for (const item of testUsers) {
    const result = QueryRouter.enforceSecurityScope(item.user as any, item.rawParams);
    console.log(`Role: ${item.user.role}`);
    console.log(`User Session: tenantId=${item.user.tenantId || 'N/A'}, outletId=${item.user.outletId || 'N/A'}`);
    console.log(`Requested: tenantId=${item.rawParams.tenantId || 'N/A'}, outletId=${item.rawParams.outletId || 'N/A'}`);
    console.log(`Enforced Scope: tenantId=${result.scope.tenantId || 'N/A'}, outletId=${result.scope.outletId || 'N/A'}`);
    console.log(`Access Allowed: ${result.isAllowed}\n`);
  }

  console.log('--- 3. Testing Aggregation Pipelines against DB ---');
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('MONGO_URI is missing from env. Skipping database connection tests.');
    return;
  }

  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB successfully.');

    const dummyTenantId = '65f123456789abcdef012345';
    const dummyOutletId = '65f123456789abcdef012346';

    console.log('Running dry-run query on getRevenueByPeriod...');
    const rev = await AggregationTools.getRevenueByPeriod(dummyTenantId, dummyOutletId);
    console.log(`Revenue Aggregation completed. Found ${rev.length} rows.`);

    console.log('Running dry-run query on getOrderCountAndStatus...');
    const stats = await AggregationTools.getOrderCountAndStatus(dummyTenantId, dummyOutletId);
    console.log(`Order status statistics completed. Found ${stats.length} groups.`);

    console.log('Running dry-run query on getTopMenuItems...');
    const items = await AggregationTools.getTopMenuItems(dummyTenantId, dummyOutletId);
    console.log(`Top items aggregation completed. Found ${items.length} items.`);

    console.log('Running dry-run query on getLowInventoryAlerts...');
    const stock = await AggregationTools.getLowInventoryAlerts(dummyTenantId, dummyOutletId);
    console.log(`Low stock alerts completed. Found ${stock.length} alerts.`);
  } catch (err: any) {
    console.error('Database tests encountered an error:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }

  console.log('\n=== VERIFICATION FINISHED ===');
}

runTests();
