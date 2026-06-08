import { Router } from "express";
import authRoutes from "./auth.routes.js";
import subscriptionRoutes from "./subscription.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/subscriptions", subscriptionRoutes);

export default router;
