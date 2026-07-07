import express, { Router } from "express";
import { AdminSubscriptionController } from "./admin-subscription.controller.js";
import { RestaurantSubscriptionController } from "./restaurant-subscription.controller.js";
import { verifyToken, isRestaurantOwner, isSuperAdmin } from "../../middlewares/auth.middleware.js";

const router: Router = express.Router();

// ==========================================
// Super Admin Routes (Plan and SaaS management)
// ==========================================

// Plans configuration
router.get("/plans", verifyToken, isRestaurantOwner, AdminSubscriptionController.listPlans);
router.post("/plans", verifyToken, isSuperAdmin, AdminSubscriptionController.createPlan);
router.put("/plans/:id", verifyToken, isSuperAdmin, AdminSubscriptionController.updatePlan);
router.delete("/plans/:id", verifyToken, isSuperAdmin, AdminSubscriptionController.deletePlan);

// Global Subscriptions lists
router.get("/admin/list", verifyToken, isSuperAdmin, AdminSubscriptionController.listSubscriptions);
router.get("/admin/invoices", verifyToken, isSuperAdmin, AdminSubscriptionController.listInvoices);
router.get("/admin/analytics", verifyToken, isSuperAdmin, AdminSubscriptionController.getAnalytics);
router.get("/admin/:id", verifyToken, isSuperAdmin, AdminSubscriptionController.getSubscriptionById);


// ==========================================
// Restaurant Tenant Owner Routes (Self-Service)
// ==========================================

router.get("/my-subscription", verifyToken, isRestaurantOwner, RestaurantSubscriptionController.getMySubscription);
router.get("/usage", verifyToken, isRestaurantOwner, RestaurantSubscriptionController.getUsage);
router.get("/invoice-history", verifyToken, isRestaurantOwner, RestaurantSubscriptionController.getInvoiceHistory);

router.post("/upgrade", verifyToken, isRestaurantOwner, RestaurantSubscriptionController.upgrade);
router.post("/downgrade", verifyToken, isRestaurantOwner, RestaurantSubscriptionController.downgrade);
router.post("/cancel", verifyToken, isRestaurantOwner, RestaurantSubscriptionController.cancel);
router.post("/resume", verifyToken, isRestaurantOwner, RestaurantSubscriptionController.resume);
router.post("/renew", verifyToken, isRestaurantOwner, RestaurantSubscriptionController.renew);

export default router;
