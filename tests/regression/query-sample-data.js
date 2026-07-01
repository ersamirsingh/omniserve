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
  console.log('Connecting to database...');
  await mongoose.connect(MONGO_URI);
  console.log('Connected!');

  // Define minimal schemas to avoid import errors
  const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
    email: String,
    firstName: String,
    lastName: String,
    role: String,
    isDeleted: { type: Boolean, default: false }
  }), 'users');

  const Customer = mongoose.models.Customer || mongoose.model('Customer', new mongoose.Schema({
    firstName: String,
    lastName: String,
    tenantId: mongoose.Schema.Types.ObjectId,
    isDeleted: { type: Boolean, default: false }
  }), 'customers');

  const Outlet = mongoose.models.Outlet || mongoose.model('Outlet', new mongoose.Schema({
    name: String,
    tenantId: mongoose.Schema.Types.ObjectId,
    isDeleted: { type: Boolean, default: false }
  }), 'outlets');

  const MenuItem = mongoose.models.MenuItem || mongoose.model('MenuItem', new mongoose.Schema({
    name: String,
    price: Number,
    tenantId: mongoose.Schema.Types.ObjectId,
    outletId: mongoose.Schema.Types.ObjectId,
    isDeleted: { type: Boolean, default: false }
  }), 'menuitems');

  const Tenant = mongoose.models.Tenant || mongoose.model('Tenant', new mongoose.Schema({
    name: String
  }), 'tenants');

  // Query one tenant-wide dataset
  const activeUser = await User.findOne({ isDeleted: false, role: 'SUPER_ADMIN' });
  if (!activeUser) {
    console.log('No super admin user found!');
    await mongoose.disconnect();
    return;
  }
  console.log('Found Active User:', activeUser.email);

  const outlet = await Outlet.findOne({ isDeleted: false });
  if (!outlet) {
    console.log('No outlet found!');
    await mongoose.disconnect();
    return;
  }
  console.log('Found Outlet:', outlet.name, 'ID:', outlet._id.toString());

  const customer = await Customer.findOne({ tenantId: outlet.tenantId, isDeleted: false });
  if (!customer) {
    console.log('No customer found under the same tenant!');
    // Let's print any customer
    const anyCustomer = await Customer.findOne({ isDeleted: false });
    if (anyCustomer) {
      console.log('Found Any Customer:', anyCustomer.firstName, 'ID:', anyCustomer._id.toString());
    } else {
      console.log('No customer in DB!');
    }
    await mongoose.disconnect();
    return;
  }
  console.log('Found Customer:', customer.firstName, customer.lastName, 'ID:', customer._id.toString());

  const menuItem = await MenuItem.findOne({ outletId: outlet._id, isDeleted: false });
  if (!menuItem) {
    console.log('No MenuItem found for this outlet!');
    const anyItem = await MenuItem.findOne({ isDeleted: false });
    if (anyItem) {
      console.log('Found Any MenuItem in DB:', anyItem.name, 'ID:', anyItem._id.toString(), 'Outlet ID:', anyItem.outletId?.toString());
    }
    await mongoose.disconnect();
    return;
  }
  console.log('Found MenuItem:', menuItem.name, 'Price:', menuItem.price, 'ID:', menuItem._id.toString());

  console.log('\n--- SAMPLE PAYLOAD FOR POSTMAN ---');
  console.log(JSON.stringify({
    outletId: outlet._id.toString(),
    customerId: customer._id.toString(),
    source: "DINE_IN",
    subtotal: menuItem.price,
    tax: 0,
    deliveryFee: 0,
    discount: 0,
    totalAmount: menuItem.price,
    notes: "Postman test order",
    items: [
      {
        menuItemId: menuItem._id.toString(),
        name: menuItem.name,
        quantity: 1,
        unitPrice: menuItem.price
      }
    ]
  }, null, 2));

  await mongoose.disconnect();
}

main().catch(console.error);
