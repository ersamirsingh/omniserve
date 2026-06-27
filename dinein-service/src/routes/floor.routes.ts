import { Router } from 'express';
import { createFloor, createSection, getFloorMap } from '../controllers/floor.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createFloorSchema, createSectionSchema } from '../validators/floor.validators.js';

const router = Router();

router.get('/map', getFloorMap);
router.post('/floors', validate(createFloorSchema), createFloor);
router.post('/sections', validate(createSectionSchema), createSection);

export default router;
