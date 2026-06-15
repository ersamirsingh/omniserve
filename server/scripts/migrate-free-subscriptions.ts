import { configDotenv } from 'dotenv';
configDotenv();

import mongoose from 'mongoose';
import Tenant from '../src/models/tenant.model.js';
import Subscription from '../src/models/subscription.model.js';
import { SubscriptionPlan, SubscriptionStatus } from '../src/enums/enums.js';

const migrate = async () => {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is missing in environment variables.');
    process.exit(1);
  }

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected successfully.');

    console.log('Running legacy tenant subscription migration...');
    const tenants = await Tenant.find({});
    console.log(`Found ${tenants.length} tenants in database.`);

    let createdCount = 0;
    let skippedCount = 0;

    for (const tenant of tenants) {
      // Check if tenant already has any subscription (active or not) to be idempotent
      const existingSub = await Subscription.findOne({
        tenantId: tenant._id,
        isDeleted: false,
      });

      if (!existingSub) {
        await Subscription.create({
          tenantId: tenant._id,
          plan: SubscriptionPlan.FREE,
          amount: 0,
          startDate: tenant.createdAt || new Date(),
          endDate: null,
          status: SubscriptionStatus.ACTIVE,
          createdBy: tenant.ownerId || null,
          isDeleted: false,
        });
        console.log(`[CREATED] FREE subscription for tenant: ${tenant.name} (${tenant._id})`);
        createdCount++;
      } else {
        console.log(`[SKIPPED] Tenant: ${tenant.name} (${tenant._id}) already has subscription: ${existingSub.plan}`);
        skippedCount++;
      }
    }

    console.log(`Migration Complete. Created: ${createdCount}, Skipped: ${skippedCount}`);
    await mongoose.disconnect();
    console.log('MongoDB disconnected.');
    process.exit(0);
  } catch (error: any) {
    console.error('Migration failed with error:', error.message || error);
    process.exit(1);
  }
};

await migrate();
