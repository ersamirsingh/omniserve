import express, { Router } from 'express';
import { AddonController } from "./addon.controller.js";
import { verifyToken, isOutletManager } from "../../middlewares/auth.middleware.js";

const router: Router = express.Router();

router.get('/', verifyToken, AddonController.listAddons);

router.post('/', verifyToken, isOutletManager, AddonController.createAddon);

router.put('/:id', verifyToken, isOutletManager, AddonController.updateAddon);

router.delete('/:id', verifyToken, isOutletManager, AddonController.deleteAddon);

export default router;
