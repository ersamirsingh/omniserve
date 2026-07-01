import express from "express";
import { DiningOperationsController } from "../controllers/dining-operations.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";
const router = express.Router();
// Operations gateway route
router.post("/operations", verifyToken, DiningOperationsController.executeOperation);
// Table layout batch update route
router.put("/tables/layout", verifyToken, DiningOperationsController.updateTablesLayout);
// Unified chronological timeline route
router.get("/timeline/:sessionId", verifyToken, DiningOperationsController.getUnifiedTimeline);
export default router;
