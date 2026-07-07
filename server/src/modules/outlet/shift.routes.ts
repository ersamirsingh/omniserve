import { Router } from "express";
import { ShiftController } from "./shift.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";

const router = Router();

/** GET  /api/v1/shifts/current  — currently open shift */
router.get("/current", verifyToken, ShiftController.getCurrentShift);

/** GET  /api/v1/shifts/history  — recent shift history */
router.get("/history", verifyToken, ShiftController.getShiftHistory);

/** POST /api/v1/shifts/open  — open a new shift */
router.post("/open", verifyToken, ShiftController.openShift);

/** POST /api/v1/shifts/:shiftId/close  — close an open shift */
router.post("/:shiftId/close", verifyToken, ShiftController.closeShift);

export default router;
