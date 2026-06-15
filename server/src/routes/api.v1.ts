import { Router } from "express";

import authRoutes from "./auth.route.js";
import subscriptionRoutes from "./subscription.route.js";
import restaurantRouter from "./restaurant.route.js";
import outletRoutes from "./outlet.routes.js";
import categoryRouter from "./category.route.js";
import menuItemRouter from "./menuitem.route.js";
import variantRouter from "./variant.route.js";
import addonRouter from "./addon.route.js";
import inventoryRouter from "./inventory.route.js";
import customerRouter from "./customer.route.js";
import orderRouter from "./order.route.js";
import paymentRouter from "./payment.route.js";
import notificationRouter from "./notification.route.js";
import analyticsRouter from "./analytics.route.js";
import webhookRouter from "./webhook.route.js";
import auditLogRouter from "./auditlog.route.js";
import userRoutes from "./user.route.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/subscriptions", subscriptionRoutes);
router.use("/restaurants", restaurantRouter);
router.use("/outlets", outletRoutes);
router.use("/categories", categoryRouter);
router.use("/menu-items", menuItemRouter);
router.use("/variants", variantRouter);
router.use("/addons", addonRouter);
router.use("/inventory", inventoryRouter);
router.use("/customers", customerRouter);
router.use("/orders", orderRouter);
router.use("/payments", paymentRouter);
router.use("/notifications", notificationRouter);
router.use("/analytics", analyticsRouter);
router.use("/webhooks", webhookRouter);
router.use("/audit-logs", auditLogRouter);
router.use("/users", userRoutes);

export default router;