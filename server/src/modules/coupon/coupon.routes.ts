import express, { Router } from "express";
import { CouponController } from "./coupon.controller.js";
import { verifyToken, authorizeRole } from "../../middlewares/auth.middleware.js";
import { UserRole } from "../../models/enums.js";

const couponRouter: Router = express.Router();

couponRouter.use(verifyToken, authorizeRole(UserRole.SYSTEM_ADMIN, UserRole.SUPER_ADMIN, UserRole.RESTAURANT_OWNER, UserRole.OUTLET_MANAGER));

couponRouter.get("/", CouponController.listCoupons);
couponRouter.post("/", CouponController.createCoupon);
couponRouter.get("/:id", CouponController.getCouponById);
couponRouter.put("/:id", CouponController.updateCoupon);
couponRouter.delete("/:id", CouponController.deleteCoupon);

export default couponRouter;
