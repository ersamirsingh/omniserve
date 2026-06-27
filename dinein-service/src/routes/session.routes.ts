import { Router } from 'express';
import {
  closeSession,
  getSession,
  joinSession,
  listSessions,
  openSession,
} from '../controllers/session.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { closeSessionSchema, joinSessionSchema, openSessionSchema } from '../validators/session.validators.js';

const router = Router();

router.get('/', listSessions);
router.post('/', validate(openSessionSchema), openSession);
router.get('/:sessionId', getSession);
router.post('/:sessionId/join', validate(joinSessionSchema), joinSession);
router.patch('/:sessionId/close', validate(closeSessionSchema), closeSession);

export default router;
