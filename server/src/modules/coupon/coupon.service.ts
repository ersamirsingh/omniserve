import { Types } from "mongoose";
import Coupon, { ICoupon } from "../../models/coupon.model.js";

export class CouponService {
  /**
   * Validate a coupon code and calculate the discount amount for a system subscription
   */
  static async validateSubscriptionCoupon(
    code: string,
    subtotal: number
  ): Promise<{ isValid: boolean; discount: number; reason?: string; coupon?: ICoupon }> {
    const formattedCode = code.trim().toUpperCase();

    // Query active coupon matching code globally (System Admin coupons have tenantId = null)
    const coupon = await Coupon.findOne({
      tenantId: null,
      code: formattedCode,
      isActive: true,
      isDeleted: false,
    });

    if (!coupon) {
      return { isValid: false, discount: 0, reason: "Invalid coupon code" };
    }

    // Check expiration date
    if (coupon.expirationDate && coupon.expirationDate < new Date()) {
      return { isValid: false, discount: 0, reason: "Coupon has expired" };
    }

    // Check minimum subscription subtotal requirement
    const minAmt = coupon.minAmount || 0;
    if (subtotal < minAmt) {
      return {
        isValid: false,
        discount: 0,
        reason: `Minimum subscription amount of ₹${minAmt} is required for this coupon`,
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
   * Validate coupon code for order checkouts (checking active status, expiration, and minimum spend)
   */
  static async validateCoupon(
    tenantId: string,
    outletId: string | null,
    code: string,
    subtotal: number
  ): Promise<{ isValid: boolean; discount: number; reason?: string; coupon?: ICoupon }> {
    const formattedCode = code.trim().toUpperCase();

    // Query active coupon matching code for this tenant (or global System Admin coupons where tenantId is null)
    const query: any = {
      tenantId: { $in: [new Types.ObjectId(tenantId), null] },
      code: formattedCode,
      isActive: true,
      isDeleted: false,
    };

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

    // Check minimum order subtotal requirement
    const minAmt = coupon.minAmount || 0;
    if (subtotal < minAmt) {
      return {
        isValid: false,
        discount: 0,
        reason: `Minimum order amount of ₹${minAmt} is required for this coupon`,
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
   * Create a new coupon (Global - System Admin)
   */
  static async createCoupon(
    data: any,
    userId?: string
  ): Promise<ICoupon> {
    const formattedCode = data.code.trim().toUpperCase();
    const tenantIdObj = data.tenantId ? new Types.ObjectId(data.tenantId) : null;
    const outletIdObj = data.outletId ? new Types.ObjectId(data.outletId) : null;

    // Check code conflict for non-deleted coupons scoped by tenant
    const existing = await Coupon.findOne({
      tenantId: tenantIdObj,
      code: formattedCode,
      isDeleted: false,
    });

    if (existing) {
      throw new Error(`A coupon with code "${formattedCode}" already exists`);
    }

    const coupon = new Coupon({
      tenantId: tenantIdObj,
      outletId: outletIdObj,
      code: formattedCode,
      discountType: data.discountType,
      discountValue: Number(data.discountValue),
      minAmount: Number(data.minAmount || 0),
      maxDiscountAmount: data.maxDiscountAmount ? Number(data.maxDiscountAmount) : null,
      expirationDate: data.expirationDate ? new Date(data.expirationDate) : null,
      isActive: data.isActive !== undefined ? data.isActive : true,
      createdBy: userId ? new Types.ObjectId(userId) : null,
      updatedBy: userId ? new Types.ObjectId(userId) : null,
    });

    return await coupon.save();
  }

  /**
   * List coupons globally or scoped by tenant/outlet
   */
  static async getCoupons(
    filters: { isActive?: boolean | undefined; tenantId?: any; outletId?: any; role?: string | undefined } = {}
  ): Promise<ICoupon[]> {
    const query: any = {
      isDeleted: false,
    };

    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    if (filters.role !== "SYSTEM_ADMIN") {
      if (filters.tenantId) {
        query.tenantId = new Types.ObjectId(filters.tenantId);
      }
      if (filters.role === "OUTLET_MANAGER" && filters.outletId) {
        query.$or = [
          { outletId: new Types.ObjectId(filters.outletId) },
          { outletId: null }
        ];
      } else if (filters.outletId) {
        query.outletId = new Types.ObjectId(filters.outletId);
      }
    }

    return await Coupon.find(query).sort({ createdAt: -1 });
  }

  /**
   * Get coupon details by ID
   */
  static async getCouponById(
    couponId: string
  ): Promise<ICoupon | null> {
    return await Coupon.findOne({
      _id: new Types.ObjectId(couponId),
      isDeleted: false,
    });
  }

  /**
   * Update an existing coupon (Global - System Admin)
   */
  static async updateCoupon(
    couponId: string,
    data: any,
    userId?: string
  ): Promise<ICoupon | null> {
    const coupon = await Coupon.findOne({
      _id: new Types.ObjectId(couponId),
      isDeleted: false,
    });

    if (!coupon) return null;

    if (data.code) {
      const formattedCode = data.code.trim().toUpperCase();
      if (formattedCode !== coupon.code) {
        const existing = await Coupon.findOne({
          code: formattedCode,
          isDeleted: false,
          _id: { $ne: coupon._id },
        });
        if (existing) {
          throw new Error(`A coupon with code "${formattedCode}" already exists`);
        }
        coupon.code = formattedCode;
      }
    }

    if (data.discountType !== undefined) {
      coupon.discountType = data.discountType;
    }
    if (data.discountValue !== undefined) {
      coupon.discountValue = Number(data.discountValue);
    }
    if (data.minAmount !== undefined) {
      coupon.minAmount = Number(data.minAmount);
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
   * Soft-delete a coupon (Global - System Admin)
   */
  static async deleteCoupon(
    couponId: string,
    userId?: string
  ): Promise<ICoupon | null> {
    const coupon = await Coupon.findOne({
      _id: new Types.ObjectId(couponId),
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
