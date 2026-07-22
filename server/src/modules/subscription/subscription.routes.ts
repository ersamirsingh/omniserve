import express, { Router } from "express";
import { AdminSubscriptionController } from "./admin-subscription.controller.js";
import { RestaurantSubscriptionController } from "./restaurant-subscription.controller.js";
import { verifyToken, isRestaurantOwner, isSuperAdmin } from "../../middlewares/auth.middleware.js";
import { requireSystemAdmin } from "../../middlewares/rbac.middleware.js";

const router: Router = express.Router();

router.get("/plans", verifyToken, isRestaurantOwner, AdminSubscriptionController.listPlans);
router.post("/plans", verifyToken, requireSystemAdmin, AdminSubscriptionController.createPlan);
router.put("/plans/:id", verifyToken, requireSystemAdmin, AdminSubscriptionController.updatePlan);
router.delete("/plans/:id", verifyToken, requireSystemAdmin, AdminSubscriptionController.deletePlan);

router.get("/admin/list", verifyToken, requireSystemAdmin, AdminSubscriptionController.listSubscriptions);
router.get("/admin/invoices", verifyToken, requireSystemAdmin, AdminSubscriptionController.listInvoices);
router.get("/admin/analytics", verifyToken, requireSystemAdmin, AdminSubscriptionController.getAnalytics);
router.get("/admin/:id", verifyToken, requireSystemAdmin, AdminSubscriptionController.getSubscriptionById);

router.get("/my-subscription", verifyToken, isRestaurantOwner, RestaurantSubscriptionController.getMySubscription);
router.get("/usage", verifyToken, isRestaurantOwner, RestaurantSubscriptionController.getUsage);
router.get("/invoice-history", verifyToken, isRestaurantOwner, RestaurantSubscriptionController.getInvoiceHistory);

router.post("/upgrade", verifyToken, isRestaurantOwner, RestaurantSubscriptionController.upgrade);
router.post("/downgrade", verifyToken, isRestaurantOwner, RestaurantSubscriptionController.downgrade);
router.post("/cancel", verifyToken, isRestaurantOwner, RestaurantSubscriptionController.cancel);
router.post("/resume", verifyToken, isRestaurantOwner, RestaurantSubscriptionController.resume);
router.post("/renew", verifyToken, isRestaurantOwner, RestaurantSubscriptionController.renew);
router.post("/validate-coupon", verifyToken, isRestaurantOwner, RestaurantSubscriptionController.validateSubscriptionCoupon);

export default router;
