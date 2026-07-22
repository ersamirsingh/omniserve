import { Types } from 'mongoose';
import Category, { ICategory } from "../../models/category.model.js";
import { OutletService } from "../outlet/outlet.service.js";
import { EventBusService } from "../../events/eventBus.js";

export class CategoryService {

  static async validateOutletOwnership(outletId: string, tenantId: string): Promise<boolean> {
    try {
      const outlet = await OutletService.getOutletById(outletId, tenantId);
      return !!outlet;
    } catch {
      return false;
    }
  }

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

    const saved = await category.save();

    EventBusService.publishMenuChanged(
      tenantId,
      saved.outletId,
      saved._id,
      "MENU_ITEM",
      saved,
      { createdBy: userId }
    ).catch(err => console.error('Failed to publish MENU_CHANGED event for category create:', err));

    return saved;
  }

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

  static async getCategoryById(id: string, tenantId: string): Promise<ICategory | null> {
    return await Category.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });
  }

  static async updateCategoryDetails(
    id: string,
    tenantId: string,
    data: any,
    userId?: string
  ): Promise<ICategory | null> {

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

    const updated = await Category.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      },
      updatePayload,
      { new: true }
    );

    if (updated) {
      EventBusService.publishMenuChanged(
        tenantId,
        updated.outletId,
        updated._id,
        "MENU_ITEM",
        updated,
        { createdBy: userId }
      ).catch(err => console.error('Failed to publish MENU_CHANGED event for category update:', err));
    }

    return updated;
  }

  static async updateCategoryOrder(
    id: string,
    tenantId: string,
    displayOrder: number,
    userId?: string
  ): Promise<ICategory | null> {
    const updated = await Category.findOneAndUpdate(
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

    if (updated) {
      EventBusService.publishMenuChanged(
        tenantId,
        updated.outletId,
        updated._id,
        "MENU_ITEM",
        updated,
        { createdBy: userId }
      ).catch(err => console.error('Failed to publish MENU_CHANGED event for category order update:', err));
    }

    return updated;
  }

  static async deleteCategory(
    id: string,
    tenantId: string,
    userId?: string
  ): Promise<ICategory | null> {
    const deleted = await Category.findOneAndUpdate(
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

    if (deleted) {
      EventBusService.publishMenuChanged(
        tenantId,
        deleted.outletId,
        deleted._id,
        "MENU_ITEM",
        deleted,
        { createdBy: userId }
      ).catch(err => console.error('Failed to publish MENU_CHANGED event for category delete:', err));
    }

    return deleted;
  }
}
