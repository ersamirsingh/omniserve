import { Router } from "express";
import { KdsController } from "./kds.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";

const router = Router();

router.get("/queue", verifyToken, KdsController.getKdsQueue);

router.post("/items/:itemId/hold", verifyToken, KdsController.holdItem);

router.post("/items/:itemId/fire", verifyToken, KdsController.fireItem);

router.post("/orders/:orderId/fire-course", verifyToken, KdsController.fireCourse);

router.patch("/items/:itemId/station", verifyToken, KdsController.updateKdsStation);

export default router;
