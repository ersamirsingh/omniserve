import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { MenuItemService } from "./menuItem.service.js";
import { ApiResponseHandler } from "../../utils/apiResponse.js";
import { AccessScope } from "../../utils/accessScope.utils.js";

export class MenuItemController {
  /**
   * Create a new menu item
   * POST /menu-items
   */
  static async createMenuItem(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
        return;
      }

      const {
        categoryId,
        outletId,
        name,
        price,
        description,
        image,
        sku,
        isVeg,
        isAvailable,
        displayOrder,
      } = req.body;

      // Validate required fields
      if (!categoryId || !outletId || !name || price === undefined) {
        ApiResponseHandler.badRequest(res, 'categoryId, outletId, name, and price are required');
        return;
      }

      // Validate ObjectIds format
      if (!Types.ObjectId.isValid(categoryId) || !Types.ObjectId.isValid(outletId)) {
        ApiResponseHandler.badRequest(res, 'Invalid categoryId or outletId format');
        return;
      }

      if (!(await AccessScope.canAccessOutlet(req.user, outletId))) {
        ApiResponseHandler.forbidden(res, 'You cannot create menu items for this outlet');
        return;
      }

      // Validate name
      if (typeof name !== 'string' || name.trim().length === 0) {
        ApiResponseHandler.badRequest(res, 'name must be a non-empty string');
        return;
      }
      if (name.length > 150) {
        ApiResponseHandler.badRequest(res, 'Name cannot exceed 150 characters');
        return;
      }

      // Validate price
      const numPrice = Number(price);
      if (isNaN(numPrice) || numPrice < 0) {
        ApiResponseHandler.badRequest(res, 'Price cannot be negative');
        return;
      }

      // Validate description if provided
      if (description && (typeof description !== 'string' || description.length > 500)) {
        ApiResponseHandler.badRequest(res, 'Description cannot exceed 500 characters');
        return;
      }

      // Validate SKU if provided
      if (sku) {
        if (typeof sku !== 'string' || sku.length > 50) {
          ApiResponseHandler.badRequest(res, 'SKU cannot exceed 50 characters');
          return;
        }
      }

      // Validate displayOrder if provided
      let parsedDisplayOrder = 0;
      if (displayOrder !== undefined) {
        parsedDisplayOrder = Number(displayOrder);
        if (isNaN(parsedDisplayOrder) || parsedDisplayOrder < 0) {
          ApiResponseHandler.badRequest(res, 'displayOrder must be a non-negative number');
          return;
        }
      }

      const menuItemData = {
        categoryId,
        outletId,
        name: name.trim(),
        price: numPrice,
        description: description ? description.trim() : undefined,
        image: image ? image.trim() : undefined,
        sku: sku ? sku.trim() : undefined,
        isVeg: isVeg !== undefined ? !!isVeg : true,
        isAvailable: isAvailable !== undefined ? !!isAvailable : true,
        displayOrder: parsedDisplayOrder,
      };

      const menuItem = await MenuItemService.createMenuItem(
        req.user.tenantId,
        menuItemData,
        req.user.userId
      );

