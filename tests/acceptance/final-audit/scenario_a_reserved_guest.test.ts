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

test('Scenario A: Reserved Guest Lifecycle', async () => {
  const server = app.listen(PORT, async () => {
    try {
      await mongoose.connect('mongodb://localhost:27017/foodmesh_test_scenario_a');
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

      console.log('  [1] Creating CONFIRMED reservation...');
      const resCreate = await fetch(`http://localhost:${PORT}/api/reservations?tenantId=${tenant._id}&outletId=${outlet._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          outletId: outlet._id.toString(),
          guestName: 'John Doe',
          customerPhone: '1234567890',
          partySize: 2,
          scheduledAt: new Date(Date.now() + 3600000).toISOString()
        })
      });
      const resData = await resCreate.json();
      console.log("resData:", resData);
      if (resCreate.status !== 201) throw new Error('Failed to create reservation: ' + JSON.stringify(resData));
      const reservationId = resData.data.reservationId;
      if (!reservationId) throw new Error("Could not extract reservationId");

      const confirmRes = await fetch(`http://localhost:${PORT}/api/reservations/${reservationId}/confirm?tenantId=${tenant._id}&outletId=${outlet._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
      });
      if (confirmRes.status !== 200) {
          const bd = await confirmRes.json();
          throw new Error('Failed to confirm reservation: ' + JSON.stringify(bd));
      }
      console.log('  ✓ PASS: Reservation created and CONFIRMED.');

      console.log('  [2] Seating the guest...');
      const seatRes = await fetch(`http://localhost:${PORT}/api/reservations/${reservationId}/seat?tenantId=${tenant._id}&outletId=${outlet._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ tableId: table._id })
      });
      if (seatRes.status !== 200) {
          const bd = await seatRes.json();
          throw new Error('Failed to seat reservation: ' + JSON.stringify(bd));
      }
      console.log('  ✓ PASS: Guest seated.');

      const updatedTable = await Table.findById(table._id);
      if (updatedTable.operationalStatus !== 'OCCUPIED') throw new Error('Table not marked as OCCUPIED');
      console.log('  ✓ PASS: Table is OCCUPIED with active session.');

      console.log('  [3] Customer places QR order...');
      const orderRes = await fetch(`http://localhost:${PORT}/api/public/qr/orders?tenantId=${tenant._id}&outletId=${outlet._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableToken: updatedTable.qrToken,
          customerName: 'John Doe',
          customerPhone: '1234567890',
          items: [{ menuItemId: menuItem._id.toString(), quantity: 1, name: 'Burger', price: 10, notes: '' }]
        })
      });
      const orderData = await orderRes.json();
      if (orderRes.status !== 201) throw new Error('Failed to place order: ' + JSON.stringify(orderData));
      const orderId = orderData.data._id;
      console.log('  ✓ PASS: QR order placed successfully.');

      console.log('  [4] Moving order through lifecycle...');
      // ... we will test lifecycle steps here ...

      console.log('  [5] Closing table...');
      const closeRes = await fetch(`http://localhost:${PORT}/api/dining/operations?tenantId=${tenant._id}&outletId=${outlet._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          operationType: 'CLOSE_SESSION',
          payload: { tableId: table._id.toString(), sessionId: updatedTable.activeSessionId.toString() },
          sourceSystem: 'POS'
        })
      });
      
      const closeData = await closeRes.json();
      console.log("closeData:", closeData);
      if (closeRes.status !== 200) throw new Error('Failed to close session: ' + JSON.stringify(closeData));

      const finalTable = await Table.findById(table._id);
      if (finalTable.operationalStatus !== 'CLEANING' && finalTable.operationalStatus !== 'AVAILABLE') {
          throw new Error('Table did not reset properly');
      }
      console.log('  ✓ PASS: Scenario A Complete.');

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
