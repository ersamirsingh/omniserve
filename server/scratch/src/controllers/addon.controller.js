import { Types } from 'mongoose';
import { AddonService } from '../services/addon.service.js';
import { ApiResponseHandler } from '../utils/response.handler.js';
import { MenuItemService } from '../services/menuitem.service.js';
import { AccessScope } from '../utils/accessScope.utils.js';
export class AddonController {
    /**
     * Create a new addon
     * POST /addons
     */
    static async createAddon(req, res) {
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
                ApiResponseHandler.forbidden(res, 'You cannot manage addons for this menu item');
                return;
            }
            // Validate name
            if (typeof name !== 'string' || name.trim().length === 0) {
                ApiResponseHandler.badRequest(res, 'name must be a non-empty string');
                return;
            }
            if (name.length > 100) {
                ApiResponseHandler.badRequest(res, 'Addon name cannot exceed 100 characters');
                return;
            }
            // Validate price
            const numPrice = Number(price);
            if (isNaN(numPrice) || numPrice < 0) {
                ApiResponseHandler.badRequest(res, 'Price cannot be negative');
                return;
            }
            const addonData = {
                menuItemId,
                name: name.trim(),
                price: numPrice,
                isAvailable: isAvailable !== undefined ? !!isAvailable : true,
            };
            const addon = await AddonService.createAddon(req.user.tenantId, addonData, req.user.userId);
            ApiResponseHandler.success(res, 201, 'Addon created successfully', {
                id: addon._id,
                menuItemId: addon.menuItemId,
                tenantId: addon.tenantId,
                name: addon.name,
                price: addon.price,
                isAvailable: addon.isAvailable,
                createdAt: addon.createdAt,
                updatedAt: addon.updatedAt,
            });
        }
        catch (error) {
            ApiResponseHandler.badRequest(res, error.message || 'Failed to create addon');
        }
    }
    /**
     * List addons for a menu item
     * GET /addons?menuItemId=xxx
     */
    static async listAddons(req, res) {
        try {
            if (!req.user?.tenantId) {
                ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
                return;
            }
            const menuItemId = req.query.menuItemId;
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
                ApiResponseHandler.forbidden(res, 'You cannot access addons for this menu item');
                return;
            }
            const addons = await AddonService.getAddons(req.user.tenantId, menuItemId);
            ApiResponseHandler.success(res, 200, 'Addons retrieved successfully', {
                addons: addons.map(addon => ({
                    id: addon._id,
                    menuItemId: addon.menuItemId,
                    tenantId: addon.tenantId,
                    name: addon.name,
                    price: addon.price,
                    isAvailable: addon.isAvailable,
                    createdAt: addon.createdAt,
                    updatedAt: addon.updatedAt,
                })),
            });
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || 'Failed to list addons');
        }
    }
    /**
     * Replace/Update addon details
     * PUT /addons/:id
     */
    static async updateAddon(req, res) {
        try {
            if (!req.user?.tenantId) {
                ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
                return;
            }
            const { id } = req.params;
            if (!Types.ObjectId.isValid(id)) {
                ApiResponseHandler.badRequest(res, 'Invalid addon ID format');
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
                ApiResponseHandler.forbidden(res, 'You cannot update addons for this menu item');
                return;
            }
            if (typeof name !== 'string' || name.trim().length === 0) {
                ApiResponseHandler.badRequest(res, 'name must be a non-empty string');
                return;
            }
            if (name.length > 100) {
                ApiResponseHandler.badRequest(res, 'Addon name cannot exceed 100 characters');
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
            const updatedAddon = await AddonService.updateAddon(id, req.user.tenantId, updateData, req.user.userId);
            if (!updatedAddon) {
                ApiResponseHandler.notFound(res, 'Addon not found');
                return;
            }
            ApiResponseHandler.success(res, 200, 'Addon updated successfully', {
                id: updatedAddon._id,
                menuItemId: updatedAddon.menuItemId,
                tenantId: updatedAddon.tenantId,
                name: updatedAddon.name,
                price: updatedAddon.price,
                isAvailable: updatedAddon.isAvailable,
                createdAt: updatedAddon.createdAt,
                updatedAt: updatedAddon.updatedAt,
            });
        }
        catch (error) {
            ApiResponseHandler.badRequest(res, error.message || 'Failed to update addon');
        }
    }
    /**
     * Soft-delete an addon
     * DELETE /addons/:id
     */
    static async deleteAddon(req, res) {
        try {
            if (!req.user?.tenantId) {
                ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
                return;
            }
            const { id } = req.params;
            if (!Types.ObjectId.isValid(id)) {
                ApiResponseHandler.badRequest(res, 'Invalid addon ID format');
                return;
            }
            const existingAddon = await AddonService.getAddonById(id, req.user.tenantId);
            if (!existingAddon) {
                ApiResponseHandler.notFound(res, 'Addon not found');
                return;
            }
            const menuItem = await MenuItemService.getMenuItemById(existingAddon.menuItemId.toString(), req.user.tenantId);
            if (!menuItem || !(await AccessScope.canAccessOutlet(req.user, menuItem.outletId.toString()))) {
                ApiResponseHandler.forbidden(res, 'You cannot delete this addon');
                return;
            }
            const deletedAddon = await AddonService.deleteAddon(id, req.user.tenantId, req.user.userId);
            if (!deletedAddon) {
                ApiResponseHandler.notFound(res, 'Addon not found');
                return;
            }
            ApiResponseHandler.success(res, 200, 'Addon deleted successfully');
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || 'Failed to delete addon');
        }
    }
}
