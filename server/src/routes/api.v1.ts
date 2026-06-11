import { Router } from "express";

import authRoutes from "./auth.route.js";
import subscriptionRoutes from "./subscription.route.js";
import restaurantRouter from "./restaurant.route.js";
import outletRoutes from "./outlet.routes.js";
import categoryRouter from "./category.route.js";
import menuItemRouter from "./menuitem.route.js";
import variantRouter from "./variant.route.js";
import addonRouter from "./addon.route.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/subscriptions", subscriptionRoutes);
router.use("/restaurants", restaurantRouter);
router.use("/outlets", outletRoutes);
router.use("/categories", categoryRouter);
router.use("/menu-items", menuItemRouter);
router.use("/variants", variantRouter);
router.use("/addons", addonRouter);

export default router;