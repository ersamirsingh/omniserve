import { Router } from 'express';
import {
  assignWaiter,
  changeTableStatus,
  createTable,
  deleteTable,
  listTables,
  lockTable,
  mergeTables,
  moveTable,
  releaseTable,
  reserveTable,
  splitTables,
  transferWaiter,
  unlockTable,
  updateTable,
} from '../controllers/table.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  assignWaiterSchema,
  changeTableStatusSchema,
  createTableSchema,
  lockTableSchema,
  mergeTablesSchema,
  moveTableSchema,
  splitTablesSchema,
  updateTableSchema,
} from '../validators/floor.validators.js';

const router = Router();

router.get('/', listTables);
router.post('/', validate(createTableSchema), createTable);
router.patch('/:tableId', validate(updateTableSchema), updateTable);
router.delete('/:tableId', deleteTable);
router.patch('/:tableId/move', validate(moveTableSchema), moveTable);
router.patch('/:tableId/status', validate(changeTableStatusSchema), changeTableStatus);
router.patch('/:tableId/reserve/:reservationId', reserveTable);
router.patch('/:tableId/release', releaseTable);
router.post('/merge', validate(mergeTablesSchema), mergeTables);
router.post('/split', validate(splitTablesSchema), splitTables);
router.patch('/:tableId/assign-waiter', validate(assignWaiterSchema), assignWaiter);
router.patch('/:tableId/transfer-waiter', validate(assignWaiterSchema), transferWaiter);
router.patch('/:tableId/lock', validate(lockTableSchema), lockTable);
router.patch('/:tableId/unlock', unlockTable);

export default router;
