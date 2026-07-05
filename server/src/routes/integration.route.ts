import express, { Router } from "express";
import { IntegrationController } from "../controllers/integration.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router: Router = express.Router();

// Public Mock Inbound Integrations callbacks
router.post("/mock/swiggy/orders", IntegrationController.receiveMockSwiggyOrder);
router.post("/mock/zomato/orders", IntegrationController.receiveMockZomatoOrder);

// Admin Dashboard Integrations management (requires authentication)
router.get("/external-orders", verifyToken, IntegrationController.getExternalOrders);
router.post("/external-orders/:id/replay", verifyToken, IntegrationController.replayOrder);
router.get("/mappings/health", verifyToken, IntegrationController.getMappingsHealth);
router.get("/mappings/unmapped", verifyToken, IntegrationController.getUnmappedItems);

// Phase 7 Event Bus & Sync Engine stats, events log, sync jobs, and replay
router.get("/stats", verifyToken, IntegrationController.getIntegrationStats);
router.get("/events", verifyToken, IntegrationController.getIntegrationEvents);
router.get("/sync-jobs", verifyToken, IntegrationController.getSyncJobs);
router.post("/events/:id/replay", verifyToken, IntegrationController.replayEvent);


export default router;
