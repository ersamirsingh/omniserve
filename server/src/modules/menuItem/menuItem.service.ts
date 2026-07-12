import { Types } from 'mongoose';
import MenuItem, { IMenuItem } from "../../models/menuItem.model.js";
import Category from "../../models/category.model.js";
import Outlet from "../../models/outlet.model.js";
import Variant from "../../models/variant.model.js";
import Addon from "../../models/addon.model.js";
import { escapeRegex } from "../../utils/sanitize.utils.js";
import { EventBusService } from "../../events/eventBus.js";
import { CacheUtils } from "../../utils/cache.utils.js";

export class MenuItemService {
  /**
   * Helper to invalidate cache keys for a tenant/outlet
   */
  private static async invalidateCache(tenantId: string, outletId: string, itemId?: string): Promise<void> {
    try {
      const promises: Promise<void>[] = [
        CacheUtils.delPattern(`cache:menu_items:tenant:${tenantId}:outlet:${outletId}:*`),
        CacheUtils.delPattern(`cache:menu_items:tenant:${tenantId}:outlet:all:*`)
      ];
      if (itemId) {
        promises.push(CacheUtils.del(`cache:menu_item:details:${itemId}`));
      }
      await Promise.all(promises);
    } catch (err) {
      console.error("[MenuItemService] Cache invalidation failed:", err);
    }
  }

  /**
   * Validate that:
   * 1. The outlet exists and belongs to the tenant.
   * 2. The category exists and belongs to the target outlet (and tenant).
   */
  static async validateHierarchy(categoryId: string, outletId: string, tenantId: string): Promise<boolean> {
    try {
      const [category, outlet] = await Promise.all([
        Category.findOne({
          _id: new Types.ObjectId(categoryId),
          tenantId: new Types.ObjectId(tenantId),
          isDeleted: false,
        }),
        Outlet.findOne({
          _id: new Types.ObjectId(outletId),
          tenantId: new Types.ObjectId(tenantId),
          isDeleted: false,
        }),
      ]);

      if (!category || !outlet) {
        return false;
      }

      // Check if the category is assigned to the specified outlet
      return category.outletId.toString() === outletId;
    } catch {
      return false;
    }
  }

  /**
   * Create a new menu item
   */
  static async createMenuItem(
    tenantId: string,
    data: any,
    userId?: string
  ): Promise<IMenuItem> {
    const isHierarchyValid = await this.validateHierarchy(data.categoryId, data.outletId, tenantId);
    if (!isHierarchyValid) {
      throw new Error('Invalid Category or Outlet selection. Ensure the category belongs to the chosen outlet.');
    }

    const skuUpper = data.sku ? data.sku.trim().toUpperCase() : undefined;

    const menuItem = new MenuItem({
      ...data,
      sku: skuUpper,
      tenantId: new Types.ObjectId(tenantId),
      categoryId: new Types.ObjectId(data.categoryId),
      outletId: new Types.ObjectId(data.outletId),
      isDeleted: false,
      createdBy: userId ? new Types.ObjectId(userId) : null,
      updatedBy: userId ? new Types.ObjectId(userId) : null,
    });

    const saved = await menuItem.save();
    
    // Invalidate menu items cache for the tenant & outlet
    await this.invalidateCache(tenantId, saved.outletId.toString());

    await EventBusService.publishMenuChanged(
      tenantId,
      saved.outletId,
      saved._id,
      "MENU_ITEM",
      saved,
      { createdBy: userId }
    ).catch(err => console.error('Failed to publish MENU_CHANGED event:', err));

    return saved;
  }

  /**
   * List menu items with filters and text/regex search
   */
  static async getMenuItems(
    tenantId: string,
    filters: { limit: number; skip: number; search?: string; categoryId?: string; outletId?: string }
  ): Promise<{ menuItems: IMenuItem[]; total: number }> {
    const outletIdStr = filters.outletId || 'all';
    const categoryIdStr = filters.categoryId || 'all';
    const searchStr = filters.search ? encodeURIComponent(filters.search) : 'none';
    const cacheKey = `cache:menu_items:tenant:${tenantId}:outlet:${outletIdStr}:cat:${categoryIdStr}:search:${searchStr}:limit:${filters.limit}:skip:${filters.skip}`;

    const cached = await CacheUtils.get<{ menuItems: IMenuItem[]; total: number }>(cacheKey);
    if (cached) {
      return cached;
    }

    const query: any = {
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    };

    if (filters.categoryId) {
      query.categoryId = new Types.ObjectId(filters.categoryId);
    }

    if (filters.outletId) {
      query.outletId = new Types.ObjectId(filters.outletId);
    }

    if (filters.search) {
      const safeSearch = escapeRegex(filters.search);
      query.$or = [
        { name: { $regex: new RegExp(safeSearch, 'i') } },
        { description: { $regex: new RegExp(safeSearch, 'i') } },
      ];
    }

    const menuItems = await MenuItem.find(query)
      .sort({ displayOrder: 1, createdAt: -1 })
      .limit(filters.limit)
      .skip(filters.skip);

    const total = await MenuItem.countDocuments(query);

    const result = { menuItems, total };
    
    // Cache the result for 1 hour (3600 seconds)
    await CacheUtils.set(cacheKey, result, 3600);

    return result;
  }

  /**
   * Get menu item by ID, with associated child variants and addons populated
   */
  static async getMenuItemWithDetails(
    id: string,
    tenantId: string
  ): Promise<{ menuItem: IMenuItem; variants: any[]; addons: any[] } | null> {
    const cacheKey = `cache:menu_item:details:${id}`;
    const cached = await CacheUtils.get<{ menuItem: IMenuItem; variants: any[]; addons: any[] }>(cacheKey);
    if (cached) {
      return cached;
    }

    const menuItem = await MenuItem.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!menuItem) {
      return null;
    }

