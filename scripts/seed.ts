import { configDotenv } from 'dotenv';
configDotenv({ path: 'server/.env' });

import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  console.warn('Unable to set custom DNS servers, using defaults.');
}

import mongoose, { Types } from 'mongoose';
import bcrypt from 'bcrypt';

// Import Models
import Tenant from '../server/src/models/tenant.model.js';
import Restaurant from '../server/src/models/restaurant.model.js';
import Outlet from '../server/src/models/outlet.model.js';
import User from '../server/src/models/user.model.js';
import DiningArea from '../server/src/models/diningarea.model.js';
import Table from '../server/src/models/table.model.js';
import Category from '../server/src/models/category.model.js';
import MenuItem from '../server/src/models/menuitems.model.js';
import Inventory from '../server/src/models/inventory.model.js';
import Customer from '../server/src/models/customer.model.js';
import Order from '../server/src/models/order.model.js';
import OrderItem from '../server/src/models/orderitems.model.js';
import ChannelOutletMapping from '../server/src/models/channeloutletmapping.model.js';
import ChannelMenuItemMapping from '../server/src/models/channelmenuitemmapping.model.js';
import ProviderSyncState from '../server/src/models/providersyncstate.model.js';
import IntegrationEventQueue from '../server/src/models/integration-event-queue.model.js';
import WebhookLog from '../server/src/models/webhooklog.model.js';

// Enums copies to avoid compile/path dependency errors
import { OrderStatus, PaymentStatus, OrderSource, UserRole } from '../server/src/enums/enums.js';

const TENANT_ID = new Types.ObjectId('661817666bb70afe757e2a90');
const RESTAURANT_ID = new Types.ObjectId('661817666bb70afe757e2a91');
const OUTLET_ID = new Types.ObjectId('661817666bb70afe757e2a92');
const OWNER_ID = new Types.ObjectId('661817666bb70afe757e2a93');
const STAFF_ID = new Types.ObjectId('661817666bb70afe757e2a94');

