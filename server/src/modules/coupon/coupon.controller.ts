import { Request, Response } from "express";
import { CouponService } from "./coupon.service.js";
import { ApiResponseHandler } from "../../utils/apiResponse.js";

export class CouponController {

  static async createCoupon(req: Request, res: Response): Promise<void> {
    try {
      const {
        code,
        discountType,
        discountValue,
        minAmount,
        minOrderAmount,
        maxDiscountAmount,
        expirationDate,
        isActive,
      } = req.body;

      if (!code || !discountType || discountValue === undefined) {
        ApiResponseHandler.badRequest(res, "code, discountType, and discountValue are required");
        return;
      }

      if (discountType !== "PERCENTAGE" && discountType !== "FLAT") {
        ApiResponseHandler.badRequest(res, "discountType must be PERCENTAGE or FLAT");
        return;
      }

      if (isNaN(Number(discountValue)) || Number(discountValue) < 0) {
        ApiResponseHandler.badRequest(res, "discountValue must be a positive number");
        return;
      }

      const resolvedMinAmount = minAmount !== undefined ? minAmount : minOrderAmount;

      let tenantId = req.user?.tenantId ? req.user.tenantId : null;
      let outletId = req.user?.outletId ? req.user.outletId : null;

      if (req.user?.role === "SUPER_ADMIN" || req.user?.role === "RESTAURANT_OWNER") {
        if (req.body.outletId) {
          outletId = req.body.outletId;
        }
      } else if (req.user?.role === "SYSTEM_ADMIN") {
        if (req.body.tenantId) {
          tenantId = req.body.tenantId;
        }
        if (req.body.outletId) {
          outletId = req.body.outletId;
        }
      }

      const coupon = await CouponService.createCoupon(
        {
          tenantId,
          outletId,
          code,
          discountType,
          discountValue,
          minAmount: resolvedMinAmount,
          maxDiscountAmount,
          expirationDate,
          isActive,
        },
        req.user?.userId
      );

      ApiResponseHandler.success(res, 201, "Coupon created successfully", coupon);
    } catch (error: any) {
      ApiResponseHandler.badRequest(res, error.message || "Failed to create coupon");
    }
  }

  static async listCoupons(req: Request, res: Response): Promise<void> {
    try {
      const isActive = req.query.isActive !== undefined ? req.query.isActive === "true" : undefined;

      const coupons = await CouponService.getCoupons({
        isActive,
        tenantId: req.user?.tenantId,
        outletId: req.user?.outletId,
        role: req.user?.role
      });
      ApiResponseHandler.success(res, 200, "Coupons retrieved successfully", coupons);
    } catch (error: any) {
      ApiResponseHandler.badRequest(res, error.message || "Failed to list coupons");
    }
  }

  static async getCouponById(req: Request, res: Response): Promise<void> {
    try {
      const coupon = await CouponService.getCouponById(req.params.id as string);
      if (!coupon) {
        ApiResponseHandler.notFound(res, "Coupon not found");
        return;
      }

      if (req.user?.role !== "SYSTEM_ADMIN") {
        if (coupon.tenantId?.toString() !== req.user?.tenantId?.toString()) {
          ApiResponseHandler.forbidden(res, "Access denied to this coupon");
          return;
        }
        if (req.user?.role === "OUTLET_MANAGER" && coupon.outletId && coupon.outletId.toString() !== req.user?.outletId?.toString()) {
          ApiResponseHandler.forbidden(res, "Access denied to this outlet's coupon");
          return;
        }
      }

      ApiResponseHandler.success(res, 200, "Coupon retrieved successfully", coupon);
    } catch (error: any) {
      ApiResponseHandler.badRequest(res, error.message || "Failed to get coupon details");
    }
  }

  static async updateCoupon(req: Request, res: Response): Promise<void> {
    try {
      const coupon = await CouponService.getCouponById(req.params.id as string);
      if (!coupon) {
        ApiResponseHandler.notFound(res, "Coupon not found");
        return;
      }

      if (req.user?.role !== "SYSTEM_ADMIN") {
        if (coupon.tenantId?.toString() !== req.user?.tenantId?.toString()) {
          ApiResponseHandler.forbidden(res, "Access denied to this coupon");
          return;
        }
        if (req.user?.role === "OUTLET_MANAGER" && coupon.outletId && coupon.outletId.toString() !== req.user?.outletId?.toString()) {
          ApiResponseHandler.forbidden(res, "Access denied to this outlet's coupon");
          return;
        }
      }

      const { minAmount, minOrderAmount } = req.body;
      const data = { ...req.body };
      if (minAmount !== undefined) {
        data.minAmount = minAmount;
      } else if (minOrderAmount !== undefined) {
        data.minAmount = minOrderAmount;
      }

      const updated = await CouponService.updateCoupon(
        req.params.id as string,
        data,
        req.user?.userId as string
      );

      ApiResponseHandler.success(res, 200, "Coupon updated successfully", updated);
    } catch (error: any) {
      ApiResponseHandler.badRequest(res, error.message || "Failed to update coupon");
    }
  }

  static async deleteCoupon(req: Request, res: Response): Promise<void> {
    try {
      const coupon = await CouponService.getCouponById(req.params.id as string);
      if (!coupon) {
        ApiResponseHandler.notFound(res, "Coupon not found");
        return;
      }

      if (req.user?.role !== "SYSTEM_ADMIN") {
        if (coupon.tenantId?.toString() !== req.user?.tenantId?.toString()) {
          ApiResponseHandler.forbidden(res, "Access denied to this coupon");
          return;
        }
        if (req.user?.role === "OUTLET_MANAGER" && coupon.outletId && coupon.outletId.toString() !== req.user?.outletId?.toString()) {
          ApiResponseHandler.forbidden(res, "Access denied to this outlet's coupon");
          return;
        }
      }

      const deleted = await CouponService.deleteCoupon(
        req.params.id as string,
        req.user?.userId as string
      );

      ApiResponseHandler.success(res, 200, "Coupon deleted successfully", deleted);
    } catch (error: any) {
      ApiResponseHandler.badRequest(res, error.message || "Failed to delete coupon");
    }
  }
}
