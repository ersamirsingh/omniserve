import { Types } from 'mongoose';
import Addon from '../models/addon.model.js';
import MenuItem from '../models/menuitems.model.js';
import { EventBusService } from './event-bus.service.js';
export class AddonService {
    /**
     * Validate that the parent menu item exists, belongs to the tenant, and is active (not soft-deleted)
     */
    static async validateMenuItemOwnership(menuItemId, tenantId) {
        try {
            const menuItem = await MenuItem.findOne({
                _id: new Types.ObjectId(menuItemId),
                tenantId: new Types.ObjectId(tenantId),
                isDeleted: false,
            });
            return !!menuItem;
        }
        catch {
            return false;
        }
    }
    /**
     * Create a new addon under a menu item
     */
    static async createAddon(tenantId, data, userId) {
        const isOwner = await this.validateMenuItemOwnership(data.menuItemId, tenantId);
        if (!isOwner) {
            throw new Error('Menu item not found or does not belong to this tenant');
        }
        const addon = new Addon({
            ...data,
            menuItemId: new Types.ObjectId(data.menuItemId),
            tenantId: new Types.ObjectId(tenantId),
            isAvailable: data.isAvailable !== undefined ? !!data.isAvailable : true,
            isDeleted: false,
            createdBy: userId ? new Types.ObjectId(userId) : null,
            updatedBy: userId ? new Types.ObjectId(userId) : null,
        });
        const saved = await addon.save();
        // Fetch parent menu item to get outletId
        const menuItem = await MenuItem.findById(saved.menuItemId);
        if (menuItem) {
            EventBusService.publishMenuChanged(tenantId, menuItem.outletId, saved.menuItemId, "MENU_ITEM", saved, { createdBy: userId }).catch(err => console.error('Failed to publish MENU_CHANGED event for addon create:', err));
        }
        return saved;
    }
    /**
     * Retrieve list of addons for a parent menu item
     */
    static async getAddons(tenantId, menuItemId) {
        return await Addon.find({
            menuItemId: new Types.ObjectId(menuItemId),
            tenantId: new Types.ObjectId(tenantId),
            isDeleted: false,
        }).sort({ createdAt: 1 });
    }
    /**
     * Retrieve addon by ID and tenant ID
     */
    static async getAddonById(id, tenantId) {
        return await Addon.findOne({
            _id: new Types.ObjectId(id),
            tenantId: new Types.ObjectId(tenantId),
            isDeleted: false,
        });
    }
    /**
     * Replace/Update addon details (PUT replacement)
     */
    static async updateAddon(id, tenantId, data, userId) {
        // Validate parent menu item ownership if it's changing or provided
        if (data.menuItemId) {
            const isOwner = await this.validateMenuItemOwnership(data.menuItemId, tenantId);
            if (!isOwner) {
                throw new Error('Menu item not found or does not belong to this tenant');
            }
        }
        const updatePayload = {
            name: data.name,
            price: data.price,
            isAvailable: data.isAvailable !== undefined ? !!data.isAvailable : true,
            updatedBy: userId ? new Types.ObjectId(userId) : null,
        };
        if (data.menuItemId) {
            updatePayload.menuItemId = new Types.ObjectId(data.menuItemId);
        }
        const updated = await Addon.findOneAndUpdate({
            _id: new Types.ObjectId(id),
            tenantId: new Types.ObjectId(tenantId),
            isDeleted: false,
        }, updatePayload, { new: true });
        if (updated) {
            const menuItem = await MenuItem.findById(updated.menuItemId);
            if (menuItem) {
                EventBusService.publishMenuChanged(tenantId, menuItem.outletId, updated.menuItemId, "MENU_ITEM", updated, { createdBy: userId }).catch(err => console.error('Failed to publish MENU_CHANGED event for addon update:', err));
            }
        }
        return updated;
    }
    /**
     * Soft-delete an addon
     */
    static async deleteAddon(id, tenantId, userId) {
        const deleted = await Addon.findOneAndUpdate({
            _id: new Types.ObjectId(id),
            tenantId: new Types.ObjectId(tenantId),
            isDeleted: false,
        }, {
            isDeleted: true,
            isAvailable: false,
            updatedBy: userId ? new Types.ObjectId(userId) : null,
        }, { new: true });
        if (deleted) {
            const menuItem = await MenuItem.findById(deleted.menuItemId);
            if (menuItem) {
                EventBusService.publishMenuChanged(tenantId, menuItem.outletId, deleted.menuItemId, "MENU_ITEM", deleted, { createdBy: userId }).catch(err => console.error('Failed to publish MENU_CHANGED event for addon delete:', err));
            }
        }
        return deleted;
    }
}
