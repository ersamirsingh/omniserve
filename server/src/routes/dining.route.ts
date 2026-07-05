import express, { Router } from "express";
import { DiningOperationsController } from "../controllers/dining-operations.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router: Router = express.Router();

// Operations gateway route
router.post("/operations", verifyToken, DiningOperationsController.executeOperation);

// Table layout batch update route
router.put("/tables/layout", verifyToken, DiningOperationsController.updateTablesLayout);

// Unified chronological timeline route
router.get("/timeline/:sessionId", verifyToken, DiningOperationsController.getUnifiedTimeline);

// Tables routes
router.get("/tables", verifyToken, DiningOperationsController.listTables);
router.post("/tables", verifyToken, DiningOperationsController.createTable);
router.patch("/tables/:id", verifyToken, DiningOperationsController.updateTable);
router.delete("/tables/:id", verifyToken, DiningOperationsController.archiveTable);
router.post("/tables/:tableId/rotate-qr", verifyToken, DiningOperationsController.rotateTableQrToken);

// Dining areas routes
router.get("/areas", verifyToken, DiningOperationsController.listDiningAreas);
router.post("/areas", verifyToken, DiningOperationsController.createDiningArea);
router.patch("/areas/:id", verifyToken, DiningOperationsController.updateDiningArea);
router.delete("/areas/:id", verifyToken, DiningOperationsController.archiveDiningArea);

// Get all waiter tasks route
router.get("/waiter-tasks", verifyToken, DiningOperationsController.listWaiterTasks);

export default router;
