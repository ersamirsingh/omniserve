import express, { Router } from 'express';
import { VariantController } from "./variant.controller.js";
import { verifyToken, isOutletManager } from "../../middlewares/auth.middleware.js";

const router: Router = express.Router();

router.get('/', verifyToken, VariantController.listVariants);

router.post('/', verifyToken, isOutletManager, VariantController.createVariant);

router.put('/:id', verifyToken, isOutletManager, VariantController.updateVariant);

router.delete('/:id', verifyToken, isOutletManager, VariantController.deleteVariant);

export default router;
