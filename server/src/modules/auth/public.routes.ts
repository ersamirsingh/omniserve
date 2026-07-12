import { Router } from "express";
import { PublicController } from "./public.controller.js";

const publicRouter = Router();

// Retrieve public menu for an outlet slug
publicRouter.get("/o/:outletSlug/menu", PublicController.getPublicMenu);

// Retrieve table-specific menu and scan details
publicRouter.get("/o/:outletSlug/t/:tableToken/menu", PublicController.getTableSpecificMenu);

// Resolve QR Code token directly (no outlet slug required)
publicRouter.get("/qr/resolve/:tableToken", PublicController.resolveQrCode);

// Place a QR order
publicRouter.post("/qr/orders", PublicController.placeQrOrder);

// Request customer self-service assistance
publicRouter.post("/qr/assist", PublicController.requestQrAssistance);

// Retrieve public categories for an outlet slug
publicRouter.get("/o/:outletSlug/categories", PublicController.getPublicCategories);

// Retrieve public menu item details
publicRouter.get("/o/:outletSlug/menu/:itemId", PublicController.getPublicMenuItem);

// Shopping cart endpoints
publicRouter.get("/cart", PublicController.getCart);
publicRouter.post("/cart", PublicController.createOrUpdateCart);
publicRouter.patch("/cart/:id", PublicController.updateCart);
publicRouter.delete("/cart/:id/items/:itemId", PublicController.removeFromCart);

// Customer addresses management
publicRouter.post("/customer/address", PublicController.createCustomerAddress);

// Checkout
publicRouter.post("/checkout", PublicController.checkoutCart);

// Reorder
publicRouter.post("/cart/reorder", PublicController.reorderToCart);

// Tracking
publicRouter.get("/orders/track/:orderId", PublicController.trackOrder);

// QR Session Bill & Payments
publicRouter.get("/qr/session/:sessionToken/bill", PublicController.getQrSessionBill);
publicRouter.post("/qr/session/:sessionToken/pay", PublicController.payQrSessionBill);
publicRouter.get("/o/:outletSlug/coupons/validate", PublicController.validateCoupon);

export default publicRouter;
