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
import integrationRouter from "./integration.route.js";
import publicRouter from "./public.route.js";
import diningRouter from "./dining.route.js";
import kdsRouter from "./kds.route.js";
import billingRouter from "./billing.route.js";
import shiftRouter from "./shift.route.js";
import reservationRouter from "./reservation.route.js";
import diningAnalyticsRouter from "./dining-analytics.route.js";


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
router.use("/integrations", integrationRouter);
router.use("/v1/integrations", integrationRouter);
router.use("/public", publicRouter);
router.use("/dining", diningRouter);
router.use("/kds", kdsRouter);
router.use("/billing", billingRouter);
router.use("/shifts", shiftRouter);
router.use("/reservations", reservationRouter);
router.use("/dining-analytics", diningAnalyticsRouter);


export default router;
