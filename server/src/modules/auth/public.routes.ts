import { Router } from "express";
import { PublicController } from "./public.controller.js";

const publicRouter = Router();

publicRouter.get("/o/:outletSlug/menu", PublicController.getPublicMenu);

publicRouter.get("/o/:outletSlug/t/:tableToken/menu", PublicController.getTableSpecificMenu);

publicRouter.get("/qr/resolve/:tableToken", PublicController.resolveQrCode);

publicRouter.post("/qr/orders", PublicController.placeQrOrder);

publicRouter.post("/qr/merge-tables", PublicController.mergeTablesForSession);

publicRouter.post("/qr/assist", PublicController.requestQrAssistance);

publicRouter.get("/o/:outletSlug/categories", PublicController.getPublicCategories);

publicRouter.get("/o/:outletSlug/menu/:itemId", PublicController.getPublicMenuItem);

publicRouter.get("/cart", PublicController.getCart);
publicRouter.post("/cart", PublicController.createOrUpdateCart);
publicRouter.patch("/cart/:id", PublicController.updateCart);
publicRouter.delete("/cart/:id/items/:itemId", PublicController.removeFromCart);

publicRouter.post("/customer/address", PublicController.createCustomerAddress);

publicRouter.post("/checkout", PublicController.checkoutCart);

publicRouter.post("/cart/reorder", PublicController.reorderToCart);

publicRouter.get("/orders/track/:orderId", PublicController.trackOrder);

publicRouter.get("/qr/session/:sessionToken/bill", PublicController.getQrSessionBill);
publicRouter.get("/qr/session/:sessionToken/guests", PublicController.getQrSessionGuests);
publicRouter.post("/qr/session/:sessionToken/pay", PublicController.payQrSessionBill);
publicRouter.post("/qr/session/:sessionToken/bill/split", PublicController.splitQrSessionBill);
publicRouter.post("/qr/session/:sessionToken/feedback", PublicController.submitQrSessionFeedback);
publicRouter.get("/o/:outletSlug/coupons/validate", PublicController.validateCoupon);
publicRouter.get("/o/:outletSlug/coupons", PublicController.listOutletCoupons);

publicRouter.patch("/qr/guest/session", PublicController.updateGuestSession);
publicRouter.post("/qr/guest/session/leave", PublicController.leaveGuestSession);
publicRouter.post("/orders/:orderId/items/:itemId/cancel", PublicController.cancelOrderItem);

publicRouter.post("/contact", PublicController.submitContactForm);

export default publicRouter;
