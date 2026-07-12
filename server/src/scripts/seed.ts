import 'dotenv/config';

import dns from 'dns';
try {
  // Force public DNS resolvers to handle local ISP/DNS SRV query issues for MongoDB Atlas
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  console.warn('Unable to set custom DNS servers, using system defaults:', e);
}

import mongoose, { Types } from 'mongoose';
import bcrypt from 'bcrypt';
import connectToMongoDB from '../config/db.js';

// Import Models
import User from '../models/user.model.js';
import Tenant from '../models/tenant.model.js';
import Restaurant from '../models/restaurant.model.js';
import Outlet from '../models/outlet.model.js';
import Category from '../models/category.model.js';
import MenuItem from '../models/menuItem.model.js';
import Customer from '../models/customer.model.js';
import Order from '../models/order.model.js';
import OrderItem from '../models/orderItem.model.js';
import SubscriptionPlanModel from '../models/subscriptionPlan.model.js';
import RestaurantSubscriptionModel from '../models/subscription.model.js';

// Import Enums
import {
  UserRole,
  UserStatus,
  OrderStatus,
  PaymentStatus,
  OrderSource,
  WeekDay,
  SubscriptionPlan
} from '../models/enums.js';

import {
  SubscriptionStatus as SaaSStatus,
  BillingCycle,
  PaymentProvider
} from '../modules/subscription/subscription.enum.js';

const PASSWORD_PLAIN = 'TestPass@123';

