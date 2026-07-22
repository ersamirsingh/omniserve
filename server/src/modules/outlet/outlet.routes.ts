import express, { Router } from 'express';
import { OutletController } from "./outlet.controller.js";
import {
  verifyToken,
  optionalAuth,
  isRestaurantOwner,
  isOutletManager,
} from "../../middlewares/auth.middleware.js";

const router: Router = express.Router();

router.get('/nearby', optionalAuth, OutletController.findNearbyOutlets);

router.get('/', verifyToken, OutletController.listOutlets);

router.post('/', verifyToken, isRestaurantOwner, OutletController.createOutlet);

router.get('/:id', verifyToken, OutletController.getOutletById);

router.put('/:id', verifyToken, isRestaurantOwner, OutletController.updateOutlet);

router.patch('/:id/status', verifyToken, isOutletManager, OutletController.toggleOutletStatus);

router.patch('/:id/operating-hours', verifyToken, isOutletManager, OutletController.updateOperatingHours);

router.delete('/:id', verifyToken, isRestaurantOwner, OutletController.deleteOutlet);

export default router;
