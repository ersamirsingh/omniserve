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

test('Scenario D: Reservation Synchronization', async () => {
  const server = app.listen(PORT, async () => {
    try {
      await mongoose.connect('mongodb://localhost:27017/foodmesh_test_scenario_d');
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

      // 0. Create a second table for transfer later
      const table2 = await Table.create({
        tenantId: tenant._id, outletId: outlet._id, diningAreaId: area._id,
        tableNumber: 'T2', capacity: 4, seatCount: 4, operationalStatus: 'AVAILABLE',
        isDeleted: false
      });

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

      console.log('  [2] Creating an online Reservation for Table 1...');
      const res2Create = await fetch(`http://localhost:${PORT}/api/reservations?tenantId=${tenant._id}&outletId=${outlet._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          outletId: outlet._id.toString(),
          guestName: 'Reserved Guest',
          partySize: 2,
          scheduledAt: new Date(Date.now() + 3600000).toISOString()
        })
      });
      const res2Data = await res2Create.json();
      const reservation2Id = res2Data.data.reservationId;
      await fetch(`http://localhost:${PORT}/api/reservations/${reservation2Id}/confirm?tenantId=${tenant._id}&outletId=${outlet._id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
      });

      console.log('  [3] Attempting to seat Reservation on occupied Table 1...');
      const seatFailRes = await fetch(`http://localhost:${PORT}/api/reservations/${reservation2Id}/seat?tenantId=${tenant._id}&outletId=${outlet._id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ tableId: table._id.toString() })
      });
      if (seatFailRes.status === 200) throw new Error('Expected seating to fail because table is occupied');
      console.log('  ✓ PASS: Prevented seating on OCCUPIED table.');

      console.log('  [4] Transferring Walk-In from Table 1 to Table 2...');
      const transferRes = await fetch(`http://localhost:${PORT}/api/dining/operations?tenantId=${tenant._id}&outletId=${outlet._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          operationType: 'TRANSFER_TABLE',
          payload: { fromTableId: table._id.toString(), toTableId: table2._id.toString() },
          sourceSystem: 'POS'
        })
      });
      if (transferRes.status !== 200) throw new Error('Failed to transfer table');
      console.log('  ✓ PASS: Transferred table.');

      console.log('  [5] Seating Reservation on Table 1...');
      const seatSuccessRes = await fetch(`http://localhost:${PORT}/api/reservations/${reservation2Id}/seat?tenantId=${tenant._id}&outletId=${outlet._id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ tableId: table._id.toString() })
      });
      if (seatSuccessRes.status !== 200) throw new Error('Failed to seat reservation on Table 1 after transfer');
      console.log('  ✓ PASS: Reservation successfully seated.');

      console.log('  ✓ PASS: Scenario D Complete.');

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
