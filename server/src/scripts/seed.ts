// @ts-nocheck
import { configDotenv } from 'dotenv';
configDotenv({ path: '.env' });

import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  console.warn('Unable to set custom DNS servers, using defaults.');
}

import mongoose, { Types } from 'mongoose';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

// Import Models
import Tenant from '../models/tenant.model.js';
import Restaurant from '../models/restaurant.model.js';
import Outlet from '../models/outlet.model.js';
import User from '../models/user.model.js';
import DiningArea from '../models/diningarea.model.js';
import Table from '../models/table.model.js';
import Category from '../models/category.model.js';
import MenuItem from "../models/menuItem.model.js";
import Inventory from '../models/inventory.model.js';
import Customer from '../models/customer.model.js';
import Order from '../models/order.model.js';
import OrderItem from "../models/orderItem.model.js";
import ChannelMenuItemMapping from '../models/channelmenuitemmapping.model.js';
import ProviderSyncState from '../models/providersyncstate.model.js';
import IntegrationEventQueue from '../models/integration-event-queue.model.js';
import WebhookLog from "../models/webhookLog.model.js";

import { OrderStatus, PaymentStatus, OrderSource, UserRole } from "../models/enums.js";

const TENANT_ID = new Types.ObjectId('661817666bb70afe757e2a90');
const RESTAURANT_ID = new Types.ObjectId('661817666bb70afe757e2a91');
const OWNER_ID = new Types.ObjectId('661817666bb70afe757e2a93');

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
    ChannelMenuItemMapping.deleteMany({}),
    ProviderSyncState.deleteMany({}),
    IntegrationEventQueue.deleteMany({}),
    WebhookLog.deleteMany({})
  ]);
  console.log('Cleanup completed successfully!');

  // 1. Seed Tenant
  console.log('Seeding Tenant...');
  await Tenant.create({
    _id: TENANT_ID,
    name: 'FoodMesh Core Tenant',
    slug: 'foodmesh-core',
    ownerId: OWNER_ID,
    subscriptionPlan: 'FREE',
    status: 'ACTIVE'
  });

  // 2. Seed Restaurant
  console.log('Seeding Restaurant...');
  await Restaurant.create({
    _id: RESTAURANT_ID,
    tenantId: TENANT_ID,
    name: 'Gourmet Kitchen',
    cuisine: ['Indian', 'Italian', 'Continental'],
    status: 'ACTIVE'
  });

  // 3. Seed 105 Outlets
  console.log('Seeding 105 Outlets (batched)...');
  const outletsData = [];
  for (let i = 1; i <= 105; i++) {
    outletsData.push({
      _id: new Types.ObjectId(),
      tenantId: TENANT_ID,
      restaurantId: RESTAURANT_ID,
      name: `Outlet ${i} Downtown`,
      code: `OUTLET-${String(i).padStart(3, '0')}`,
      slug: `outlet-${i}-downtown`,
      address: `${i} Park Street`,
      city: 'Kolkata',
      state: 'West Bengal',
      pincode: '700016',
      contactNumber: `+9198765${String(i).padStart(5, '0')}`,
      email: `outlet${i}@foodmesh.io`,
      status: 'ACTIVE',
      isActive: true
    });
  }
  const outlets = await Outlet.insertMany(outletsData);

  // 4. Seed Users (batched)
  console.log('Seeding 105 Users representing all 4 roles (batched)...');
  const hashedPassword = await bcrypt.hash('Password123', 10);
  const usersData = [];

  // Super Admins (5 users)
  for (let i = 1; i <= 5; i++) {
    usersData.push({
      tenantId: TENANT_ID,
      firstName: 'Super',
      lastName: `Admin ${i}`,
      email: `superadmin${i}@foodmesh.io`,
      passwordHash: hashedPassword,
      role: UserRole.SUPER_ADMIN,
      status: 'ACTIVE'
    });
  }

  // Restaurant Owner (1 user)
  usersData.push({
    _id: OWNER_ID,
    tenantId: TENANT_ID,
    restaurantId: RESTAURANT_ID,
    firstName: 'John',
    lastName: 'Owner',
    email: 'owner@foodmesh.io',
    passwordHash: hashedPassword,
    role: UserRole.RESTAURANT_OWNER,
    status: 'ACTIVE'
  });

  // Outlet Managers (105 users, exactly 1 per outlet)
  for (let i = 1; i <= 105; i++) {
    const outlet = outlets[i - 1];
    usersData.push({
      tenantId: TENANT_ID,
      restaurantId: RESTAURANT_ID,
      outletId: outlet._id,
      firstName: 'Manager',
      lastName: `User ${i}`,
      email: `manager${i}@foodmesh.io`,
      passwordHash: hashedPassword,
      role: UserRole.OUTLET_MANAGER,
      status: 'ACTIVE'
    });
  }

  // Staff members (60 users)
  for (let i = 1; i <= 60; i++) {
    const outlet = outlets[i % outlets.length];
    usersData.push({
      tenantId: TENANT_ID,
      restaurantId: RESTAURANT_ID,
      outletId: outlet._id,
      firstName: 'Staff',
      lastName: `User ${i}`,
      email: `staff${i}@foodmesh.io`,
      passwordHash: hashedPassword,
      role: UserRole.STAFF,
      status: 'ACTIVE'
    });
  }
  await User.insertMany(usersData);

  // 5. Seed 105 Dining Areas (batched)
  console.log('Seeding 105 Dining Areas (batched)...');
  const diningAreasData = [];
  for (let i = 1; i <= 105; i++) {
    const outlet = outlets[i % outlets.length];
    diningAreasData.push({
      _id: new Types.ObjectId(),
      tenantId: TENANT_ID,
      outletId: outlet._id,
      name: `Dining Area ${i}`,
      code: `DA-${String(i).padStart(3, '0')}`,
      isActive: true
    });
  }
  const diningAreas = await DiningArea.insertMany(diningAreasData);

  // 6. Seed 105 Tables (batched)
  console.log('Seeding 105 Tables (batched)...');
  const tablesData = [];
  for (let i = 1; i <= 105; i++) {
    const outlet = outlets[i % outlets.length];
    const da = diningAreas[i % diningAreas.length];
    tablesData.push({
      _id: new Types.ObjectId(),
      tenantId: TENANT_ID,
      outletId: outlet._id,
      diningAreaId: da._id,
      tableNumber: `T${String(i).padStart(3, '0')}`,
      seatCount: i % 2 === 0 ? 4 : 2,
      layout: {
        x: 50 + (i % 5) * 120,
        y: 80 + Math.floor((i - 1) / 5) * 120,
        width: 80,
        height: 80,
        rotation: 0,
        shape: 'square',
        zIndex: 10,
        labelPosition: 'CENTER'
      },
      operationalStatus: 'AVAILABLE',
      qrToken: crypto.randomBytes(16).toString('hex'),
      isActive: true
    });
  }
  const tables = await Table.insertMany(tablesData);

  // 7. Seed 105 Categories (batched)
  console.log('Seeding 105 Categories (batched)...');
  const categoriesData = [];
  for (let i = 1; i <= 105; i++) {
    const outlet = outlets[i % outlets.length];
    categoriesData.push({
      _id: new Types.ObjectId(),
      tenantId: TENANT_ID,
      outletId: outlet._id,
      name: `Category ${i}`,
      code: `CAT-${String(i).padStart(3, '0')}`,
      description: `Description for Category ${i}`
    });
  }
  const categories = await Category.insertMany(categoriesData);

  // 8. Seed 105 Menu Items, Inventory & Mappings (batched)
  console.log('Seeding 105 Menu Items & Inventory Stock (batched)...');
  const menuItemsData = [];
  const inventoryData = [];
  const channelMappingsData = [];

  for (let i = 1; i <= 105; i++) {
    const outlet = outlets[i % outlets.length];
    const category = categories[i % categories.length];
    const itemId = new Types.ObjectId();
    const sku = `SKU-${String(i).padStart(4, '0')}`;

    menuItemsData.push({
      _id: itemId,
      tenantId: TENANT_ID,
      outletId: outlet._id,
      categoryId: category._id,
      name: `Menu Item ${i}`,
      sku,
      description: `Delicious Menu Item ${i} description.`,
      price: 100 + (i * 5),
      status: 'AVAILABLE',
      isActive: true
    });

    inventoryData.push({
      tenantId: TENANT_ID,
      outletId: outlet._id,
      menuItemId: itemId,
      quantity: 150,
      reorderLevel: 20,
      unit: 'pcs',
      lastRestockedAt: new Date()
    });

    channelMappingsData.push({
      tenantId: TENANT_ID,
      outletId: outlet._id,
      provider: 'MOCK_SWIGGY',
      externalItemId: sku,
      menuItemId: itemId,
      isActive: true
    });
    channelMappingsData.push({
      tenantId: TENANT_ID,
      outletId: outlet._id,
      provider: 'MOCK_ZOMATO',
      externalItemId: sku,
      menuItemId: itemId,
      isActive: true
    });
  }

  const menuItems = await MenuItem.insertMany(menuItemsData);
  await Inventory.insertMany(inventoryData);
  await ChannelMenuItemMapping.insertMany(channelMappingsData);

  // 9. Seed 105 Customers (batched)
  console.log('Seeding 105 Customers (batched)...');
  const customersData = [];
  for (let i = 1; i <= 105; i++) {
    customersData.push({
      _id: new Types.ObjectId(),
      tenantId: TENANT_ID,
      firstName: `CustomerFirst${i}`,
      lastName: `CustomerLast${i}`,
      email: `customer${i}@gmail.com`,
      phone: `+9198765${String(i).padStart(5, '0')}`,
      status: 'ACTIVE'
    });
  }
  const customers = await Customer.insertMany(customersData);

  // 10. Seed 220 Total Orders (110 offline dine-in / 110 online delivery) (batched)
  console.log('Seeding 220 total orders spanning 30 days (batched)...');
  const orderStatuses = [OrderStatus.DELIVERED, OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.COMPLETED];
  const paymentStatuses = [PaymentStatus.SUCCESS, PaymentStatus.PENDING];
  const onlineSources = [OrderSource.SWIGGY, OrderSource.ZOMATO, OrderSource.WEBSITE];
  const offlineSources = [OrderSource.DINE_IN, OrderSource.QR_DINE_IN, OrderSource.WAITER];

  function getRandomDate() {
    const now = new Date();
    const daysAgo = Math.floor(Math.random() * 30);
    const hoursAgo = Math.floor(Math.random() * 24);
    return new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000) - (hoursAgo * 60 * 60 * 1000));
  }

  const ordersData = [];
  const orderItemsData = [];

  // Generate Dine-In (Offline) Orders
  for (let i = 1; i <= 110; i++) {
    const date = getRandomDate();
    const customer = customers[i % customers.length];
    const table = tables[i % tables.length];
    const outlet = outlets[i % outlets.length];
    const source = offlineSources[i % offlineSources.length];
    const status = orderStatuses[i % orderStatuses.length];
    const paymentStatus = paymentStatuses[i % paymentStatuses.length];

    const menuItem = menuItems[i % menuItems.length];
    const subtotal = menuItem.price;
    const tax = Math.round(subtotal * 0.05);
    const totalAmount = subtotal + tax;
    const orderId = new Types.ObjectId();

    ordersData.push({
      _id: orderId,
      tenantId: TENANT_ID,
      outletId: outlet._id,
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

    orderItemsData.push({
      tenantId: TENANT_ID,
      orderId,
      menuItemId: menuItem._id,
      name: menuItem.name,
      quantity: 1,
      unitPrice: menuItem.price,
      totalPrice: menuItem.price,
      holdStatus: 'FIRED',
      course: 'MAINS',
      kdsStation: 'HOT',
      firedAt: date,
      createdAt: date
    });
  }

  // Generate Online Orders
  for (let i = 1; i <= 110; i++) {
    const date = getRandomDate();
    const customer = customers[i % customers.length];
    const outlet = outlets[i % outlets.length];
    const source = onlineSources[i % onlineSources.length];
    const status = orderStatuses[i % orderStatuses.length];
    const paymentStatus = paymentStatuses[i % paymentStatuses.length];

    const menuItem = menuItems[i % menuItems.length];
    const subtotal = menuItem.price;
    const tax = Math.round(subtotal * 0.05);
    const deliveryFee = 30;
    const totalAmount = subtotal + tax + deliveryFee;
    const orderId = new Types.ObjectId();

    ordersData.push({
      _id: orderId,
      tenantId: TENANT_ID,
      outletId: outlet._id,
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

    orderItemsData.push({
      tenantId: TENANT_ID,
      orderId,
      menuItemId: menuItem._id,
      name: menuItem.name,
      quantity: 1,
      unitPrice: menuItem.price,
      totalPrice: menuItem.price,
      holdStatus: 'FIRED',
      course: 'MAINS',
      kdsStation: 'HOT',
      firedAt: date,
      createdAt: date
    });
  }

  await Order.insertMany(ordersData);
  await OrderItem.insertMany(orderItemsData);

  // Seed Provider Sync States
  console.log('Seeding provider sync states (batched)...');
  const syncStatesData = [];
  const providers = ['MOCK_SWIGGY', 'MOCK_ZOMATO', 'ONDC', 'WEBSITE', 'WHATSAPP'];
  for (const prov of providers) {
    syncStatesData.push({
      tenantId: TENANT_ID,
      outletId: outlets[0]._id,
      provider: prov,
      syncHealth: 'HEALTHY',
      consecutiveFailures: 0,
      failureCount: 0,
      lastSyncAt: new Date()
    });
  }
  await ProviderSyncState.insertMany(syncStatesData);

  console.log('----------------------------------------------------');
  console.log('🎉 DATABASE SEEDING COMPLETED SUCCESSFULLY!');
  console.log('----------------------------------------------------');
  console.log('Credentials to test every feature:');
  console.log('🔑 RESTAURANT OWNER:');
  console.log('   - Email:    owner@foodmesh.io');
  console.log('   - Password: Password123');
  console.log('----------------------------------------------------');

  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Seeding crashed with error:', err);
  process.exit(1);
});
