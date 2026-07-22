import { Router } from "express";
import { BillingController } from "./billing.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";

const router = Router();

router.post("/sessions/:sessionId/request", verifyToken, BillingController.requestBill);

router.get("/sessions/:sessionId", verifyToken, BillingController.getSessionBill);

router.post("/:billSessionId/split", verifyToken, BillingController.splitBill);

router.post("/:billSessionId/settle", verifyToken, BillingController.settleBill);

export default router;
