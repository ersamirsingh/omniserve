import { Types } from 'mongoose';
import Category from '../models/category.model.js';
import { OutletService } from './outlet.service.js';
import { EventBusService } from './event-bus.service.js';
export class CategoryService {
    /**
     * Validate that the outlet exists, belongs to the tenant, and is active (not soft-deleted)
     */
    static async validateOutletOwnership(outletId, tenantId) {
        try {
            const outlet = await OutletService.getOutletById(outletId, tenantId);
            return !!outlet;
        }
        catch {
            return false;
        }
    }
    /**
     * Create a new category under an outlet
     */
    static async createCategory(tenantId, data, userId) {
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
        EventBusService.publishMenuChanged(tenantId, saved.outletId, saved._id, "MENU_ITEM", saved, { createdBy: userId }).catch(err => console.error('Failed to publish MENU_CHANGED event for category create:', err));
        return saved;
    }
    /**
     * List categories for a tenant/outlet with pagination and sorted by displayOrder
     */
    static async getCategories(tenantId, filters) {
        const query = {
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
    static async getCategoryById(id, tenantId) {
        return await Category.findOne({
            _id: new Types.ObjectId(id),
            tenantId: new Types.ObjectId(tenantId),
            isDeleted: false,
        });
    }
    /**
     * Update category details (PUT replacement)
     */
    static async updateCategoryDetails(id, tenantId, data, userId) {
        // If outletId is changing, validate it first
        if (data.outletId) {
            const isOwner = await this.validateOutletOwnership(data.outletId, tenantId);
            if (!isOwner) {
                throw new Error('Outlet not found or does not belong to this tenant');
            }
        }
        const updatePayload = {
            name: data.name,
            displayOrder: data.displayOrder,
            isActive: data.isActive !== undefined ? !!data.isActive : true,
            updatedBy: userId ? new Types.ObjectId(userId) : null,
        };
        if (data.outletId) {
            updatePayload.outletId = new Types.ObjectId(data.outletId);
        }
        const updated = await Category.findOneAndUpdate({
            _id: new Types.ObjectId(id),
            tenantId: new Types.ObjectId(tenantId),
            isDeleted: false,
        }, updatePayload, { new: true });
        if (updated) {
            EventBusService.publishMenuChanged(tenantId, updated.outletId, updated._id, "MENU_ITEM", updated, { createdBy: userId }).catch(err => console.error('Failed to publish MENU_CHANGED event for category update:', err));
        }
        return updated;
    }
    /**
     * Update category display order
     */
    static async updateCategoryOrder(id, tenantId, displayOrder, userId) {
        const updated = await Category.findOneAndUpdate({
            _id: new Types.ObjectId(id),
            tenantId: new Types.ObjectId(tenantId),
            isDeleted: false,
        }, {
            displayOrder,
            updatedBy: userId ? new Types.ObjectId(userId) : null,
        }, { new: true });
        if (updated) {
            EventBusService.publishMenuChanged(tenantId, updated.outletId, updated._id, "MENU_ITEM", updated, { createdBy: userId }).catch(err => console.error('Failed to publish MENU_CHANGED event for category order update:', err));
        }
        return updated;
    }
    /**
     * Soft-delete a category
     */
    static async deleteCategory(id, tenantId, userId) {
        const deleted = await Category.findOneAndUpdate({
            _id: new Types.ObjectId(id),
            tenantId: new Types.ObjectId(tenantId),
            isDeleted: false,
        }, {
            isDeleted: true,
            isActive: false,
            updatedBy: userId ? new Types.ObjectId(userId) : null,
        }, { new: true });
        if (deleted) {
            EventBusService.publishMenuChanged(tenantId, deleted.outletId, deleted._id, "MENU_ITEM", deleted, { createdBy: userId }).catch(err => console.error('Failed to publish MENU_CHANGED event for category delete:', err));
        }
        return deleted;
    }
}
