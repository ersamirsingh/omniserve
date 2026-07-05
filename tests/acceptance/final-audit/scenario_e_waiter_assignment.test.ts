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

test('Scenario E: Waiter Assignment', async () => {
  const server = app.listen(PORT, async () => {
    try {
      await mongoose.connect('mongodb://localhost:27017/foodmesh_test_scenario_e');
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

      console.log('  [1] Staff opens a Walk-In session on Table 1...');
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
      const walkInReservationId = walkInData.data.reservationId;
      await fetch(`http://localhost:${PORT}/api/reservations/${walkInReservationId}/confirm?tenantId=${tenant._id}&outletId=${outlet._id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
      });
      await fetch(`http://localhost:${PORT}/api/reservations/${walkInReservationId}/seat?tenantId=${tenant._id}&outletId=${outlet._id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ tableId: table._id.toString() })
      });
      console.log('  ✓ PASS: Table 1 is OCCUPIED.');

      console.log('  [2] Assigning a Waiter to the Table...');
      const waiterUser = await mongoose.connection.db.collection('users').insertOne({
        tenantId: tenant._id,
        outletId: outlet._id,
        firstName: 'Waiter',
        lastName: 'One',
        email: 'waiter1@example.com',
        role: 'STAFF',
        isDeleted: false
      });
      
      const occupiedTable = await Table.findById(table._id);
      
      const assignRes = await fetch(`http://localhost:${PORT}/api/dining/operations?tenantId=${tenant._id}&outletId=${outlet._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          operationType: 'CHANGE_WAITER',
          payload: { tableId: table._id.toString(), sessionId: occupiedTable.activeSessionId.toString(), waiterId: waiterUser.insertedId.toString() },
          sourceSystem: 'POS'
        })
      });
      
      if (assignRes.status !== 200) throw new Error('Failed to assign waiter');
      
      const qrsession = await mongoose.model('QRSession').findOne({ tableId: table._id, status: 'ACTIVE' });
      if (qrsession.waiterId?.toString() !== waiterUser.insertedId.toString()) throw new Error('QRSession waiterId not updated');
      console.log('  ✓ PASS: Waiter successfully assigned to Session.');

      console.log('  [3] Customer places QR order...');
      const orderRes = await fetch(`http://localhost:${PORT}/api/public/qr/orders?tenantId=${tenant._id}&outletId=${outlet._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableToken: occupiedTable.qrToken,
          customerName: 'John Doe',
          customerPhone: '1234567890',
          items: [{ menuItemId: menuItem._id.toString(), quantity: 1, name: 'Burger', price: 10, notes: '' }]
        })
      });
      const orderData = await orderRes.json();
      if (orderRes.status !== 201) throw new Error('Failed to place order: ' + JSON.stringify(orderData));
      
      const orderId = orderData.data.internalOrderId;
      const order = await mongoose.model('Order').findById(orderId);
      if (order.waiterId?.toString() !== waiterUser.insertedId.toString()) {
          throw new Error('Order did not inherit Waiter ID');
      }
      console.log('  ✓ PASS: QR order inherited Waiter assignment successfully.');

      console.log('  [4] Closing table...');
      const closeRes = await fetch(`http://localhost:${PORT}/api/dining/operations?tenantId=${tenant._id}&outletId=${outlet._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          operationType: 'CLOSE_SESSION',
          payload: { tableId: table._id.toString(), sessionId: occupiedTable.activeSessionId.toString() },
          sourceSystem: 'POS'
        })
      });
      
      if (closeRes.status !== 200) throw new Error('Failed to close session');

      console.log('  ✓ PASS: Scenario E Complete.');

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
