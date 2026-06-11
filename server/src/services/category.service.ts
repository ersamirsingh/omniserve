import { Types } from 'mongoose';
import Category, { ICategory } from '../models/category.model.js';
import { OutletService } from './outlet.service.js';

export class CategoryService {
  /**
   * Validate that the outlet exists, belongs to the tenant, and is active (not soft-deleted)
   */
  static async validateOutletOwnership(outletId: string, tenantId: string): Promise<boolean> {
    try {
      const outlet = await OutletService.getOutletById(outletId, tenantId);
      return !!outlet;
    } catch {
      return false;
    }
  }

  /**
   * Create a new category under an outlet
   */
  static async createCategory(
    tenantId: string,
    data: any,
    userId?: string
  ): Promise<ICategory> {
    const isOwner = await this.validateOutletOwnership(data.outletId, tenantId);
    if (!isOwner) {
      throw new Error('Outlet not found or does not belong to this tenant');
    }

    const category = new Category({
      ...data,
      outletId: new Types.ObjectId(data.outletId),
      tenantId: new Types.ObjectId(tenantId),
      isActive: true,
      isDeleted: false,
      createdBy: userId ? new Types.ObjectId(userId) : null,
      updatedBy: userId ? new Types.ObjectId(userId) : null,
    });

    return await category.save();
  }

  /**
   * List categories for a tenant/outlet with pagination and sorted by displayOrder
   */
  static async getCategories(
    tenantId: string,
    filters: { outletId?: string; limit: number; skip: number }
  ): Promise<{ categories: ICategory[]; total: number }> {
    const query: any = {
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    };

    if (filters.outletId) {
      query.outletId = new Types.ObjectId(filters.outletId);
    }

    const categories = await Category.find(query)
      .sort({ displayOrder: 1, createdAt: -1 })
      .limit(filters.limit)
      .skip(filters.skip);

    const total = await Category.countDocuments(query);

    return { categories, total };
  }

  /**
   * Get a category by ID and Tenant ID
   */
  static async getCategoryById(id: string, tenantId: string): Promise<ICategory | null> {
    return await Category.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });
  }

  /**
   * Update category details (PUT replacement)
   */
  static async updateCategoryDetails(
    id: string,
    tenantId: string,
    data: any,
    userId?: string
  ): Promise<ICategory | null> {
    // If outletId is changing, validate it first
    if (data.outletId) {
      const isOwner = await this.validateOutletOwnership(data.outletId, tenantId);
      if (!isOwner) {
        throw new Error('Outlet not found or does not belong to this tenant');
      }
    }

    const updatePayload: any = {
      name: data.name,
      displayOrder: data.displayOrder,
      isActive: data.isActive !== undefined ? !!data.isActive : true,
      updatedBy: userId ? new Types.ObjectId(userId) : null,
    };

    if (data.outletId) {
      updatePayload.outletId = new Types.ObjectId(data.outletId);
    }

    return await Category.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      },
      updatePayload,
      { new: true }
    );
  }

  /**
   * Update category display order
   */
  static async updateCategoryOrder(
    id: string,
    tenantId: string,
    displayOrder: number,
    userId?: string
  ): Promise<ICategory | null> {
    return await Category.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      },
      {
        displayOrder,
        updatedBy: userId ? new Types.ObjectId(userId) : null,
      },
      { new: true }
    );
  }

  /**
   * Soft-delete a category
   */
  static async deleteCategory(
    id: string,
    tenantId: string,
    userId?: string
  ): Promise<ICategory | null> {
    return await Category.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      },
      {
        isDeleted: true,
        isActive: false,
        updatedBy: userId ? new Types.ObjectId(userId) : null,
      },
      { new: true }
    );
  }
}