async function seed() {
  const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/FoodMesh-Test-New";
  console.log(`Connecting to database at ${MONGO_URI}...`);
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB!');

  console.log('Cleaning up existing collections...');
  await Promise.all([
    Tenant.deleteMany({}),
    Restaurant.deleteMany({}),
    Outlet.deleteMany({}),
    User.deleteMany({}),
    DiningArea.deleteMany({}),
    Table.deleteMany({}),
    Category.deleteMany({}),
    MenuItem.deleteMany({}),
    Inventory.deleteMany({}),
    Customer.deleteMany({}),
    Order.deleteMany({}),
    OrderItem.deleteMany({}),
    ChannelOutletMapping.deleteMany({}),
    ChannelMenuItemMapping.deleteMany({}),
    ProviderSyncState.deleteMany({}),
    IntegrationEventQueue.deleteMany({}),
    WebhookLog.deleteMany({})
  ]);
  console.log('Cleanup completed successfully!');

  // 1. Seed Tenant
  console.log('Seeding Tenant...');
  const tenant = await Tenant.create({
    _id: TENANT_ID,
    name: 'FoodMesh Core Tenant',
    slug: 'foodmesh-core',
    ownerId: OWNER_ID,
    subscriptionPlan: 'FREE',
    status: 'ACTIVE'
  });

  // 2. Seed Restaurant
  console.log('Seeding Restaurant...');
  const restaurant = await Restaurant.create({
    _id: RESTAURANT_ID,
    tenantId: TENANT_ID,
    name: 'Gourmet Kitchen',
    cuisine: ['Indian', 'Italian', 'Continental'],
    status: 'ACTIVE'
  });

  // 3. Seed Outlet
  console.log('Seeding Outlet...');
  const outlet = await Outlet.create({
    _id: OUTLET_ID,
    tenantId: TENANT_ID,
    restaurantId: RESTAURANT_ID,
    name: 'Downtown Flagship',
    code: 'GW-DT-01',
    address: '101, Park Street',
    city: 'Kolkata',
    state: 'West Bengal',
    pincode: '700016',
    contactNumber: '+919876543210',
    email: 'downtown@foodmesh.io',
    status: 'ACTIVE',
    isActive: true
  });

  // 4. Seed Users
  console.log('Seeding Users...');
  const hashedPassword = await bcrypt.hash('Password123', 10);

  const owner = await User.create({
    _id: OWNER_ID,
    tenantId: TENANT_ID,
    restaurantId: RESTAURANT_ID,
    firstName: 'John',
    lastName: 'Doe',
    email: 'owner@foodmesh.io',
    passwordHash: hashedPassword,
    role: UserRole.RESTAURANT_OWNER,
    status: 'ACTIVE'
  });

  const staff = await User.create({
    _id: STAFF_ID,
    tenantId: TENANT_ID,
    restaurantId: RESTAURANT_ID,
    outletId: OUTLET_ID,
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'staff@foodmesh.io',
    passwordHash: hashedPassword,
    role: UserRole.STAFF,
    status: 'ACTIVE'
  });

  // 5. Seed Dining Areas
  console.log('Seeding Dining Areas...');
  const mainHall = await DiningArea.create({
    tenantId: TENANT_ID,
    outletId: OUTLET_ID,
    name: 'Main Dining Hall',
    code: 'MAIN_HALL',
    isActive: true
  });

  const patio = await DiningArea.create({
    tenantId: TENANT_ID,
    outletId: OUTLET_ID,
    name: 'Garden Patio',
    code: 'PATIO',
    isActive: true
  });

  // 6. Seed Tables
  console.log('Seeding Tables...');
  const tables = [];

  // 10 Tables in Main Hall (Square & Round)
  for (let i = 1; i <= 10; i++) {
    const layout = {
      x: 50 + (i % 5) * 120,
      y: 80 + Math.floor((i - 1) / 5) * 120,
      width: 80,
      height: 80,
      rotation: 0,
      shape: i % 2 === 0 ? 'round' : 'square',
      zIndex: 10,
      labelPosition: 'CENTER'
    };
    const table = await Table.create({
      tenantId: TENANT_ID,
      outletId: OUTLET_ID,
      diningAreaId: mainHall._id,
      tableNumber: `T0${i}`,
      seatCount: i % 3 === 0 ? 6 : i % 2 === 0 ? 2 : 4,
      layout,
      operationalStatus: 'AVAILABLE',
      isActive: true
    });
    tables.push(table);
  }

  // 10 Tables in Patio
  for (let i = 11; i <= 20; i++) {
    const layout = {
      x: 50 + (i % 5) * 120,
      y: 80 + Math.floor((i - 11) / 5) * 120,
      width: i % 3 === 0 ? 120 : 80,
      height: 80,
      rotation: 0,
      shape: i % 3 === 0 ? 'rectangle' : 'square',
      zIndex: 10,
      labelPosition: 'CENTER'
    };
    const table = await Table.create({
      tenantId: TENANT_ID,
      outletId: OUTLET_ID,
      diningAreaId: patio._id,
      tableNumber: `T${i}`,
      seatCount: i % 3 === 0 ? 6 : 4,
      layout,
      operationalStatus: 'AVAILABLE',
      isActive: true
    });
    tables.push(table);
  }

  // 7. Seed Categories
  console.log('Seeding Categories...');
  const categories = [
    await Category.create({ tenantId: TENANT_ID, outletId: OUTLET_ID, name: 'Appetizers', code: 'APP', description: 'Starter dishes' }),
    await Category.create({ tenantId: TENANT_ID, outletId: OUTLET_ID, name: 'Mains', code: 'MAIN', description: 'Hearty main course dishes' }),
    await Category.create({ tenantId: TENANT_ID, outletId: OUTLET_ID, name: 'Desserts', code: 'DES', description: 'Sweet treats' }),
    await Category.create({ tenantId: TENANT_ID, outletId: OUTLET_ID, name: 'Beverages', code: 'BEV', description: 'Hot and cold beverages' })
  ];

  // 8. Seed Menu Items & Inventory
  console.log('Seeding Menu Items & Inventory...');
  const menuItemsData = [
    { name: 'Veg Spring Rolls', sku: 'APP-01', price: 180, category: categories[0] },
    { name: 'Crispy Chicken Wings', sku: 'APP-02', price: 260, category: categories[0] },
    { name: 'Margherita Pizza', sku: 'MAIN-01', price: 340, category: categories[1] },
    { name: 'Chicken Alfredo Pasta', sku: 'MAIN-02', price: 420, category: categories[1] },
    { name: 'Paneer Butter Masala', sku: 'MAIN-03', price: 380, category: categories[1] },
    { name: 'Choco Lava Cake', sku: 'DES-01', price: 160, category: categories[2] },
    { name: 'Fresh Mint Mojito', sku: 'BEV-01', price: 140, category: categories[3] },
    { name: 'Iced Cold Coffee', sku: 'BEV-02', price: 150, category: categories[3] }
  ];

  const menuItems = [];
  for (const item of menuItemsData) {
    const menuItem = await MenuItem.create({
      tenantId: TENANT_ID,
      outletId: OUTLET_ID,
      categoryId: item.category._id,
      name: item.name,
      sku: item.sku,
      description: `Delicious ${item.name} prepared fresh daily.`,
      price: item.price,
      status: 'AVAILABLE',
      isActive: true
    });
    menuItems.push(menuItem);

    // Seed inventory stock levels
    await Inventory.create({
      tenantId: TENANT_ID,
      outletId: OUTLET_ID,
      menuItemId: menuItem._id,
      quantity: 100,
      reorderLevel: 15,
      unit: 'pcs',
      lastRestockedAt: new Date()
    });
  }

  // Map items to Swiggy/Zomato channels so order simulations work
  console.log('Seeding channel mappings...');
  for (const item of menuItems) {
    await ChannelMenuItemMapping.create({
      tenantId: TENANT_ID,
      outletId: OUTLET_ID,
      provider: 'MOCK_SWIGGY',
      externalItemId: item.sku,
      menuItemId: item._id,
      isActive: true
    });
    await ChannelMenuItemMapping.create({
      tenantId: TENANT_ID,
      outletId: OUTLET_ID,
      provider: 'MOCK_ZOMATO',
      externalItemId: item.sku,
      menuItemId: item._id,
      isActive: true
    });
  }

  // 9. Seed Customers
  console.log('Seeding Customers...');
  const customerNames = [
    'Emma Watson', 'Liam Neeson', 'Robert Downey Jr.', 'Scarlett Johansson', 'Chris Evans',
    'Mark Ruffalo', 'Tom Hiddleston', 'Jeremy Renner', 'Elizabeth Olsen', 'Benedict Cumberbatch',
    'Tom Holland', 'Zendaya Coleman', 'Paul Rudd', 'Brie Larson', 'Chadwick Boseman',
    'Michael B. Jordan', 'Lupita Nyong\'o', 'Danai Gurira', 'Letitia Wright', 'Winston Duke'
  ];
  const customers = [];
  for (let i = 0; i < customerNames.length; i++) {
    const nameSplit = customerNames[i].split(' ');
    const customer = await Customer.create({
      tenantId: TENANT_ID,
      firstName: nameSplit[0],
      lastName: nameSplit[1] || '',
      email: `${nameSplit[0].toLowerCase()}@gmail.com`,
      phone: `+9198765${String(i).padStart(5, '0')}`,
      status: 'ACTIVE'
    });
    customers.push(customer);
  }

  // 10. Seed 110 Dine-In (Offline) & 110 Online Orders distributed over the last 30 days
  console.log('Seeding 220 total orders (110 online / 110 offline) spanning 30 days...');

  const orderStatuses = [
    OrderStatus.DELIVERED, OrderStatus.DELIVERED, OrderStatus.DELIVERED, // high probability
    OrderStatus.DELIVERED, OrderStatus.DELIVERED, OrderStatus.DELIVERED,
    OrderStatus.DELIVERED, OrderStatus.DELIVERED, OrderStatus.DELIVERED,
    OrderStatus.DELIVERED, OrderStatus.DELIVERED, OrderStatus.DELIVERED,
    OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.PENDING, OrderStatus.ACCEPTED,
    OrderStatus.CANCELLED
  ];

  const paymentStatuses = [
    PaymentStatus.SUCCESS, PaymentStatus.SUCCESS, PaymentStatus.SUCCESS,
    PaymentStatus.SUCCESS, PaymentStatus.SUCCESS, PaymentStatus.SUCCESS,
    PaymentStatus.PENDING, PaymentStatus.FAILED
  ];

  const onlineSources = [
    OrderSource.SWIGGY, OrderSource.ZOMATO, OrderSource.ONDC,
    OrderSource.WEBSITE, OrderSource.WHATSAPP
  ];

  const offlineSources = [
    OrderSource.DINE_IN, OrderSource.QR_DINE_IN, OrderSource.POS, OrderSource.WAITER
  ];

  // Helper to generate date in last 30 days
  function getRandomDate() {
    const now = new Date();
    const daysAgo = Math.floor(Math.random() * 30);
    const hoursAgo = Math.floor(Math.random() * 24);
    const minsAgo = Math.floor(Math.random() * 60);
    return new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000) - (hoursAgo * 60 * 60 * 1000) - (minsAgo * 60 * 1000));
  }

  // Generate Dine-In (Offline) Orders
  for (let i = 1; i <= 110; i++) {
    const date = getRandomDate();
    const customer = customers[Math.floor(Math.random() * customers.length)];
    const table = tables[Math.floor(Math.random() * tables.length)];
    const source = offlineSources[Math.floor(Math.random() * offlineSources.length)];
    const status = orderStatuses[Math.floor(Math.random() * orderStatuses.length)];
    const paymentStatus = status === OrderStatus.CANCELLED ? PaymentStatus.FAILED : paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)];

    // Pick 1-3 random menu items
    const selectedItemsCount = Math.floor(Math.random() * 3) + 1;
    const itemsList = [];
    let subtotal = 0;

    for (let k = 0; k < selectedItemsCount; k++) {
      const menuItem = menuItems[Math.floor(Math.random() * menuItems.length)];
      const qty = Math.floor(Math.random() * 2) + 1;
      itemsList.push({ menuItem, qty });
      subtotal += menuItem.price * qty;
    }

    const tax = Math.round(subtotal * 0.05);
    const totalAmount = subtotal + tax;

    const order = await Order.create({
      tenantId: TENANT_ID,
      outletId: OUTLET_ID,
      customerId: customer._id,
      orderNumber: `FM-OFF-${String(i).padStart(5, '0')}`,
      source,
      subtotal,
      tax,
      deliveryFee: 0,
      discount: 0,
      totalAmount,
      orderStatus: status,
      paymentStatus,
      diningContext: {
        tableId: table._id,
        tableNumber: table.tableNumber,
        seatNumber: 'Seat 1',
        sessionId: new Types.ObjectId()
      },
      createdAt: date,
      updatedAt: date
    });

    // Create Order Items
    for (const itemInfo of itemsList) {
      await OrderItem.create({
        tenantId: TENANT_ID,
        orderId: order._id,
        menuItemId: itemInfo.menuItem._id,
        name: itemInfo.menuItem.name,
        quantity: itemInfo.qty,
        unitPrice: itemInfo.menuItem.price,
        totalPrice: itemInfo.menuItem.price * itemInfo.qty,
        holdStatus: status === OrderStatus.PENDING ? 'HELD' : status === OrderStatus.ACCEPTED ? 'FIRE_REQUESTED' : 'FIRED',
        course: itemInfo.menuItem.sku.startsWith('DES') ? 'DESSERTS' : 'MAINS',
        kdsStation: itemInfo.menuItem.sku.startsWith('BEV') ? 'BAR' : 'HOT',
        firedAt: status === OrderStatus.PENDING ? null : date,
        createdAt: date
      });
    }
  }

  // Generate Online Orders
  for (let i = 1; i <= 110; i++) {
    const date = getRandomDate();
    const customer = customers[Math.floor(Math.random() * customers.length)];
    const source = onlineSources[Math.floor(Math.random() * onlineSources.length)];
    const status = orderStatuses[Math.floor(Math.random() * orderStatuses.length)];
    const paymentStatus = status === OrderStatus.CANCELLED ? PaymentStatus.FAILED : paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)];

    // Pick 1-3 random menu items
    const selectedItemsCount = Math.floor(Math.random() * 3) + 1;
    const itemsList = [];
    let subtotal = 0;

    for (let k = 0; k < selectedItemsCount; k++) {
      const menuItem = menuItems[Math.floor(Math.random() * menuItems.length)];
      const qty = Math.floor(Math.random() * 2) + 1;
      itemsList.push({ menuItem, qty });
      subtotal += menuItem.price * qty;
    }

    const tax = Math.round(subtotal * 0.05);
    const deliveryFee = 30;
    const totalAmount = subtotal + tax + deliveryFee;

    const order = await Order.create({
      tenantId: TENANT_ID,
      outletId: OUTLET_ID,
      customerId: customer._id,
      orderNumber: `FM-ON-${String(i).padStart(5, '0')}`,
      source,
      subtotal,
      tax,
      deliveryFee,
      discount: 0,
      totalAmount,
      orderStatus: status,
      paymentStatus,
      createdAt: date,
      updatedAt: date
    });

    // Create Order Items
    for (const itemInfo of itemsList) {
      await OrderItem.create({
        tenantId: TENANT_ID,
        orderId: order._id,
        menuItemId: itemInfo.menuItem._id,
        name: itemInfo.menuItem.name,
        quantity: itemInfo.qty,
        unitPrice: itemInfo.menuItem.price,
        totalPrice: itemInfo.menuItem.price * itemInfo.qty,
        holdStatus: status === OrderStatus.PENDING ? 'HELD' : status === OrderStatus.ACCEPTED ? 'FIRE_REQUESTED' : 'FIRED',
        course: itemInfo.menuItem.sku.startsWith('DES') ? 'DESSERTS' : 'MAINS',
        kdsStation: itemInfo.menuItem.sku.startsWith('BEV') ? 'BAR' : 'HOT',
        firedAt: status === OrderStatus.PENDING ? null : date,
        createdAt: date
      });
    }
  }

  // Seed Provider Sync State for active integration health checks
  console.log('Seeding provider sync states...');
  const providers = ['MOCK_SWIGGY', 'MOCK_ZOMATO', 'ONDC', 'MAGICPIN', 'WHATSAPP', 'WEBSITE', 'DUNZO', 'PORTER'];
  for (const prov of providers) {
    await ProviderSyncState.create({
      tenantId: TENANT_ID,
      outletId: OUTLET_ID,
      provider: prov,
      syncHealth: 'HEALTHY',
      consecutiveFailures: 0,
      failureCount: 0,
      lastSyncAt: new Date()
    });
  }

  console.log('----------------------------------------------------');
  console.log('🎉 DATABASE SEEDING COMPLETED SUCCESSFULLY!');
  console.log('----------------------------------------------------');
  console.log('Credentials to test every feature:');
  console.log('🔑 RESTAURANT OWNER:');
  console.log('   - Email:    owner@foodmesh.io');
  console.log('   - Password: Password123');
  console.log('🔑 OUTLET STAFF / MANAGER:');
  console.log('   - Email:    staff@foodmesh.io');
  console.log('   - Password: Password123');
  console.log('----------------------------------------------------');

  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Seeding crashed with error:', err);
  process.exit(1);
});