    const [variants, addons] = await Promise.all([
      Variant.find({
        menuItemId: menuItem._id,
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      }).sort({ createdAt: 1 }),
      Addon.find({
        menuItemId: menuItem._id,
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      }).sort({ createdAt: 1 }),
    ]);

    const result = {
      menuItem,
      variants,
      addons,
    };

    // Cache the result for 1 hour (3600 seconds)
    await CacheUtils.set(cacheKey, result, 3600);

    return result;
  }

  static async getMenuItemById(id: string, tenantId: string): Promise<IMenuItem | null> {
    return MenuItem.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });
  }

  /**
   * Update menu item details (PUT operation replacing details)
   */
  static async updateMenuItemDetails(
    id: string,
    tenantId: string,
    data: any,
    userId?: string
  ): Promise<IMenuItem | null> {
    // If either hierarchy ID is being updated, validate the new relationship
    if (data.categoryId || data.outletId) {
      const currentItem = await MenuItem.findOne({ _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId), isDeleted: false });
      if (!currentItem) {
        return null;
      }
      const finalCategoryId = data.categoryId || currentItem.categoryId.toString();
      const finalOutletId = data.outletId || currentItem.outletId.toString();

      const isHierarchyValid = await this.validateHierarchy(finalCategoryId, finalOutletId, tenantId);
      if (!isHierarchyValid) {
        throw new Error('Invalid Category or Outlet selection. Ensure the category belongs to the chosen outlet.');
      }
    }

    const skuUpper = data.sku ? data.sku.trim().toUpperCase() : undefined;

    const updatePayload: any = {
      name: data.name,
      price: data.price,
      description: data.description,
      image: data.image,
      sku: skuUpper,
      isVeg: data.isVeg !== undefined ? !!data.isVeg : true,
      isAvailable: data.isAvailable !== undefined ? !!data.isAvailable : true,
      displayOrder: data.displayOrder !== undefined ? Number(data.displayOrder) : 0,
      updatedBy: userId ? new Types.ObjectId(userId) : null,
    };

    if (data.categoryId) updatePayload.categoryId = new Types.ObjectId(data.categoryId);
    if (data.outletId) updatePayload.outletId = new Types.ObjectId(data.outletId);

    const updated = await MenuItem.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      },
      updatePayload,
      { new: true }
    );

    if (updated) {
      // Invalidate cache for old and new outlets
      await this.invalidateCache(tenantId, updated.outletId.toString(), id);
      if (data.outletId && data.outletId !== updated.outletId.toString()) {
        await this.invalidateCache(tenantId, data.outletId);
      }

      await EventBusService.publishMenuChanged(
        tenantId,
        updated.outletId,
        updated._id,
        "MENU_ITEM",
        updated,
        { createdBy: userId }
      ).catch(err => console.error('Failed to publish MENU_CHANGED event (update):', err));
    }

    return updated;
  }

  /**
   * Toggle menu item availability status
   */
  static async updateAvailabilityStatus(
    id: string,
    tenantId: string,
    isAvailable: boolean,
    userId?: string
  ): Promise<IMenuItem | null> {
    const updated = await MenuItem.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      },
      {
        isAvailable,
        updatedBy: userId ? new Types.ObjectId(userId) : null,
      },
      { new: true }
    );

    if (updated) {
      // Invalidate cache
      await this.invalidateCache(tenantId, updated.outletId.toString(), id);

      await EventBusService.publishMenuChanged(
        tenantId,
        updated.outletId,
        updated._id,
        "MENU_ITEM",
        updated,
        { createdBy: userId }
      ).catch(err => console.error('Failed to publish MENU_CHANGED event (toggle):', err));
    }

    return updated;
  }

  /**
   * Soft-delete a menu item and cascade soft-deletes to variants and addons
   */
  static async deleteMenuItem(
    id: string,
    tenantId: string,
    userId?: string
  ): Promise<IMenuItem | null> {
    const deletedMenuItem = await MenuItem.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      },
      {
        isDeleted: true,
        isAvailable: false,
        updatedBy: userId ? new Types.ObjectId(userId) : null,
      },
      { new: true }
    );

    if (!deletedMenuItem) {
      return null;
    }

    // Cascade soft delete to associated variants and addons under the same tenant
    const updaterUser = userId ? new Types.ObjectId(userId) : null;
    await Promise.all([
      Variant.updateMany(
        {
          menuItemId: deletedMenuItem._id,
          tenantId: new Types.ObjectId(tenantId),
          isDeleted: false,
        },
        {
          isDeleted: true,
          isAvailable: false,
          updatedBy: updaterUser,
        }
      ),
      Addon.updateMany(
        {
          menuItemId: deletedMenuItem._id,
          tenantId: new Types.ObjectId(tenantId),
          isDeleted: false,
        },
        {
          isDeleted: true,
          isAvailable: false,
          updatedBy: updaterUser,
        }
      ),
    ]);

    if (deletedMenuItem) {
      // Invalidate cache
      await this.invalidateCache(tenantId, deletedMenuItem.outletId.toString(), id);

      await EventBusService.publishMenuChanged(
        tenantId,
        deletedMenuItem.outletId,
        deletedMenuItem._id,
        "MENU_ITEM",
        deletedMenuItem,
        { createdBy: userId }
      ).catch(err => console.error('Failed to publish MENU_CHANGED event (delete):', err));
    }

    return deletedMenuItem;
  }
}
