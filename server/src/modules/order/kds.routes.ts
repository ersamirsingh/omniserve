import { Router } from "express";
import { KdsController } from "./kds.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";

const router = Router();

/**
 * GET /api/v1/kds/queue
 * Fetch the full KDS queue for an outlet.
 * Query params: course?, kdsStation?, holdStatus?
 */
router.get("/queue", verifyToken, KdsController.getKdsQueue);

/**
 * POST /api/v1/kds/items/:itemId/hold
 * Hold an item (prevent it from being sent to KDS until fired).
 */
router.post("/items/:itemId/hold", verifyToken, KdsController.holdItem);

/**
 * POST /api/v1/kds/items/:itemId/fire
 * Fire a specific item to the KDS.
 * Body: { kdsStation? }
 */
router.post("/items/:itemId/fire", verifyToken, KdsController.fireItem);

/**
 * POST /api/v1/kds/orders/:orderId/fire-course
 * Fire all held items for a course on an order (batch fire).
 * Body: { course, kdsStation? }
 */
router.post("/orders/:orderId/fire-course", verifyToken, KdsController.fireCourse);

/**
 * PATCH /api/v1/kds/items/:itemId/station
 * Re-route an item to a different KDS station.
 * Body: { kdsStation }
 */
router.patch("/items/:itemId/station", verifyToken, KdsController.updateKdsStation);

export default router;