      ApiResponseHandler.success(res, 201, 'Menu item created successfully', {
        id: menuItem._id,
        categoryId: menuItem.categoryId,
        outletId: menuItem.outletId,
        tenantId: menuItem.tenantId,
        name: menuItem.name,
        price: menuItem.price,
        description: menuItem.description,
        image: menuItem.image,
        sku: menuItem.sku,
        isVeg: menuItem.isVeg,
        isAvailable: menuItem.isAvailable,
        displayOrder: menuItem.displayOrder,
        createdAt: menuItem.createdAt,
        updatedAt: menuItem.updatedAt,
      });
    } catch (error: any) {
      ApiResponseHandler.badRequest(res, error.message || 'Failed to create menu item');
    }
  }

  /**
   * List menu items for a tenant/outlet
   * GET /menu-items
   */
  static async listMenuItems(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
        return;
      }

      const categoryId = req.query.categoryId as string | undefined;
      let outletId = req.query.outletId as string | undefined;
      const search = req.query.search as string | undefined;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const skip = (page - 1) * limit;

      // Validate ObjectIds if provided
      if (categoryId && !Types.ObjectId.isValid(categoryId)) {
        ApiResponseHandler.badRequest(res, 'Invalid categoryId format');
        return;
      }
      if (outletId && !Types.ObjectId.isValid(outletId)) {
        ApiResponseHandler.badRequest(res, 'Invalid outletId format');
        return;
      }

      if (outletId && !(await AccessScope.canAccessOutlet(req.user, outletId))) {
        ApiResponseHandler.forbidden(res, 'You cannot access menu items for this outlet');
        return;
      }

      const filters: {
        limit: number;
        skip: number;
        categoryId?: string;
        outletId?: string;
        search?: string;
      } = { limit, skip };

      if (categoryId) filters.categoryId = categoryId;
      const allowedOutletIds = await AccessScope.outletIdsForUser(req.user);
      if (!outletId && allowedOutletIds && allowedOutletIds.length === 1) {
        outletId = allowedOutletIds[0];
      }

      if (outletId) filters.outletId = outletId;
      if (search) filters.search = search;

      const { menuItems, total } = await MenuItemService.getMenuItems(req.user.tenantId, filters);
      const scopedMenuItems = allowedOutletIds === null || outletId
        ? menuItems
        : menuItems.filter(item => allowedOutletIds.includes(item.outletId.toString()));

      ApiResponseHandler.success(res, 200, 'Menu items retrieved successfully', {
        menuItems: scopedMenuItems.map(item => ({
          id: item._id,
          categoryId: item.categoryId,
          outletId: item.outletId,
          tenantId: item.tenantId,
          name: item.name,
          price: item.price,
          description: item.description,
          image: item.image,
          sku: item.sku,
          isVeg: item.isVeg,
          isAvailable: item.isAvailable,
          displayOrder: item.displayOrder,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })),
        pagination: {
          total: scopedMenuItems.length,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || 'Failed to list menu items');
    }
  }

  /**
   * Get menu item by ID with child variants and addons populated
   * GET /menu-items/:id
   */
  static async getMenuItemById(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
        return;
      }

      const { id } = req.params as { id: string };
      if (!Types.ObjectId.isValid(id)) {
        ApiResponseHandler.badRequest(res, 'Invalid menu item ID format');
        return;
      }

      const details = await MenuItemService.getMenuItemWithDetails(id, req.user.tenantId);
      if (!details) {
        ApiResponseHandler.notFound(res, 'Menu item not found');
        return;
      }

      const { menuItem, variants, addons } = details;
      if (!(await AccessScope.canAccessOutlet(req.user, menuItem.outletId.toString()))) {
        ApiResponseHandler.forbidden(res, 'You cannot access this menu item');
        return;
      }

      ApiResponseHandler.success(res, 200, 'Menu item details retrieved', {
        id: menuItem._id,
        categoryId: menuItem.categoryId,
        outletId: menuItem.outletId,
        tenantId: menuItem.tenantId,
        name: menuItem.name,
        price: menuItem.price,
        description: menuItem.description,
        image: menuItem.image,
        sku: menuItem.sku,
        isVeg: menuItem.isVeg,
        isAvailable: menuItem.isAvailable,
        displayOrder: menuItem.displayOrder,
        createdAt: menuItem.createdAt,
        updatedAt: menuItem.updatedAt,
        variants: variants.map(v => ({
          id: v._id,
          name: v.name,
          price: v.price,
          isAvailable: v.isAvailable,
        })),
        addons: addons.map(a => ({
          id: a._id,
          name: a.name,
          price: a.price,
          isAvailable: a.isAvailable,
        })),
      });
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || 'Failed to retrieve menu item');
    }
  }

  /**
   * Replace/Update menu item details (PUT replacement)
   * PUT /menu-items/:id
   */
  static async updateMenuItem(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
        return;
      }

      const { id } = req.params as { id: string };
      if (!Types.ObjectId.isValid(id)) {
        ApiResponseHandler.badRequest(res, 'Invalid menu item ID format');
        return;
      }

      const {
        categoryId,
        outletId,
        name,
        price,
        description,
        image,
        sku,
        isVeg,
        isAvailable,
        displayOrder,
      } = req.body;

      // Validate required fields for PUT replacement
      if (!categoryId || !outletId || !name || price === undefined || isVeg === undefined || isAvailable === undefined || displayOrder === undefined) {
        ApiResponseHandler.badRequest(res, 'categoryId, outletId, name, price, isVeg, isAvailable, and displayOrder are required');
        return;
      }

      // Validate ObjectIds format
      if (!Types.ObjectId.isValid(categoryId) || !Types.ObjectId.isValid(outletId)) {
        ApiResponseHandler.badRequest(res, 'Invalid categoryId or outletId format');
        return;
      }

      if (!(await AccessScope.canAccessOutlet(req.user, outletId))) {
        ApiResponseHandler.forbidden(res, 'You cannot update menu items for this outlet');
        return;
      }

      // Validate name
      if (typeof name !== 'string' || name.trim().length === 0) {
        ApiResponseHandler.badRequest(res, 'name must be a non-empty string');
        return;
      }
      if (name.length > 150) {
        ApiResponseHandler.badRequest(res, 'Name cannot exceed 150 characters');
        return;
      }

      // Validate price
      const numPrice = Number(price);
      if (isNaN(numPrice) || numPrice < 0) {
        ApiResponseHandler.badRequest(res, 'Price cannot be negative');
        return;
      }

      // Validate description if provided
      if (description && (typeof description !== 'string' || description.length > 500)) {
        ApiResponseHandler.badRequest(res, 'Description cannot exceed 500 characters');
        return;
      }

      // Validate SKU if provided
      if (sku) {
        if (typeof sku !== 'string' || sku.length > 50) {
          ApiResponseHandler.badRequest(res, 'SKU cannot exceed 50 characters');
          return;
        }
      }

      // Validate displayOrder
      const parsedDisplayOrder = Number(displayOrder);
      if (isNaN(parsedDisplayOrder) || parsedDisplayOrder < 0) {
        ApiResponseHandler.badRequest(res, 'displayOrder must be a non-negative number');
        return;
      }

      const updateData = {
        categoryId,
        outletId,
        name: name.trim(),
        price: numPrice,
        description: description ? description.trim() : undefined,
        image: image ? image.trim() : undefined,
        sku: sku ? sku.trim() : undefined,
        isVeg: !!isVeg,
        isAvailable: !!isAvailable,
        displayOrder: parsedDisplayOrder,
      };

      const updatedItem = await MenuItemService.updateMenuItemDetails(
        id,
        req.user.tenantId,
        updateData,
        req.user.userId
      );

      if (!updatedItem) {
        ApiResponseHandler.notFound(res, 'Menu item not found');
        return;
      }

      ApiResponseHandler.success(res, 200, 'Menu item updated successfully', {
        id: updatedItem._id,
        categoryId: updatedItem.categoryId,
        outletId: updatedItem.outletId,
        tenantId: updatedItem.tenantId,
        name: updatedItem.name,
        price: updatedItem.price,
        description: updatedItem.description,
        image: updatedItem.image,
        sku: updatedItem.sku,
        isVeg: updatedItem.isVeg,
        isAvailable: updatedItem.isAvailable,
        displayOrder: updatedItem.displayOrder,
        createdAt: updatedItem.createdAt,
        updatedAt: updatedItem.updatedAt,
      });
    } catch (error: any) {
      ApiResponseHandler.badRequest(res, error.message || 'Failed to update menu item');
    }
  }

  /**
   * Toggle availability status of a menu item
   * PATCH /menu-items/:id/availability
   */
  static async toggleAvailability(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
        return;
      }

      const { id } = req.params as { id: string };
      if (!Types.ObjectId.isValid(id)) {
        ApiResponseHandler.badRequest(res, 'Invalid menu item ID format');
        return;
      }

      const { isAvailable } = req.body;
      if (isAvailable === undefined) {
        ApiResponseHandler.badRequest(res, 'isAvailable parameter is required');
        return;
      }

      const existingItem = await MenuItemService.getMenuItemById(id, req.user.tenantId);
      if (!existingItem) {
        ApiResponseHandler.notFound(res, 'Menu item not found');
        return;
      }
      if (!(await AccessScope.canAccessOutlet(req.user, existingItem.outletId.toString()))) {
        ApiResponseHandler.forbidden(res, 'You cannot update this menu item');
        return;
      }

      const updatedItem = await MenuItemService.updateAvailabilityStatus(
        id,
        req.user.tenantId,
        !!isAvailable,
        req.user.userId
      );

      if (!updatedItem) {
        ApiResponseHandler.notFound(res, 'Menu item not found');
        return;
      }

      ApiResponseHandler.success(res, 200, 'Availability status updated successfully', {
        id: updatedItem._id,
        name: updatedItem.name,
        isAvailable: updatedItem.isAvailable,
      });
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || 'Failed to update availability');
    }
  }

  /**
   * Soft-delete a menu item and cascade soft-deletes to variants and addons
   * DELETE /menu-items/:id
   */
  static async deleteMenuItem(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
        return;
      }

      const { id } = req.params as { id: string };
      if (!Types.ObjectId.isValid(id)) {
        ApiResponseHandler.badRequest(res, 'Invalid menu item ID format');
        return;
      }

      const existingItem = await MenuItemService.getMenuItemById(id, req.user.tenantId);
      if (!existingItem) {
        ApiResponseHandler.notFound(res, 'Menu item not found');
        return;
      }
      if (!(await AccessScope.canAccessOutlet(req.user, existingItem.outletId.toString()))) {
        ApiResponseHandler.forbidden(res, 'You cannot delete this menu item');
        return;
      }

      const deletedItem = await MenuItemService.deleteMenuItem(
        id,
        req.user.tenantId,
        req.user.userId
      );

      if (!deletedItem) {
        ApiResponseHandler.notFound(res, 'Menu item not found');
        return;
      }

      ApiResponseHandler.success(res, 200, 'Menu item and all associated variants and addons deleted successfully');
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || 'Failed to delete menu item');
    }
  }
}
