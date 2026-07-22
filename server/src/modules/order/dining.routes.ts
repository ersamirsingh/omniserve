import express, { Router } from "express";
import { DiningOperationsController } from "./dining-operations.controller.js";
import { verifyToken, isOutletManager } from "../../middlewares/auth.middleware.js";

const router: Router = express.Router();

router.post("/operations", verifyToken, DiningOperationsController.executeOperation);

router.put("/tables/layout", verifyToken, isOutletManager, DiningOperationsController.updateTablesLayout);

router.get("/timeline/:sessionId", verifyToken, DiningOperationsController.getUnifiedTimeline);

router.get("/tables", verifyToken, DiningOperationsController.listTables);
router.post("/tables", verifyToken, isOutletManager, DiningOperationsController.createTable);
router.patch("/tables/:id", verifyToken, isOutletManager, DiningOperationsController.updateTable);
router.delete("/tables/:id", verifyToken, isOutletManager, DiningOperationsController.archiveTable);
router.post("/tables/:tableId/hold", verifyToken, DiningOperationsController.holdTable);
router.post("/tables/:tableId/rotate-qr", verifyToken, isOutletManager, DiningOperationsController.rotateTableQrToken);

router.get("/areas", verifyToken, DiningOperationsController.listDiningAreas);
router.post("/areas", verifyToken, isOutletManager, DiningOperationsController.createDiningArea);
router.patch("/areas/:id", verifyToken, isOutletManager, DiningOperationsController.updateDiningArea);
router.delete("/areas/:id", verifyToken, isOutletManager, DiningOperationsController.archiveDiningArea);

router.get("/waiter-tasks", verifyToken, DiningOperationsController.listWaiterTasks);

export default router;
