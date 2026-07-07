import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { VariantService } from "./variant.service.js";
import { ApiResponseHandler } from "../../utils/apiResponse.js";
import { MenuItemService } from "../menuItem/menuItem.service.js";
import { AccessScope } from "../../utils/accessScope.utils.js";

export class VariantController {
  /**
   * Create a new variant
   * POST /variants
   */
  static async createVariant(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
        return;
      }

      const { menuItemId, name, price, isAvailable } = req.body;

      // Validate required fields
      if (!menuItemId || !name || price === undefined) {
        ApiResponseHandler.badRequest(res, 'menuItemId, name, and price are required');
        return;
      }

      // Validate ObjectId format
      if (!Types.ObjectId.isValid(menuItemId)) {
        ApiResponseHandler.badRequest(res, 'Invalid menuItemId format');
        return;
      }

      const menuItem = await MenuItemService.getMenuItemById(menuItemId, req.user.tenantId);
      if (!menuItem) {
        ApiResponseHandler.notFound(res, 'Menu item not found');
        return;
      }
      if (!(await AccessScope.canAccessOutlet(req.user, menuItem.outletId.toString()))) {
        ApiResponseHandler.forbidden(res, 'You cannot manage variants for this menu item');
        return;
      }

      // Validate name
      if (typeof name !== 'string' || name.trim().length === 0) {
        ApiResponseHandler.badRequest(res, 'name must be a non-empty string');
        return;
      }
      if (name.length > 100) {
        ApiResponseHandler.badRequest(res, 'Variant name cannot exceed 100 characters');
        return;
      }

      // Validate price
      const numPrice = Number(price);
      if (isNaN(numPrice) || numPrice < 0) {
        ApiResponseHandler.badRequest(res, 'Price cannot be negative');
        return;
      }

      const variantData = {
        menuItemId,
        name: name.trim(),
        price: numPrice,
        isAvailable: isAvailable !== undefined ? !!isAvailable : true,
      };

      const variant = await VariantService.createVariant(
        req.user.tenantId,
        variantData,
        req.user.userId
      );