const runSeed = async () => {
  try {
    console.log('Connecting to database...');
    await connectToMongoDB();
    console.log('Connected.');

    console.log('Clearing existing data from relevant collections...');
    await Promise.all([
      User.deleteMany({}),
      Tenant.deleteMany({}),
      Restaurant.deleteMany({}),
      Outlet.deleteMany({}),
      Category.deleteMany({}),
      MenuItem.deleteMany({}),
      Customer.deleteMany({}),
      Order.deleteMany({}),
      OrderItem.deleteMany({}),
      SubscriptionPlanModel.deleteMany({}),
      RestaurantSubscriptionModel.deleteMany({}),
    ]);
    console.log('Collections cleared.');

    console.log('Generating password hash...');
    const passwordHash = await bcrypt.hash(PASSWORD_PLAIN, 10);
    console.log('Password hash generated.');

    // 1. Seed Subscription Plan
    console.log('Seeding Subscription Plan...');
    const superPlan = await SubscriptionPlanModel.create({
      name: 'Super Plan',
      slug: 'super',
      description: 'Enterprise features with high limits for large-scale operations',
      monthlyPrice: 9999,
      yearlyPrice: 99999,
      currency: 'INR',
      trialDays: 14,
      features: {
        inventory: true,
        crm: true,
        analytics: true,
        finance: true,
        kitchenDisplay: true,
        waiterApp: true,
        qrOrdering: true,
        reports: true,
        apiAccess: true,
        whiteLabel: true,
      },
      limits: {
        outlets: 100,
        employees: 1000,
        monthlyOrders: 100000,
        menuItems: 10000,
        storageGB: 100,
      },
      isActive: true,
    });
    console.log(`Subscription Plan seeded: ${superPlan.name} (${superPlan._id})`);

    // 2. Seed System Admin
    console.log('Seeding System Admin...');
    const systemAdmin = await User.create({
      firstName: 'System',
      lastName: 'Admin',
      email: 'systemadmin@test.com',
      passwordHash,
      role: UserRole.SYSTEM_ADMIN,
      status: UserStatus.ACTIVE,
      invitationAccepted: true,
    });
    console.log(`System Admin seeded: ${systemAdmin.email}`);

    // 3. Seed Tenant
    console.log('Seeding Tenant...');
    const tenantOwnerId = new Types.ObjectId();
    const tenant = await Tenant.create({
      name: 'Test Tenant',
      slug: 'test-tenant',
      ownerId: tenantOwnerId,
      subscriptionPlan: SubscriptionPlan.SUPER,
      status: UserStatus.ACTIVE,
      createdBy: systemAdmin._id,
    });
    console.log(`Tenant seeded: ${tenant.name} (${tenant._id})`);

    // 4. Seed Super Admin (Tenant Owner)
    console.log('Seeding Tenant Super Admin...');
    const superAdmin = await User.create({
      _id: tenantOwnerId,
      tenantId: tenant._id,
      firstName: 'Tenant',
      lastName: 'Admin',
      email: 'tenantadmin@test.com',
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      invitationAccepted: true,
      createdBy: systemAdmin._id,
    });
    console.log(`Super Admin seeded: ${superAdmin.email}`);

    // 5. Seed Customer Pool for Tenant (20 customers)
    console.log('Seeding Customer Pool...');
    const customerPromises = Array.from({ length: 20 }).map((_, i) => {
      const idx = i + 1;
      return Customer.create({
        tenantId: tenant._id,
        firstName: `Customer`,
        lastName: `${idx}`,
        email: `customer${idx}@test.com`,
        phone: `+9199999${10000 + idx}`,
        address: [
          {
            label: 'Home',
            line1: `${idx * 10} Main St`,
            city: 'Delhi',
            state: 'Delhi',
            pincode: '110001',
            location: {
              type: 'Point',
              coordinates: [77.2090 + (idx * 0.001), 28.6139 + (idx * 0.001)],
            },
            isDefault: true,
          },
        ],
        totalOrders: 0,
        totalSpent: 0,
        createdBy: superAdmin._id,
      });
    });
    const customers = await Promise.all(customerPromises);
    console.log(`${customers.length} Customers seeded.`);

    // Helper data for generating menu items and categories
    const mockCategories = ['Starters', 'Mains', 'Desserts', 'Drinks'];
    const mockItemsByCategory: Record<string, Array<{ name: string; price: number; isVeg: boolean }>> = {
      'Starters': [
        { name: 'Paneer Tikka', price: 250, isVeg: true },
        { name: 'Chicken Seekh Kebab', price: 320, isVeg: false },
        { name: 'Spring Rolls', price: 180, isVeg: true },
        { name: 'Crispy Corn', price: 160, isVeg: true },
      ],
      'Mains': [
        { name: 'Dal Makhani', price: 280, isVeg: true },
        { name: 'Butter Chicken', price: 380, isVeg: false },
        { name: 'Kadahi Paneer', price: 300, isVeg: true },
        { name: 'Veg Biryani', price: 260, isVeg: true },
        { name: 'Chicken Biryani', price: 340, isVeg: false },
      ],
      'Desserts': [
        { name: 'Gulab Jamun', price: 90, isVeg: true },
        { name: 'Brownie with Ice Cream', price: 180, isVeg: true },
        { name: 'Kulfi', price: 80, isVeg: true },
      ],
      'Drinks': [
        { name: 'Masala Cola', price: 70, isVeg: true },
        { name: 'Fresh Lime Soda', price: 90, isVeg: true },
        { name: 'Iced Tea', price: 110, isVeg: true },
      ]
    };

    // Keep track of statistics
    let totalOutletsSeeded = 0;
    let totalStaffSeeded = 0;
    let totalOrdersSeeded = 0;

    // 6. Seed 10 Restaurants
    console.log('Seeding 10 Restaurants...');
    for (let r = 1; r <= 10; r++) {
      const restroName = r === 1 ? 'Test Restaurant 1' : `Restaurant ${r}`;
      const restaurant = await Restaurant.create({
        tenantId: tenant._id,
        name: restroName,
        brandName: `${restroName} Brand`,
        status: UserStatus.ACTIVE,
        createdBy: superAdmin._id,
      });

      // Seed Restaurant Owner
      const ownerEmail = r === 1 ? 'restroowner@test.com' : `restroowner${r}@test.com`;
      const restroOwner = await User.create({
        tenantId: tenant._id,
        restaurantId: restaurant._id,
        firstName: 'Restro',
        lastName: `Owner ${r}`,
        email: ownerEmail,
        passwordHash,
        role: UserRole.RESTAURANT_OWNER,
        status: UserStatus.ACTIVE,
        invitationAccepted: true,
        createdBy: superAdmin._id,
      });

      // Seed Restaurant Subscription
      await RestaurantSubscriptionModel.create({
        tenantId: tenant._id,
        restaurantId: restaurant._id,
        planId: superPlan._id,
        plan: SubscriptionPlan.SUPER,
        amount: 9999,
        status: SaaSStatus.ACTIVE,
        billingCycle: BillingCycle.MONTHLY,
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        cancelAtPeriodEnd: false,
        renewalEnabled: true,
        paymentProvider: PaymentProvider.MANUAL,
        createdBy: superAdmin._id,
      });

      // Determine outlets count (5 to 10)
      const outletCount = r === 1 ? 6 : Math.floor(Math.random() * 6) + 5; // 5 to 10

      console.log(`Seeding ${outletCount} Outlets for ${restroName}...`);
      for (let o = 1; o <= outletCount; o++) {
        const outletName = (r === 1 && o === 1) ? 'Test Outlet 1' : `Outlet R${r} O${o}`;
        const outlet = await Outlet.create({
          tenantId: tenant._id,
          restaurantId: restaurant._id,
          name: outletName,
          address: `Block ${o}, Sector ${r}, Connaught Place`,
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110001',
          location: {
            type: 'Point',
            coordinates: [77.2190 + (r * 0.005) + (o * 0.001), 28.6239 + (r * 0.005) + (o * 0.001)],
          },
          operatingHours: Object.values(WeekDay).map((day) => ({
            day,
            openTime: '09:00',
            closeTime: '23:00',
            isClosed: false,
          })),
          status: UserStatus.ACTIVE,
          createdBy: restroOwner._id,
        });
        totalOutletsSeeded++;

        // Seed Outlet Manager
        const managerEmail = (r === 1 && o === 1) ? 'outletmanager@test.com' : `manager_r${r}_o${o}@test.com`;
        const outletManager = await User.create({
          tenantId: tenant._id,
          restaurantId: restaurant._id,
          outletId: outlet._id,
          outletIds: [outlet._id],
          firstName: 'Outlet',
          lastName: `Manager R${r} O${o}`,
          email: managerEmail,
          passwordHash,
          role: UserRole.OUTLET_MANAGER,
          status: UserStatus.ACTIVE,
          invitationAccepted: true,
          createdBy: restroOwner._id,
        });

        // Seed Staff (5 to 10 per outlet)
        const staffCount = (r === 1 && o === 1) ? 6 : Math.floor(Math.random() * 6) + 5; // 5 to 10
        const staffIds: Types.ObjectId[] = [];

        for (let s = 1; s <= staffCount; s++) {
          const staffEmail = (r === 1 && o === 1 && s === 1) ? 'staffmember@test.com' : `staff_r${r}_o${o}_s${s}@test.com`;
          const staffUser = await User.create({
            tenantId: tenant._id,
            restaurantId: restaurant._id,
            outletId: outlet._id,
            outletIds: [outlet._id],
            firstName: 'Staff',
            lastName: `R${r} O${o} S${s}`,
            email: staffEmail,
            passwordHash,
            role: UserRole.STAFF,
            status: UserStatus.ACTIVE,
            invitationAccepted: true,
            createdBy: outletManager._id,
          });
          staffIds.push(staffUser._id);
          totalStaffSeeded++;
        }

        // Seed Categories & Menu Items for this Outlet
        const menuItemsCreated: Array<{ id: Types.ObjectId; name: string; price: number }> = [];

        for (const catName of mockCategories) {
          const category = await Category.create({
            tenantId: tenant._id,
            outletId: outlet._id,
            name: catName,
            displayOrder: mockCategories.indexOf(catName),
            isActive: true,
            createdBy: outletManager._id,
          });

          const itemTemplates = mockItemsByCategory[catName] || [];
          for (const itemTpl of itemTemplates) {
            const menuItem = await MenuItem.create({
              tenantId: tenant._id,
              outletId: outlet._id,
              categoryId: category._id,
              name: itemTpl.name,
              description: `Delicious ${itemTpl.name} freshly prepared.`,
              price: itemTpl.price,
              isVeg: itemTpl.isVeg,
              isAvailable: true,
              displayOrder: itemTemplates.indexOf(itemTpl),
              createdBy: outletManager._id,
            });
            menuItemsCreated.push({
              id: menuItem._id as Types.ObjectId,
              name: menuItem.name,
              price: menuItem.price,
            });
          }
        }

        // Seed Orders for this Outlet (10 to 20 orders)
        const orderCount = Math.floor(Math.random() * 11) + 10; // 10 to 20
        const orderSources = Object.values(OrderSource).filter(s => s !== OrderSource.POS); // Skip deprecated POS
        
        for (let ord = 1; ord <= orderCount; ord++) {
          const randomCustomer = customers[Math.floor(Math.random() * customers.length)]!;
          const randomSource = orderSources[Math.floor(Math.random() * orderSources.length)]!;
          
          let randomStatus: OrderStatus = OrderStatus.COMPLETED;
          const statusRand = Math.random();
          if (statusRand < 0.1) {
            randomStatus = OrderStatus.PENDING;
          } else if (statusRand < 0.25) {
            randomStatus = OrderStatus.PREPARING;
          } else if (statusRand < 0.35) {
            randomStatus = OrderStatus.READY;
          } else if (statusRand < 0.45) {
            randomStatus = OrderStatus.CANCELLED;
          } else if (statusRand < 0.70) {
            randomStatus = OrderStatus.DELIVERED;
          }

          let randomPaymentStatus = PaymentStatus.SUCCESS;
          if (randomStatus === OrderStatus.PENDING) {
            randomPaymentStatus = PaymentStatus.PENDING;
          } else if (randomStatus === OrderStatus.CANCELLED && Math.random() < 0.5) {
            randomPaymentStatus = PaymentStatus.FAILED;
          }

          // Pick 1 to 3 items
          const itemsCount = Math.floor(Math.random() * 3) + 1;
          const selectedItems: typeof menuItemsCreated = [];
          for (let i = 0; i < itemsCount; i++) {
            const randItem = menuItemsCreated[Math.floor(Math.random() * menuItemsCreated.length)];
            if (randItem && !selectedItems.some(item => item.id.equals(randItem.id))) {
              selectedItems.push(randItem);
            }
          }

          if (selectedItems.length === 0 && menuItemsCreated.length > 0) {
            selectedItems.push(menuItemsCreated[0]!);
          }

          // Calculate pricing
          let subtotal = 0;
          const orderItemsData: any[] = [];
          const orderId = new Types.ObjectId();

          for (const item of selectedItems) {
            const qty = Math.floor(Math.random() * 2) + 1; // 1 or 2
            const totalPrice = qty * item.price;
            subtotal += totalPrice;

            orderItemsData.push({
              orderId,
              tenantId: tenant._id,
              menuItemId: item.id,
              name: item.name,
              quantity: qty,
              unitPrice: item.price,
              totalPrice,
              course: 'IMMEDIATE',
              holdStatus: 'FIRED',
              createdBy: randomCustomer._id,
            });
          }

          const tax = Math.round(subtotal * 0.05 * 100) / 100;
          const deliveryFee = (randomSource === OrderSource.DELIVERY || randomSource === OrderSource.SWIGGY || randomSource === OrderSource.ZOMATO) ? 40 : 0;
          const discount = Math.random() < 0.3 ? 50 : 0;
          const totalAmount = Math.max(0, subtotal + tax + deliveryFee - discount);

          // Spread orders over last 30 days
          const daysAgo = Math.floor(Math.random() * 30);
          const orderDate = new Date();
          orderDate.setDate(orderDate.getDate() - daysAgo);
          orderDate.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

          await OrderItem.insertMany(orderItemsData);

          await Order.create({
            _id: orderId,
            tenantId: tenant._id,
            outletId: outlet._id,
            customerId: randomCustomer._id,
            source: randomSource,
            subtotal,
            tax,
            deliveryFee,
            discount,
            totalAmount,
            orderStatus: randomStatus,
            paymentStatus: randomPaymentStatus,
            createdAt: orderDate,
            updatedAt: orderDate,
            createdBy: randomCustomer._id,
            waiterId: (randomStatus as string) === OrderStatus.SERVED || (randomStatus as string) === OrderStatus.COMPLETED ? staffIds[Math.floor(Math.random() * staffIds.length)] : null,
          });

          await Customer.updateOne(
            { _id: randomCustomer._id },
            {
              $inc: {
                totalOrders: 1,
                totalSpent: totalAmount
              }
            }
          );

          totalOrdersSeeded++;
        }
      }
    }

    console.log('\n--- Seeding Complete Summary ---');
    console.log(`System Admin: systemadmin@test.com / ${PASSWORD_PLAIN}`);
    console.log(`Tenant: test-tenant`);
    console.log(`Super Admin (Tenant Owner): tenantadmin@test.com / ${PASSWORD_PLAIN}`);
    console.log(`Restaurants Seeded: 10`);
    console.log(`Active Subscriptions Seeded: 10 (linked to "Super Plan")`);
    console.log(`Outlets Seeded: ${totalOutletsSeeded}`);
    console.log(`Outlet Managers Seeded: ${totalOutletsSeeded}`);
    console.log(`Staff Members Seeded: ${totalStaffSeeded}`);
    console.log(`Customers Seeded: 20`);
    console.log(`Orders & OrderItems Seeded: ${totalOrdersSeeded}`);
    console.log('--------------------------------\n');

    console.log('Seeding script completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

runSeed();
