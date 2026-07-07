import { Types } from 'mongoose';
import Inventory, { IInventory } from "../../models/inventory.model.js";
import MenuItem from "../../models/menuItem.model.js";
import Outlet from "../../models/outlet.model.js";
import { NotificationType } from "../../models/enums.js";
import { NotificationService } from "../notification/notification.service.js";
import { EventBusService } from "../../events/eventBus.js";

export class InventoryService {
  /**
   * Validate that the outlet exists, belongs to the tenant, and is active (not soft-deleted)
   * Validate that the menuItem exists, belongs to the tenant, and is active (not soft-deleted)
   * Validate that the menuItem is assigned to the specified outlet
   */
  static async validateOwnership(
    menuItemId: string,
    outletId: string,
    tenantId: string
  ): Promise<boolean> {
    try {
      const [menuItem, outlet] = await Promise.all([
        MenuItem.findOne({
          _id: new Types.ObjectId(menuItemId),
          tenantId: new Types.ObjectId(tenantId),
          isDeleted: false,
        }),
        Outlet.findOne({
          _id: new Types.ObjectId(outletId),
          tenantId: new Types.ObjectId(tenantId),
          isDeleted: false,
        }),
      ]);

      if (!menuItem || !outlet) {
        return false;
      }

      // Verify that the menu item belongs to the outlet
      return menuItem.outletId.toString() === outletId;
    } catch {
      return false;
    }
  }

  /**
   * Create inventory record
   */
  static async createInventory(
    tenantId: string,
    data: any,
    userId?: string
  ): Promise<IInventory> {
    const isOwner = await this.validateOwnership(data.menuItemId, data.outletId, tenantId);
    if (!isOwner) {
      throw new Error('Invalid MenuItem or Outlet selection. Ensure they exist and the MenuItem belongs to the Outlet.');
    }

    try {
      const inventory = new Inventory({
        ...data,
        menuItemId: new Types.ObjectId(data.menuItemId),
        outletId: new Types.ObjectId(data.outletId),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
        createdBy: userId ? new Types.ObjectId(userId) : null,
        updatedBy: userId ? new Types.ObjectId(userId) : null,
      });

      const savedInventory = await inventory.save();

      // Trigger LOW_INVENTORY notification if created under threshold
      if (savedInventory.isLowStock) {
        NotificationService.notifyTenantUsers(
          tenantId,
          'Low Stock Warning',
          `Inventory for Menu Item ${savedInventory.menuItemId} is running low at Outlet ${savedInventory.outletId}. Quantity: ${savedInventory.quantity}, Threshold: ${savedInventory.threshold}.`,
          NotificationType.LOW_INVENTORY,
          savedInventory._id.toString(),
          'Inventory',
          userId
        ).catch(err => console.error('Failed to dispatch LOW_INVENTORY notification:', err));
      }

      EventBusService.publishInventoryChanged(
        tenantId,
        savedInventory.outletId,
        savedInventory._id,
        savedInventory,
        {
          createdBy: userId,
          sourceSystem: "SYSTEM",
        }
      ).catch(err => console.error('Failed to publish INVENTORY_CHANGED event:', err));

      return savedInventory;
    } catch (error: any) {
      if (error.code === 11000) {
        throw new Error('Inventory record already exists for this menu item at this outlet');
      }
      throw error;
    }
  }

  /**
   * Retrieve list of inventory records with filters (tenant isolated)
   */
  static async getInventory(
    tenantId: string,
    filters: { outletId?: string; menuItemId?: string; limit: number; skip: number }
  ): Promise<{ inventory: IInventory[]; total: number }> {
    const query: any = {
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    };

    if (filters.outletId) {
      query.outletId = new Types.ObjectId(filters.outletId);
    }

    if (filters.menuItemId) {
      query.menuItemId = new Types.ObjectId(filters.menuItemId);
    }

    const [inventory, total] = await Promise.all([
      Inventory.find(query)
        .populate('menuItemId', 'name price sku')
        .populate('outletId', 'name status')
        .sort({ createdAt: -1 })
        .limit(filters.limit)
        .skip(filters.skip),
      Inventory.countDocuments(query),
    ]);

    return { inventory, total };
  }

  /**
   * Retrieve inventory record by ID and Tenant ID
   */
  static async getInventoryById(id: string, tenantId: string): Promise<IInventory | null> {
    return await Inventory.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    })
      .populate('menuItemId', 'name price sku')
      .populate('outletId', 'name status');
  }

  /**
   * Update inventory stock quantity (respects tenant isolation)
   * Manually recomputes isLowStock and provides a documented integration point for LOW_INVENTORY alert.
   */
  static async updateQuantity(
    id: string,
    tenantId: string,
    quantity: number,
    userId?: string
  ): Promise<IInventory | null> {
    // 1. Fetch current inventory to calculate low stock status
    const inventory = await Inventory.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });

    if (!inventory) {
      return null;
    }

    // 2. Recompute low stock flag manually (bypass pre-save hook for findOneAndUpdate)
    const isLowStockNow = quantity <= inventory.threshold;

    if (isLowStockNow) {
      // Dispatch LOW_INVENTORY notification to all active tenant users
      NotificationService.notifyTenantUsers(
        tenantId,
        'Low Stock Warning',
        `Inventory for Menu Item ${inventory.menuItemId} is running low at Outlet ${inventory.outletId}. Quantity: ${quantity}, Threshold: ${inventory.threshold}.`,
        NotificationType.LOW_INVENTORY,
        inventory._id.toString(),
        'Inventory',
        userId
      ).catch(err => console.error('Failed to dispatch LOW_INVENTORY notification:', err));
    }

    // 4. Update quantity, isLowStock and updatedBy fields
    const updatedInventory = await Inventory.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      },
      {
        quantity,
        isLowStock: isLowStockNow,
        updatedBy: userId ? new Types.ObjectId(userId) : null,
      },
      { new: true }
    )
      .populate('menuItemId', 'name price sku')
      .populate('outletId', 'name status');

    if (updatedInventory) {
      EventBusService.publishInventoryChanged(
        tenantId,
        updatedInventory.outletId,
        updatedInventory._id,
        updatedInventory,
        {
          createdBy: userId,
          sourceSystem: "SYSTEM",
        }
      ).catch(err => console.error('Failed to publish INVENTORY_CHANGED event:', err));
    }

    return updatedInventory;
  }

  /**
   * Retrieve low stock inventory records
   */
  static async getLowStockInventory(
    tenantId: string,
    filters: { outletId?: string; limit: number; skip: number }
  ): Promise<{ inventory: IInventory[]; total: number }> {
    const query: any = {
      tenantId: new Types.ObjectId(tenantId),
      isLowStock: true,
      isDeleted: false,
    };

    if (filters.outletId) {
      query.outletId = new Types.ObjectId(filters.outletId);
    }

    const [inventory, total] = await Promise.all([
      Inventory.find(query)
        .populate('menuItemId', 'name price sku')
        .populate('outletId', 'name status')
        .sort({ createdAt: -1 })
        .limit(filters.limit)
        .skip(filters.skip),
      Inventory.countDocuments(query),
    ]);

    return { inventory, total };
  }
}
