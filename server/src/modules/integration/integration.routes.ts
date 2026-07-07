import express, { Router } from "express";
import { IntegrationController } from "./integration.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import { requireActiveSubscription, requireFeature } from "../../middlewares/subscription.middleware.js";

const router: Router = express.Router();

// Public Mock Inbound Integrations callbacks
router.post("/mock/swiggy/orders", IntegrationController.receiveMockSwiggyOrder);
router.post("/mock/zomato/orders", IntegrationController.receiveMockZomatoOrder);

// Admin Dashboard Integrations management (requires authentication)
router.get("/external-orders", verifyToken, requireActiveSubscription(), requireFeature("apiAccess"), IntegrationController.getExternalOrders);
router.post("/external-orders/:id/replay", verifyToken, requireActiveSubscription(), requireFeature("apiAccess"), IntegrationController.replayOrder);
router.get("/mappings/health", verifyToken, requireActiveSubscription(), requireFeature("apiAccess"), IntegrationController.getMappingsHealth);
router.get("/mappings/unmapped", verifyToken, requireActiveSubscription(), requireFeature("apiAccess"), IntegrationController.getUnmappedItems);

// Phase 7 Event Bus & Sync Engine stats, events log, sync jobs, and replay
router.get("/stats", verifyToken, requireActiveSubscription(), requireFeature("apiAccess"), IntegrationController.getIntegrationStats);
router.get("/events", verifyToken, requireActiveSubscription(), requireFeature("apiAccess"), IntegrationController.getIntegrationEvents);
router.get("/sync-jobs", verifyToken, requireActiveSubscription(), requireFeature("apiAccess"), IntegrationController.getSyncJobs);
router.post("/events/:id/replay", verifyToken, requireActiveSubscription(), requireFeature("apiAccess"), IntegrationController.replayEvent);

export default router;
