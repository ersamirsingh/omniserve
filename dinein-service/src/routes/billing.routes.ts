import { Router } from 'express';
import { generateBill, getBillBySession, recordPayment } from '../controllers/billing.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { generateBillSchema, recordPaymentSchema } from '../validators/billing.validators.js';

const router = Router();

router.post('/generate', validate(generateBillSchema), generateBill);
router.get('/session/:sessionId', getBillBySession);
router.patch('/:billId/payment', validate(recordPaymentSchema), recordPayment);

export default router;
