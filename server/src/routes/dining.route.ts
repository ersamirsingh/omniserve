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

// Get all tables route
router.get("/tables", verifyToken, DiningOperationsController.listTables);

// Get all dining areas route
router.get("/areas", verifyToken, DiningOperationsController.listDiningAreas);

// Get all waiter tasks route
router.get("/waiter-tasks", verifyToken, DiningOperationsController.listWaiterTasks);

export default router;
