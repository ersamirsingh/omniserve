import express, { Router } from 'express';
import { CustomerController } from "./customer.controller.js";
import { verifyToken, isOutletManager } from "../../middlewares/auth.middleware.js";

const router: Router = express.Router();

router.get('/', verifyToken, CustomerController.listCustomers);

router.post('/', verifyToken, CustomerController.upsertCustomer);

router.post('/:id/addresses', verifyToken, CustomerController.addAddress);

router.patch('/:id/addresses/:addrId', verifyToken, CustomerController.updateAddress);

router.delete('/:id/addresses/:addrId', verifyToken, CustomerController.deleteAddress);

router.get('/:id', verifyToken, CustomerController.getCustomerById);

router.put('/:id', verifyToken, CustomerController.updateCustomer);

router.delete('/:id', verifyToken, isOutletManager, CustomerController.deleteCustomer);

export default router;
