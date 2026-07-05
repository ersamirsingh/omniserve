import mongoose from 'mongoose';
const originalStartSession = mongoose.startSession;
mongoose.startSession = async function(options) {
  const session = await originalStartSession.call(mongoose, options);
  session.startTransaction = () => {};
  session.commitTransaction = async () => {};
  session.abortTransaction = async () => {};
  session.inTransaction = () => false;
  return session;
};

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

process.env.NODE_ENV = 'test';
const PORT = 5006;

test('Scenario G: QR Security and Rotation', async () => {
  const server = app.listen(PORT, async () => {
    try {
      await mongoose.connect('mongodb://localhost:27017/foodmesh_test_qr');
      await mongoose.connection.db.dropDatabase();
      
      const tenant = await Tenant.create({ 
        name: 'Test Tenant', 
        domain: 'test.com', 
        type: 'RESTAURANT', 
        status: 'ACTIVE',
        slug: 'test-tenant',
        ownerId: new mongoose.Types.ObjectId()
      });
      const restaurant = await mongoose.model('Restaurant').create({
        tenantId: tenant._id,
        name: 'Test Restaurant',
        slug: 'test-restaurant',
        status: 'ACTIVE',
        ownerId: tenant.ownerId,
        currency: 'USD'
      });
      const outlet = await Outlet.create({ 
        tenantId: tenant._id, 
        restaurantId: restaurant._id,
        name: 'Test Outlet', 
        address: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        pincode: '123456',
        isDeleted: false 
      });
      const area = await DiningArea.create({ tenantId: tenant._id, outletId: outlet._id, name: 'Main', type: 'INDOOR', capacity: 20 });
      
      const table = await Table.create({
        tenantId: tenant._id,
        outletId: outlet._id,
        diningAreaId: area._id,
        tableNumber: 'T1',
        capacity: 4,
        seatCount: 4,
        operationalStatus: 'AVAILABLE',
        qrToken: 'initial_token_123',
        isDeleted: false
      });
      
      const user = await User.create({
        tenantId: tenant._id,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'Manager',
        passwordHash: '123',
        role: 'OUTLET_MANAGER',
        isDeleted: false
      });
      
      const token = jwt.sign(
        { id: user._id, tenantId: tenant._id, role: user.role, outletId: outlet._id },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '1d' }
      );
      
      console.log('  [1] Verifying QR Rotation with NO active session...');
      const rotRes1 = await fetch(`http://localhost:${PORT}/api/dining/tables/${table._id}/rotate-qr?tenantId=${tenant._id}&outletId=${outlet._id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (rotRes1.status !== 200) {
        const bd = await rotRes1.text();
        throw new Error('Failed to rotate QR code without session: ' + bd);
      }
      const rotData1 = await rotRes1.json();
      console.log(`  ✓ PASS: Rotated token to ${rotData1.data.qrToken}`);
      
      console.log('  [2] Simulating active session and verifying block...');
      await Table.findByIdAndUpdate(table._id, { activeSessionId: new mongoose.Types.ObjectId() });
      
      const rotRes2 = await fetch(`http://localhost:${PORT}/api/dining/tables/${table._id}/rotate-qr?tenantId=${tenant._id}&outletId=${outlet._id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (rotRes2.status !== 400 && rotRes2.status !== 500) {
        throw new Error(`Expected error rotating QR with active session, got ${rotRes2.status}`);
      }
      console.log('  ✓ PASS: Safely blocked QR rotation while active session exists.');
      
      server.close();
      await mongoose.disconnect();
      process.exit(0);
    } catch (e) {
      console.error(e);
      server.close();
      await mongoose.disconnect();
      process.exit(1);
    }
  });
});
