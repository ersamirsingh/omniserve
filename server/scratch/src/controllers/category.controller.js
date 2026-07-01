import { Types } from 'mongoose';
import { CategoryService } from '../services/category.service.js';
import { ApiResponseHandler } from '../utils/response.handler.js';
import { AccessScope } from '../utils/accessScope.utils.js';
export class CategoryController {
    /**
     * Create a new Category
     * POST /categories
     */
    static async createCategory(req, res) {
        try {
            if (!req.user?.tenantId) {
                ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
                return;
            }
            const { outletId, name, displayOrder } = req.body;
            // Validate required fields
            if (!outletId || !name) {
                ApiResponseHandler.badRequest(res, 'outletId and name are required');
                return;
            }
            // Validate outletId format
            if (!Types.ObjectId.isValid(outletId)) {
                ApiResponseHandler.badRequest(res, 'Invalid outletId format');
                return;
            }
            if (!(await AccessScope.canAccessOutlet(req.user, outletId))) {
                ApiResponseHandler.forbidden(res, 'You cannot create categories for this outlet');
                return;
            }
            // Validate name constraints
            if (typeof name !== 'string' || name.trim().length === 0) {
                ApiResponseHandler.badRequest(res, 'name must be a non-empty string');
                return;
            }
            if (name.length > 100) {
                ApiResponseHandler.badRequest(res, 'Category name cannot exceed 100 characters');
                return;
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
            const categoryData = {
                outletId,
                name: name.trim(),
                displayOrder: parsedDisplayOrder,
            };
            const category = await CategoryService.createCategory(req.user.tenantId, categoryData, req.user.userId);
            ApiResponseHandler.success(res, 201, 'Category created successfully', {
                id: category._id,
                name: category.name,
                displayOrder: category.displayOrder,
                isActive: category.isActive,
            });
        }
        catch (error) {
            ApiResponseHandler.badRequest(res, error.message || 'Failed to create category');
        }
    }
    /**
     * List Categories for a tenant/outlet
     * GET /categories
     */
    static async listCategories(req, res) {
        try {
            if (!req.user?.tenantId) {
                ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
                return;
            }
            let outletId = req.query.outletId;
            const page = parseInt(req.query.page) || 1;
            const limit = Math.min(parseInt(req.query.limit) || 20, 100);
            const skip = (page - 1) * limit;
            // Validate outletId format if filtered
            if (outletId && !Types.ObjectId.isValid(outletId)) {
                ApiResponseHandler.badRequest(res, 'Invalid outletId query parameter format');
                return;
            }
            if (outletId && !(await AccessScope.canAccessOutlet(req.user, outletId))) {
                ApiResponseHandler.forbidden(res, 'You cannot access categories for this outlet');
                return;
            }
            const filters = { limit, skip };
            const allowedOutletIds = await AccessScope.outletIdsForUser(req.user);
            if (!outletId && allowedOutletIds && allowedOutletIds.length === 1) {
                outletId = allowedOutletIds[0];
            }
            if (outletId) {
                filters.outletId = outletId;
            }
            const { categories, total } = await CategoryService.getCategories(req.user.tenantId, filters);
            const scopedCategories = allowedOutletIds === null || outletId
                ? categories
                : categories.filter(category => allowedOutletIds.includes(category.outletId.toString()));
            ApiResponseHandler.success(res, 200, 'Categories retrieved successfully', {
                categories: scopedCategories.map(category => ({
                    id: category._id,
                    outletId: category.outletId,
                    tenantId: category.tenantId,
                    name: category.name,
                    displayOrder: category.displayOrder,
                    isActive: category.isActive,
                    createdAt: category.createdAt,
                    updatedAt: category.updatedAt,
                })),
                pagination: {
                    total: scopedCategories.length,
                    page,
                    limit,
                    pages: Math.ceil(total / limit),
                },
            });
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || 'Failed to list categories');
        }
    }
    /**
     * Get Category by ID
     * GET /categories/:id
     */
    static async getCategoryById(req, res) {
        try {
            if (!req.user?.tenantId) {
                ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
                return;
            }
            const { id } = req.params;
            if (!Types.ObjectId.isValid(id)) {
                ApiResponseHandler.badRequest(res, 'Invalid category ID format');
                return;
            }
            const category = await CategoryService.getCategoryById(id, req.user.tenantId);
            if (!category) {
                ApiResponseHandler.notFound(res, 'Category not found');
                return;
            }
            if (!(await AccessScope.canAccessOutlet(req.user, category.outletId.toString()))) {
                ApiResponseHandler.forbidden(res, 'You cannot access this category');
                return;
            }
            ApiResponseHandler.success(res, 200, 'Category details retrieved', {
                id: category._id,
                outletId: category.outletId,
                tenantId: category.tenantId,
                name: category.name,
                displayOrder: category.displayOrder,
                isActive: category.isActive,
                createdAt: category.createdAt,
                updatedAt: category.updatedAt,
            });
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || 'Failed to retrieve category');
        }
    }
    /**
     * Replace/Update Category details (PUT)
     * PUT /categories/:id
     */
    static async updateCategory(req, res) {
        try {
            if (!req.user?.tenantId) {
                ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
                return;
            }
            const { id } = req.params;
            if (!Types.ObjectId.isValid(id)) {
                ApiResponseHandler.badRequest(res, 'Invalid category ID format');
                return;
            }
            const { name, displayOrder, isActive } = req.body;
            // Validate required fields for PUT details replacement
            if (!name || displayOrder === undefined || isActive === undefined) {
                ApiResponseHandler.badRequest(res, 'name, displayOrder, and isActive are required');
                return;
            }
            if (typeof name !== 'string' || name.trim().length === 0) {
                ApiResponseHandler.badRequest(res, 'name must be a non-empty string');
                return;
            }
            if (name.length > 100) {
                ApiResponseHandler.badRequest(res, 'Category name cannot exceed 100 characters');
                return;
            }
            const parsedDisplayOrder = Number(displayOrder);
            if (isNaN(parsedDisplayOrder) || parsedDisplayOrder < 0) {
                ApiResponseHandler.badRequest(res, 'displayOrder must be a non-negative number');
                return;
            }
            const existingCategory = await CategoryService.getCategoryById(id, req.user.tenantId);
            if (!existingCategory) {
                ApiResponseHandler.notFound(res, 'Category not found');
                return;
            }
            if (!(await AccessScope.canAccessOutlet(req.user, existingCategory.outletId.toString()))) {
                ApiResponseHandler.forbidden(res, 'You cannot update this category');
                return;
            }
            const updateData = {
                name: name.trim(),
                displayOrder: parsedDisplayOrder,
                isActive: !!isActive,
            };
            const updatedCategory = await CategoryService.updateCategoryDetails(id, req.user.tenantId, updateData, req.user.userId);
            if (!updatedCategory) {
                ApiResponseHandler.notFound(res, 'Category not found');
                return;
            }
            ApiResponseHandler.success(res, 200, 'Category updated successfully', {
                id: updatedCategory._id,
                outletId: updatedCategory.outletId,
                tenantId: updatedCategory.tenantId,
                name: updatedCategory.name,
                displayOrder: updatedCategory.displayOrder,
                isActive: updatedCategory.isActive,
                createdAt: updatedCategory.createdAt,
                updatedAt: updatedCategory.updatedAt,
            });
        }
        catch (error) {
            ApiResponseHandler.badRequest(res, error.message || 'Failed to update category');
        }
    }
    /**
     * Update category display order
     * PATCH /categories/:id/order
     */
    static async updateCategoryOrder(req, res) {
        try {
            if (!req.user?.tenantId) {
                ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
                return;
            }
            const { id } = req.params;
            if (!Types.ObjectId.isValid(id)) {
                ApiResponseHandler.badRequest(res, 'Invalid category ID format');
                return;
            }
            const { displayOrder } = req.body;
            if (displayOrder === undefined) {
                ApiResponseHandler.badRequest(res, 'displayOrder is required');
                return;
            }
            const parsedDisplayOrder = Number(displayOrder);
            if (isNaN(parsedDisplayOrder) || parsedDisplayOrder < 0) {
                ApiResponseHandler.badRequest(res, 'displayOrder must be a non-negative number');
                return;
            }
            const existingCategory = await CategoryService.getCategoryById(id, req.user.tenantId);
            if (!existingCategory) {
                ApiResponseHandler.notFound(res, 'Category not found');
                return;
            }
            if (!(await AccessScope.canAccessOutlet(req.user, existingCategory.outletId.toString()))) {
                ApiResponseHandler.forbidden(res, 'You cannot update this category');
                return;
            }
            const updatedCategory = await CategoryService.updateCategoryOrder(id, req.user.tenantId, parsedDisplayOrder, req.user.userId);
            if (!updatedCategory) {
                ApiResponseHandler.notFound(res, 'Category not found');
                return;
            }
            ApiResponseHandler.success(res, 200, 'Category order updated successfully', {
                id: updatedCategory._id,
                name: updatedCategory.name,
                displayOrder: updatedCategory.displayOrder,
            });
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || 'Failed to update category order');
        }
    }
    /**
     * Soft-delete a Category
     * DELETE /categories/:id
     */
    static async deleteCategory(req, res) {
        try {
            if (!req.user?.tenantId) {
                ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
                return;
            }
            const { id } = req.params;
            if (!Types.ObjectId.isValid(id)) {
                ApiResponseHandler.badRequest(res, 'Invalid category ID format');
                return;
            }
            const existingCategory = await CategoryService.getCategoryById(id, req.user.tenantId);
            if (!existingCategory) {
                ApiResponseHandler.notFound(res, 'Category not found');
                return;
            }
            if (!(await AccessScope.canAccessOutlet(req.user, existingCategory.outletId.toString()))) {
                ApiResponseHandler.forbidden(res, 'You cannot delete this category');
                return;
            }
            const deletedCategory = await CategoryService.deleteCategory(id, req.user.tenantId, req.user.userId);
            if (!deletedCategory) {
                ApiResponseHandler.notFound(res, 'Category not found');
                return;
            }
            ApiResponseHandler.success(res, 200, 'Category deleted successfully');
        }
        catch (error) {
            ApiResponseHandler.internalError(res, error.message || 'Failed to delete category');
        }
    }
}
