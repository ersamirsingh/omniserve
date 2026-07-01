import dns from 'dns';
try {
   dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
   console.warn('Unable to set DNS:', e);
}

import mongoose from 'mongoose';

const MONGO_URI = "mongodb+srv://futurestack07:nitishkumar07@teckstack.lqqhjs0.mongodb.net/FoodMesh-Test";

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB!');

  const tables = await mongoose.connection.db.collection('tables').find({ isDeleted: false }).toArray();
  const areas = await mongoose.connection.db.collection('diningareas').find({ isDeleted: false }).toArray();
  const outlets = await mongoose.connection.db.collection('outlets').find({ isDeleted: false }).toArray();

  console.log(`\n--- OUTLETS (${outlets.length}) ---`);
  outlets.forEach(o => console.log(`  - [${o._id}] Name: "${o.name}"`));

  console.log(`\n--- DINING AREAS (${areas.length}) ---`);
  areas.forEach(a => console.log(`  - [${a._id}] Name: "${a.name}" | OutletId: ${a.outletId} | TenantId: ${a.tenantId}`));

  console.log(`\n--- TABLES (${tables.length}) ---`);
  tables.forEach(t => console.log(`  - [${t._id}] Number: ${t.tableNumber} | AreaId: ${t.diningAreaId} | OutletId: ${t.outletId} | Status: ${t.operationalStatus}`));

  await mongoose.disconnect();
}

main().catch(console.error);
