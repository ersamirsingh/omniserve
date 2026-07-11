import { Types } from "mongoose";
import Coupon, { ICoupon } from "../../models/coupon.model.js";

export class CouponService {
  /**
   * Validate a coupon code and calculate the discount amount
   */
  static async validateCoupon(
    tenantId: string,
    outletId: string | null,
    code: string,
    subtotal: number
  ): Promise<{ isValid: boolean; discount: number; reason?: string; coupon?: ICoupon }> {
    const formattedCode = code.trim().toUpperCase();

    // Query active coupon matching code under tenant
    const query: any = {
      tenantId: new Types.ObjectId(tenantId),
      code: formattedCode,
      isActive: true,
      isDeleted: false,
    };

    // If outletId is specified, check coupon valid for either this specific outlet OR valid globally (outletId is null)
    if (outletId) {
      query.$or = [
        { outletId: new Types.ObjectId(outletId) },
        { outletId: null }
      ];
    } else {
      query.outletId = null;
    }

    const coupon = await Coupon.findOne(query);

    if (!coupon) {
      return { isValid: false, discount: 0, reason: "Invalid coupon code" };
    }

    // Check expiration date
    if (coupon.expirationDate && coupon.expirationDate < new Date()) {
      return { isValid: false, discount: 0, reason: "Coupon has expired" };
    }

    // Check minimum order amount requirement
    if (subtotal < coupon.minOrderAmount) {
      return {
        isValid: false,
        discount: 0,
        reason: `Minimum order amount of ₹${coupon.minOrderAmount} is required for this coupon`,
      };
    }

    // Calculate discount value
    let discount = 0;
    if (coupon.discountType === "FLAT") {
      discount = coupon.discountValue;
    } else if (coupon.discountType === "PERCENTAGE") {
      discount = subtotal * (coupon.discountValue / 100);
      if (coupon.maxDiscountAmount !== null && coupon.maxDiscountAmount !== undefined) {
        discount = Math.min(discount, coupon.maxDiscountAmount);
      }
    }

    // Discount cannot exceed subtotal
    discount = Math.min(discount, subtotal);
    // Round to 2 decimal places
    discount = Number(discount.toFixed(2));

    return { isValid: true, discount, coupon };
  }

  /**
   * Create a new coupon
   */
  static async createCoupon(
    tenantId: string,
    data: any,
    userId?: string
  ): Promise<ICoupon> {
    const formattedCode = data.code.trim().toUpperCase();

    // Check code conflict
    const conflictQuery: any = {
      tenantId: new Types.ObjectId(tenantId),
      code: formattedCode,
      isDeleted: false,
    };
    if (data.outletId) {
      conflictQuery.outletId = new Types.ObjectId(data.outletId);
    } else {
      conflictQuery.outletId = null;
    }

    const existing = await Coupon.findOne(conflictQuery);
    if (existing) {
      throw new Error(`A coupon with code "${formattedCode}" already exists for this scope`);
    }

    const coupon = new Coupon({
      tenantId: new Types.ObjectId(tenantId),
      outletId: data.outletId ? new Types.ObjectId(data.outletId) : null,
      code: formattedCode,
      discountType: data.discountType,
      discountValue: Number(data.discountValue),
      minOrderAmount: Number(data.minOrderAmount || 0),
      maxDiscountAmount: data.maxDiscountAmount ? Number(data.maxDiscountAmount) : null,
      expirationDate: data.expirationDate ? new Date(data.expirationDate) : null,
      isActive: data.isActive !== undefined ? data.isActive : true,
      createdBy: userId ? new Types.ObjectId(userId) : null,
      updatedBy: userId ? new Types.ObjectId(userId) : null,
    });

    return await coupon.save();
  }

  /**
   * List coupons scoped to tenant and optionally outlet
   */
  static async getCoupons(
    tenantId: string,
    filters: { outletId?: string | undefined; isActive?: boolean | undefined } = {}
  ): Promise<ICoupon[]> {
    const query: any = {
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    };

    if (filters.outletId) {
      query.$or = [
        { outletId: new Types.ObjectId(filters.outletId) },
        { outletId: null }
      ];
    }
    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    return await Coupon.find(query).sort({ createdAt: -1 });
  }

  /**
   * Get coupon details by ID
   */
  static async getCouponById(
    couponId: string,
    tenantId: string
  ): Promise<ICoupon | null> {
    return await Coupon.findOne({
      _id: new Types.ObjectId(couponId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });
  }

  /**
   * Update an existing coupon
   */
  static async updateCoupon(
    tenantId: string,
    couponId: string,
    data: any,
    userId?: string
  ): Promise<ICoupon | null> {
    const coupon = await Coupon.findOne({
      _id: new Types.ObjectId(couponId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!coupon) return null;

    if (data.code) {
      const formattedCode = data.code.trim().toUpperCase();
      // Check code conflict if code is changing
      if (formattedCode !== coupon.code) {
        const conflictQuery: any = {
          tenantId: new Types.ObjectId(tenantId),
          code: formattedCode,
          isDeleted: false,
          _id: { $ne: coupon._id },
        };
        const targetOutletId = data.outletId !== undefined ? data.outletId : coupon.outletId;
        if (targetOutletId) {
          conflictQuery.outletId = new Types.ObjectId(targetOutletId);
        } else {
          conflictQuery.outletId = null;
        }

        const existing = await Coupon.findOne(conflictQuery);
        if (existing) {
          throw new Error(`A coupon with code "${formattedCode}" already exists for this scope`);
        }
        coupon.code = formattedCode;
      }
    }

    if (data.outletId !== undefined) {
      coupon.outletId = data.outletId ? new Types.ObjectId(data.outletId) : null;
    }
    if (data.discountType !== undefined) {
      coupon.discountType = data.discountType;
    }
    if (data.discountValue !== undefined) {
      coupon.discountValue = Number(data.discountValue);
    }
    if (data.minOrderAmount !== undefined) {
      coupon.minOrderAmount = Number(data.minOrderAmount);
    }
    if (data.maxDiscountAmount !== undefined) {
      coupon.maxDiscountAmount = data.maxDiscountAmount ? Number(data.maxDiscountAmount) : null;
    }
    if (data.expirationDate !== undefined) {
      coupon.expirationDate = data.expirationDate ? new Date(data.expirationDate) : null;
    }
    if (data.isActive !== undefined) {
      coupon.isActive = data.isActive;
    }
    if (userId) {
      coupon.updatedBy = new Types.ObjectId(userId);
    }

    return await coupon.save();
  }

  /**
   * Soft-delete a coupon
   */
  static async deleteCoupon(
    couponId: string,
    tenantId: string,
    userId?: string
  ): Promise<ICoupon | null> {
    const coupon = await Coupon.findOne({
      _id: new Types.ObjectId(couponId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!coupon) return null;

    coupon.isDeleted = true;
    if (userId) {
      coupon.updatedBy = new Types.ObjectId(userId);
    }

    return await coupon.save();
  }
}