      ApiResponseHandler.success(res, 201, 'Variant created successfully', {
        id: variant._id,
        menuItemId: variant.menuItemId,
        tenantId: variant.tenantId,
        name: variant.name,
        price: variant.price,
        isAvailable: variant.isAvailable,
        createdAt: variant.createdAt,
        updatedAt: variant.updatedAt,
      });
    } catch (error: any) {
      ApiResponseHandler.badRequest(res, error.message || 'Failed to create variant');
    }
  }

  /**
   * List variants for a menu item
   * GET /variants?menuItemId=xxx
   */
  static async listVariants(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
        return;
      }

      const menuItemId = req.query.menuItemId as string | undefined;

      if (!menuItemId) {
        ApiResponseHandler.badRequest(res, 'menuItemId query parameter is required');
        return;
      }

      if (!Types.ObjectId.isValid(menuItemId)) {
        ApiResponseHandler.badRequest(res, 'Invalid menuItemId format');
        return;
      }

      const menuItem = await MenuItemService.getMenuItemById(menuItemId, req.user.tenantId);
      if (!menuItem) {
        ApiResponseHandler.notFound(res, 'Menu item not found');
        return;
      }
      if (!(await AccessScope.canAccessOutlet(req.user, menuItem.outletId.toString()))) {
        ApiResponseHandler.forbidden(res, 'You cannot access variants for this menu item');
        return;
      }

      const variants = await VariantService.getVariants(req.user.tenantId, menuItemId);

      ApiResponseHandler.success(res, 200, 'Variants retrieved successfully', {
        variants: variants.map(variant => ({
          id: variant._id,
          menuItemId: variant.menuItemId,
          tenantId: variant.tenantId,
          name: variant.name,
          price: variant.price,
          isAvailable: variant.isAvailable,
          createdAt: variant.createdAt,
          updatedAt: variant.updatedAt,
        })),
      });
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || 'Failed to list variants');
    }
  }

  /**
   * Replace/Update variant details
   * PUT /variants/:id
   */
  static async updateVariant(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
        return;
      }

      const { id } = req.params as { id: string };
      if (!Types.ObjectId.isValid(id)) {
        ApiResponseHandler.badRequest(res, 'Invalid variant ID format');
        return;
      }

      const { menuItemId, name, price, isAvailable } = req.body;

      // Validate required fields for PUT replacement
      if (!menuItemId || !name || price === undefined || isAvailable === undefined) {
        ApiResponseHandler.badRequest(res, 'menuItemId, name, price, and isAvailable are required');
        return;
      }

      if (!Types.ObjectId.isValid(menuItemId)) {
        ApiResponseHandler.badRequest(res, 'Invalid menuItemId format');
        return;
      }

      const menuItem = await MenuItemService.getMenuItemById(menuItemId, req.user.tenantId);
      if (!menuItem) {
        ApiResponseHandler.notFound(res, 'Menu item not found');
        return;
      }
      if (!(await AccessScope.canAccessOutlet(req.user, menuItem.outletId.toString()))) {
        ApiResponseHandler.forbidden(res, 'You cannot update variants for this menu item');
        return;
      }

      if (typeof name !== 'string' || name.trim().length === 0) {
        ApiResponseHandler.badRequest(res, 'name must be a non-empty string');
        return;
      }
      if (name.length > 100) {
        ApiResponseHandler.badRequest(res, 'Variant name cannot exceed 100 characters');
        return;
      }

      const numPrice = Number(price);
      if (isNaN(numPrice) || numPrice < 0) {
        ApiResponseHandler.badRequest(res, 'Price cannot be negative');
        return;
      }

      const updateData = {
        menuItemId,
        name: name.trim(),
        price: numPrice,
        isAvailable: !!isAvailable,
      };

      const updatedVariant = await VariantService.updateVariant(
        id,
        req.user.tenantId,
        updateData,
        req.user.userId
      );

      if (!updatedVariant) {
        ApiResponseHandler.notFound(res, 'Variant not found');
        return;
      }

      ApiResponseHandler.success(res, 200, 'Variant updated successfully', {
        id: updatedVariant._id,
        menuItemId: updatedVariant.menuItemId,
        tenantId: updatedVariant.tenantId,
        name: updatedVariant.name,
        price: updatedVariant.price,
        isAvailable: updatedVariant.isAvailable,
        createdAt: updatedVariant.createdAt,
        updatedAt: updatedVariant.updatedAt,
      });
    } catch (error: any) {
      ApiResponseHandler.badRequest(res, error.message || 'Failed to update variant');
    }
  }

  /**
   * Soft-delete a variant
   * DELETE /variants/:id
   */
  static async deleteVariant(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
        return;
      }

      const { id } = req.params as { id: string };
      if (!Types.ObjectId.isValid(id)) {
        ApiResponseHandler.badRequest(res, 'Invalid variant ID format');
        return;
      }

      const existingVariant = await VariantService.getVariantById(id, req.user.tenantId);
      if (!existingVariant) {
        ApiResponseHandler.notFound(res, 'Variant not found');
        return;
      }
      const menuItem = await MenuItemService.getMenuItemById(existingVariant.menuItemId.toString(), req.user.tenantId);
      if (!menuItem || !(await AccessScope.canAccessOutlet(req.user, menuItem.outletId.toString()))) {
        ApiResponseHandler.forbidden(res, 'You cannot delete this variant');
        return;
      }

      const deletedVariant = await VariantService.deleteVariant(id, req.user.tenantId, req.user.userId);
      if (!deletedVariant) {
        ApiResponseHandler.notFound(res, 'Variant not found');
        return;
      }

      ApiResponseHandler.success(res, 200, 'Variant deleted successfully');
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || 'Failed to delete variant');
    }
  }
}
