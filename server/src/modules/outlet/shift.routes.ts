import { Router } from "express";
import { ShiftController } from "./shift.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";

const router = Router();

router.get("/current", verifyToken, ShiftController.getCurrentShift);

router.get("/history", verifyToken, ShiftController.getShiftHistory);

router.post("/open", verifyToken, ShiftController.openShift);

router.post("/:shiftId/close", verifyToken, ShiftController.closeShift);

export default router;
