import express, { Router } from 'express';
import { CustomerController } from "./customer.controller.js";
import { verifyToken, isOutletManager } from "../../middlewares/auth.middleware.js";

const router: Router = express.Router();

// Get list of customers (Auth required, any role)
router.get('/', verifyToken, CustomerController.listCustomers);

// Create or Upsert customer (Auth required, any role allowed for POS/order taker flows)
router.post('/', verifyToken, CustomerController.upsertCustomer);

// Add customer address (Auth required, any role)
router.post('/:id/addresses', verifyToken, CustomerController.addAddress);

// Update customer address details (Auth required, any role)
router.patch('/:id/addresses/:addrId', verifyToken, CustomerController.updateAddress);

// Delete customer address (Auth required, any role)
router.delete('/:id/addresses/:addrId', verifyToken, CustomerController.deleteAddress);

// Get customer details by ID (Auth required, any role)
router.get('/:id', verifyToken, CustomerController.getCustomerById);

// Update customer details (Auth required, any role)
router.put('/:id', verifyToken, CustomerController.updateCustomer);

// Soft-delete customer (Auth required, restricted to Outlet Manager or above)
router.delete('/:id', verifyToken, isOutletManager, CustomerController.deleteCustomer);

export default router;
