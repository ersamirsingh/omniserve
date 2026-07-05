import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });

import dns from 'dns';
try {
   dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
   console.warn('Unable to set custom DNS servers, using system defaults:', e);
}

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://futurestack07:nitishkumar07@teckstack.lqqhjs0.mongodb.net/FoodMesh-Test";

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected!');

  const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
    email: String,
    firstName: String,
    lastName: String,
    role: String,
    tenantId: mongoose.Schema.Types.ObjectId,
    restaurantId: mongoose.Schema.Types.ObjectId,
    outletId: mongoose.Schema.Types.ObjectId,
    outletIds: [mongoose.Schema.Types.ObjectId],
    isDeleted: { type: Boolean, default: false }
  }), 'users');

  const Tenant = mongoose.models.Tenant || mongoose.model('Tenant', new mongoose.Schema({
    name: String
  }), 'tenants');

  const Outlet = mongoose.models.Outlet || mongoose.model('Outlet', new mongoose.Schema({
    name: String
  }), 'outlets');

  const users = await User.find({ isDeleted: false });
  console.log(`\nFound ${users.length} active users:`);

  for (const user of users) {
    const tenant = user.tenantId ? await Tenant.findById(user.tenantId) : null;
    const outlet = user.outletId ? await Outlet.findById(user.outletId) : null;
    const outletsStr = user.outletIds && user.outletIds.length > 0
      ? (await Outlet.find({ _id: { $in: user.outletIds } })).map(o => o.name).join(', ')
      : 'None';

    console.log(`- Email: ${user.email}`);
    console.log(`  Name: ${user.firstName} ${user.lastName || ''}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Tenant: ${tenant ? tenant.name : 'None'} (${user.tenantId?.toString()})`);
    console.log(`  Primary Outlet: ${outlet ? outlet.name : 'None'} (${user.outletId?.toString()})`);
    console.log(`  Assigned Outlets list: ${outletsStr}`);
    console.log(`-----------------------------------------------`);
  }

  await mongoose.disconnect();
}

main().catch(console.error);
