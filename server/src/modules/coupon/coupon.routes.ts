import express, { Router } from "express";
import { CouponController } from "./coupon.controller.js";
import { verifyToken, isRestaurantOwner } from "../../middlewares/auth.middleware.js";

const couponRouter: Router = express.Router();

couponRouter.get("/", verifyToken, isRestaurantOwner, CouponController.listCoupons);
couponRouter.post("/", verifyToken, isRestaurantOwner, CouponController.createCoupon);
couponRouter.get("/:id", verifyToken, isRestaurantOwner, CouponController.getCouponById);
couponRouter.put("/:id", verifyToken, isRestaurantOwner, CouponController.updateCoupon);
couponRouter.delete("/:id", verifyToken, isRestaurantOwner, CouponController.deleteCoupon);

export default couponRouter;
