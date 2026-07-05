import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { test } from 'node:test';
import dotenv from 'dotenv';
dotenv.config();

import app from '../../../server/src/app.js';
import Table from '../../../server/src/models/table.model.js';
import Tenant from '../../../server/src/models/tenant.model.js';
import Outlet from '../../../server/src/models/outlet.model.js';
import DiningArea from '../../../server/src/models/diningarea.model.js';
import User from '../../../server/src/models/user.model.js';
import Reservation from '../../../server/src/models/reservation.model.js';
import { Order } from '../../../server/src/models/order.model.js';

process.env.NODE_ENV = 'test';
const PORT = 5007;

test('Scenario C: Online Isolation Lifecycle', async () => {
  const server = app.listen(PORT, async () => {
    try {
      await mongoose.connect('mongodb://localhost:27017/foodmesh_test_scenario_c');
      await mongoose.connection.db.dropDatabase();

      const originalStartSession = mongoose.startSession.bind(mongoose);
      mongoose.startSession = async () => {
        const session = await originalStartSession();
        session.startTransaction = () => {};
        session.commitTransaction = async () => {};
        session.abortTransaction = async () => {};
        return session;
      };

      // Setup
      const tenant = await Tenant.create({ 
        name: 'Test Tenant', domain: 'test.com', type: 'RESTAURANT', status: 'ACTIVE',
        slug: 'test-tenant', ownerId: new mongoose.Types.ObjectId()
      });
      const restaurant = await mongoose.model('Restaurant').create({
        tenantId: tenant._id, name: 'Test Restaurant', slug: 'test-restaurant',
        status: 'ACTIVE', ownerId: tenant.ownerId, currency: 'USD'
      });
      const outlet = await Outlet.create({ 
        tenantId: tenant._id, restaurantId: restaurant._id, name: 'Test Outlet', 
        address: '123 Test St', city: 'Test City', state: 'Test State', pincode: '123456', isDeleted: false 
      });
      const area = await DiningArea.create({ tenantId: tenant._id, outletId: outlet._id, name: 'Main', type: 'INDOOR', capacity: 20 });
      
      const table = await Table.create({
        tenantId: tenant._id, outletId: outlet._id, diningAreaId: area._id,
        tableNumber: 'T1', capacity: 4, seatCount: 4, operationalStatus: 'AVAILABLE',
        qrToken: 'initial_token_123', isDeleted: false
      });
      
      const Category = mongoose.model('Category');
      const category = await Category.create({
        tenantId: tenant._id, outletId: outlet._id, name: 'Mains',
        slug: 'mains', status: 'ACTIVE', displayOrder: 1, isDeleted: false
      });
      
      const MenuItem = mongoose.model('MenuItem');
      const menuItem = await MenuItem.create({
        tenantId: tenant._id, outletId: outlet._id, categoryId: category._id,
        name: 'Burger', slug: 'burger', description: 'A tasty burger',
        price: 10, type: 'VEG', status: 'ACTIVE', isDeleted: false
      });
      
      const user = await User.create({
        tenantId: tenant._id, email: 'host@example.com', firstName: 'Host', lastName: 'User',
        passwordHash: '123', role: 'OUTLET_MANAGER', isDeleted: false
      });
      
      const token = jwt.sign(
        { userId: user._id.toString(), tenantId: tenant._id.toString(), role: user.role, outletId: outlet._id.toString() },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '1d' }
      );

      console.log('  [1] Staff opens a Walk-In session (via ad-hoc Reservation)...');
      const resCreate = await fetch(`http://localhost:${PORT}/api/reservations?tenantId=${tenant._id}&outletId=${outlet._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          outletId: outlet._id.toString(),
          guestName: 'Walk-In Guest',
          partySize: 3,
          scheduledAt: new Date().toISOString()
        })
      });
      const walkInData = await resCreate.json();
      if (resCreate.status !== 201) throw new Error('Failed to create walk-in session: ' + JSON.stringify(walkInData));
      
      const reservationId = walkInData.data.reservationId;
      
      // Confirm and Seat
      await fetch(`http://localhost:${PORT}/api/reservations/${reservationId}/confirm?tenantId=${tenant._id}&outletId=${outlet._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
      });
      
      await fetch(`http://localhost:${PORT}/api/reservations/${reservationId}/seat?tenantId=${tenant._id}&outletId=${outlet._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ tableId: table._id.toString() })
      });
      
      console.log('  ✓ PASS: Walk-In Session created and seated.');

      // Wait a bit for event propagation
      await new Promise(resolve => setTimeout(resolve, 500));

      const updatedTable = await Table.findById(table._id);
      if (updatedTable.operationalStatus !== 'OCCUPIED') throw new Error('Table not marked as OCCUPIED');
      console.log('  ✓ PASS: Table is OCCUPIED with active session.');

      // Setup Mappings
      const ChannelOutletMapping = mongoose.model('ChannelOutletMapping');
      await ChannelOutletMapping.create({
        tenantId: tenant._id,
        outletId: outlet._id,
        provider: 'MOCK_SWIGGY',
        externalOutletId: outlet._id.toString()
      });

      const ChannelMenuItemMapping = mongoose.model('ChannelMenuItemMapping');
      await ChannelMenuItemMapping.create({
        tenantId: tenant._id,
        outletId: outlet._id,
        provider: 'MOCK_SWIGGY',
        menuItemId: menuItem._id,
        externalItemId: menuItem._id.toString()
      });

      console.log('  [2] Swiggy places online delivery order...');
      const onlineOrderPayload = {
        order_id: 'SWIGGY-12345',
        outlet_id: outlet._id.toString(),
        customer: { name: 'Online Guest', phone: '9998887776' },
        fulfillment: { type: 'DELIVERY' },
        payment: { mode: 'ONLINE', status: 'PAID' },
        pricing: { subtotal: 10, total_amount: 10 },
        items: [
          {
            item_id: menuItem._id.toString(), // Pretend mapping resolved it to this for ease
            name: 'Burger',
            quantity: 1,
            price: 10
          }
        ]
      };
      
      const swiggyRes = await fetch(`http://localhost:${PORT}/api/integrations/mock/swiggy/orders?tenantId=${tenant._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(onlineOrderPayload)
      });
      
      if (swiggyRes.status !== 200 && swiggyRes.status !== 201) {
          const bd = await swiggyRes.json();
          throw new Error('Failed to ingest Swiggy order: ' + JSON.stringify(bd));
      }
      console.log('  ✓ PASS: Online order ingested via webhook.');

      console.log('  [3] Verify Table state is untouched...');
      const finalTable = await Table.findById(table._id);
      if (finalTable.operationalStatus !== 'OCCUPIED') {
          throw new Error('Online order altered table state to ' + finalTable.operationalStatus);
      }
      if (finalTable.activeSessionId?.toString() !== updatedTable.activeSessionId?.toString()) {
          throw new Error('Online order altered active session!');
      }
      console.log('  ✓ PASS: Table and Session remain isolated from Online Orders.');

      console.log('  [4] Closing table...');
      const closeRes = await fetch(`http://localhost:${PORT}/api/dining/operations?tenantId=${tenant._id}&outletId=${outlet._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          operationType: 'CLOSE_SESSION',
          payload: { tableId: table._id.toString(), sessionId: updatedTable.activeSessionId.toString() },
          sourceSystem: 'POS'
        })
      });
      
      if (closeRes.status !== 200) throw new Error('Failed to close session');

      console.log('  ✓ PASS: Scenario C Complete.');

      mongoose.connection.close();
      server.close();
      process.exit(0);
    } catch (err) {
      console.error(err);
      mongoose.connection.close();
      server.close();
      process.exit(1);
    }
  });
});
