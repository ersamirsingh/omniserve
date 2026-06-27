import { Router } from 'express';
import {
  createAssistanceRequest,
  listAssistanceRequests,
  resolveAssistanceRequest,
} from '../controllers/assistance.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createAssistanceSchema, resolveAssistanceSchema } from '../validators/assistance.validators.js';

const router = Router();

router.get('/', listAssistanceRequests);
router.post('/', validate(createAssistanceSchema), createAssistanceRequest);
router.patch('/:requestId/resolve', validate(resolveAssistanceSchema), resolveAssistanceRequest);

export default router;
