import express from "express";
import { IntegrationController } from "../controllers/integration.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";
const router = express.Router();
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
// Phase 7.5 Developer Sandbox endpoints (requires authentication)
router.get("/dev/config", verifyToken, IntegrationController.getDevConfig);
router.post("/dev/load-demo-catalog", verifyToken, IntegrationController.loadDemoCatalog);
router.post("/dev/generate-mappings", verifyToken, IntegrationController.generateMappings);
router.post("/dev/validate-mappings", verifyToken, IntegrationController.validateMappings);
router.post("/dev/reset", verifyToken, IntegrationController.resetDevSandbox);
router.post("/dev/simulate-order", verifyToken, IntegrationController.simulateOrder);
router.get("/dev/simulator/sessions", verifyToken, IntegrationController.getSimulatorSessions);
router.get("/dev/simulator/:sessionId/metrics", verifyToken, IntegrationController.getSimulatorMetrics);
router.get("/dev/simulator/:sessionId/events", verifyToken, IntegrationController.getSimulatorEvents);
router.post("/dev/simulator/:sessionId/stop", verifyToken, IntegrationController.stopSimulatorSession);
router.post("/dev/run-smoke-test", verifyToken, IntegrationController.runSmokeTest);
export default router;
