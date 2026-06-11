import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { InventoryService } from '../services/inventory.service.js';
import { ApiResponseHandler } from '../utils/response.handler.js';

export class InventoryController {
  /**
   * Create a new Inventory record
   * POST /inventory
   */
  static async createInventory(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
        return;
      }

      const { outletId, menuItemId, quantity, threshold } = req.body;

      // Validate required fields
      if (!outletId || !menuItemId || quantity === undefined) {
        ApiResponseHandler.badRequest(res, 'outletId, menuItemId, and quantity are required');
        return;
      }

      // Validate ObjectId format
      if (!Types.ObjectId.isValid(outletId)) {
        ApiResponseHandler.badRequest(res, 'Invalid outletId format');
        return;
      }

      if (!Types.ObjectId.isValid(menuItemId)) {
        ApiResponseHandler.badRequest(res, 'Invalid menuItemId format');
        return;
      }

      // Validate quantity
      const numQuantity = Number(quantity);
      if (isNaN(numQuantity) || numQuantity < 0) {
        ApiResponseHandler.badRequest(res, 'Quantity cannot be negative');
        return;
      }

      // Validate threshold if provided
      let numThreshold = 10;
      if (threshold !== undefined) {
        numThreshold = Number(threshold);
        if (isNaN(numThreshold) || numThreshold < 0) {
          ApiResponseHandler.badRequest(res, 'Threshold cannot be negative');
          return;
        }
      }

      const inventoryData = {
        outletId,
        menuItemId,
        quantity: numQuantity,
        threshold: numThreshold,
      };

      const inventory = await InventoryService.createInventory(
        req.user.tenantId,
        inventoryData,
        req.user.userId
      );

      ApiResponseHandler.success(res, 201, 'Inventory record created successfully', {
        id: inventory._id,
        outletId: inventory.outletId,
        menuItemId: inventory.menuItemId,
        tenantId: inventory.tenantId,
        quantity: inventory.quantity,
        threshold: inventory.threshold,
        isLowStock: inventory.isLowStock,
        createdAt: inventory.createdAt,
        updatedAt: inventory.updatedAt,
      });
    } catch (error: any) {
      ApiResponseHandler.badRequest(res, error.message || 'Failed to create inventory record');
    }
  }

  /**
   * List Inventory records with optional filtering
   * GET /inventory
   */
  static async listInventory(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
        return;
      }

      const outletId = req.query.outletId as string | undefined;
      const menuItemId = req.query.menuItemId as string | undefined;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const skip = (page - 1) * limit;

      // Validate query parameter ObjectIds if provided
      if (outletId && !Types.ObjectId.isValid(outletId)) {
        ApiResponseHandler.badRequest(res, 'Invalid outletId query parameter format');
        return;
      }

      if (menuItemId && !Types.ObjectId.isValid(menuItemId)) {
        ApiResponseHandler.badRequest(res, 'Invalid menuItemId query parameter format');
        return;
      }

      const filters: {
        outletId?: string;
        menuItemId?: string;
        limit: number;
        skip: number;
      } = { limit, skip };

      if (outletId) filters.outletId = outletId;
      if (menuItemId) filters.menuItemId = menuItemId;

      const { inventory, total } = await InventoryService.getInventory(
        req.user.tenantId,
        filters
      );

      ApiResponseHandler.success(res, 200, 'Inventory retrieved successfully', {
        inventory: inventory.map(item => ({
          id: item._id,
          outletId: item.outletId,
          menuItemId: item.menuItemId,
          tenantId: item.tenantId,
          quantity: item.quantity,
          threshold: item.threshold,
          isLowStock: item.isLowStock,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })),
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || 'Failed to list inventory');
    }
  }

  /**
   * Get Inventory details by ID
   * GET /inventory/:id
   */
  static async getInventoryById(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
        return;
      }

      const { id } = req.params as { id: string };
      if (!Types.ObjectId.isValid(id)) {
        ApiResponseHandler.badRequest(res, 'Invalid inventory ID format');
        return;
      }

      const inventory = await InventoryService.getInventoryById(id, req.user.tenantId);
      if (!inventory) {
        ApiResponseHandler.notFound(res, 'Inventory record not found');
        return;
      }

      ApiResponseHandler.success(res, 200, 'Inventory details retrieved', {
        id: inventory._id,
        outletId: inventory.outletId,
        menuItemId: inventory.menuItemId,
        tenantId: inventory.tenantId,
        quantity: inventory.quantity,
        threshold: inventory.threshold,
        isLowStock: inventory.isLowStock,
        createdAt: inventory.createdAt,
        updatedAt: inventory.updatedAt,
      });
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || 'Failed to retrieve inventory record');
    }
  }

  /**
   * Update Inventory stock quantity
   * PATCH /inventory/:id/quantity
   */
  static async updateQuantity(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
        return;
      }

      const { id } = req.params as { id: string };
      if (!Types.ObjectId.isValid(id)) {
        ApiResponseHandler.badRequest(res, 'Invalid inventory ID format');
        return;
      }

      const { quantity } = req.body;

      if (quantity === undefined) {
        ApiResponseHandler.badRequest(res, 'quantity is required');
        return;
      }

      const numQuantity = Number(quantity);
      if (isNaN(numQuantity) || numQuantity < 0) {
        ApiResponseHandler.badRequest(res, 'Quantity cannot be negative');
        return;
      }

      const updatedInventory = await InventoryService.updateQuantity(
        id,
        req.user.tenantId,
        numQuantity,
        req.user.userId
      );

      if (!updatedInventory) {
        ApiResponseHandler.notFound(res, 'Inventory record not found');
        return;
      }

      ApiResponseHandler.success(res, 200, 'Inventory quantity updated successfully', {
        id: updatedInventory._id,
        outletId: updatedInventory.outletId,
        menuItemId: updatedInventory.menuItemId,
        tenantId: updatedInventory.tenantId,
        quantity: updatedInventory.quantity,
        threshold: updatedInventory.threshold,
        isLowStock: updatedInventory.isLowStock,
        createdAt: updatedInventory.createdAt,
        updatedAt: updatedInventory.updatedAt,
      });
    } catch (error: any) {
      ApiResponseHandler.badRequest(res, error.message || 'Failed to update quantity');
    }
  }

  /**
   * List Inventory records that have low stock
   * GET /inventory/low-stock
   */
  static async listLowStock(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
        return;
      }

      const outletId = req.query.outletId as string | undefined;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const skip = (page - 1) * limit;

      if (outletId && !Types.ObjectId.isValid(outletId)) {
        ApiResponseHandler.badRequest(res, 'Invalid outletId query parameter format');
        return;
      }

      const filters: {
        outletId?: string;
        limit: number;
        skip: number;
      } = { limit, skip };

      if (outletId) filters.outletId = outletId;

      const { inventory, total } = await InventoryService.getLowStockInventory(
        req.user.tenantId,
        filters
      );

      ApiResponseHandler.success(res, 200, 'Low stock inventory retrieved successfully', {
        inventory: inventory.map(item => ({
          id: item._id,
          outletId: item.outletId,
          menuItemId: item.menuItemId,
          tenantId: item.tenantId,
          quantity: item.quantity,
          threshold: item.threshold,
          isLowStock: item.isLowStock,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })),
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || 'Failed to list low stock inventory');
    }
  }
}
