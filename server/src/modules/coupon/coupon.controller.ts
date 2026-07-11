import { Request, Response } from "express";
import { Types } from "mongoose";
import { CouponService } from "./coupon.service.js";
import { ApiResponseHandler } from "../../utils/apiResponse.js";

export class CouponController {
  /**
   * Create a new Coupon
   * POST /coupons
   */
  static async createCoupon(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        ApiResponseHandler.unauthorized(res, "User not authenticated or tenantId not found");
        return;
      }

      const { code, discountType, discountValue, outletId, minOrderAmount, maxDiscountAmount, expirationDate, isActive } = req.body;

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

      if (outletId && !Types.ObjectId.isValid(outletId)) {
        ApiResponseHandler.badRequest(res, "Invalid outletId format");
        return;
      }

      const coupon = await CouponService.createCoupon(
        req.user.tenantId,
        {
          code,
          discountType,
          discountValue,
          outletId,
          minOrderAmount,
          maxDiscountAmount,
          expirationDate,
          isActive,
        },
        req.user.userId
      );

      ApiResponseHandler.success(res, 201, "Coupon created successfully", coupon);
    } catch (error: any) {
      ApiResponseHandler.badRequest(res, error.message || "Failed to create coupon");
    }
  }

  /**
   * List coupons
   * GET /coupons
   */
  static async listCoupons(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        ApiResponseHandler.unauthorized(res, "User not authenticated or tenantId not found");
        return;
      }

      const outletId = req.query.outletId as string | undefined;
      const isActive = req.query.isActive !== undefined ? req.query.isActive === "true" : undefined;

      const coupons = await CouponService.getCoupons(req.user.tenantId, { outletId, isActive });
      ApiResponseHandler.success(res, 200, "Coupons retrieved successfully", coupons);
    } catch (error: any) {
      ApiResponseHandler.badRequest(res, error.message || "Failed to list coupons");
    }
  }

  /**
   * Get coupon details
   * GET /coupons/:id
   */
  static async getCouponById(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        ApiResponseHandler.unauthorized(res, "User not authenticated or tenantId not found");
        return;
      }

      const coupon = await CouponService.getCouponById(req.params.id as string, req.user.tenantId as string);
      if (!coupon) {
        ApiResponseHandler.notFound(res, "Coupon not found");
        return;
      }

      ApiResponseHandler.success(res, 200, "Coupon retrieved successfully", coupon);
    } catch (error: any) {
      ApiResponseHandler.badRequest(res, error.message || "Failed to get coupon details");
    }
  }

  /**
   * Update coupon details
   * PUT /coupons/:id
   */
  static async updateCoupon(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        ApiResponseHandler.unauthorized(res, "User not authenticated or tenantId not found");
        return;
      }

      const coupon = await CouponService.updateCoupon(
        req.user.tenantId as string,
        req.params.id as string,
        req.body,
        req.user.userId as string
      );

      if (!coupon) {
        ApiResponseHandler.notFound(res, "Coupon not found");
        return;
      }

      ApiResponseHandler.success(res, 200, "Coupon updated successfully", coupon);
    } catch (error: any) {
      ApiResponseHandler.badRequest(res, error.message || "Failed to update coupon");
    }
  }

  /**
   * Delete a coupon
   * DELETE /coupons/:id
   */
  static async deleteCoupon(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        ApiResponseHandler.unauthorized(res, "User not authenticated or tenantId not found");
        return;
      }

      const coupon = await CouponService.deleteCoupon(req.params.id as string, req.user.tenantId as string, req.user.userId as string);
      if (!coupon) {
        ApiResponseHandler.notFound(res, "Coupon not found");
        return;
      }

      ApiResponseHandler.success(res, 200, "Coupon deleted successfully", coupon);
    } catch (error: any) {
      ApiResponseHandler.badRequest(res, error.message || "Failed to delete coupon");
    }
  }
}
