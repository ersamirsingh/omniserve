import { Router } from "express";
import { BillingController } from "../controllers/billing.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = Router();

/**
 * POST /api/v1/billing/sessions/:sessionId/request
 * Request the bill for a QR session — computes totals, creates/updates BillSession.
 * Body: { discount?, tip?, notes?, outletId? }
 */
router.post("/sessions/:sessionId/request", verifyToken, BillingController.requestBill);

/**
 * GET /api/v1/billing/sessions/:sessionId
 * Get the full bill for a QR session (itemized + splits).
 */
router.get("/sessions/:sessionId", verifyToken, BillingController.getSessionBill);

/**
 * POST /api/v1/billing/:billSessionId/split
 * Split the bill using EQUAL, BY_SEAT, or CUSTOM strategy.
 * Body: { splitType, customSplits? }
 */
router.post("/:billSessionId/split", verifyToken, BillingController.splitBill);

/**
 * POST /api/v1/billing/:billSessionId/settle
 * Settle the bill fully or settle a specific seat's portion.
 * Body: { seatNumber?, paymentId? }
 */
router.post("/:billSessionId/settle", verifyToken, BillingController.settleBill);

export default router;
