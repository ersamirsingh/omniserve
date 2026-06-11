import { Types } from 'mongoose';
import Variant, { IVariant } from '../models/variant.model.js';
import MenuItem from '../models/menuitems.model.js';

export class VariantService {
  /**
   * Validate that the parent menu item exists, belongs to the tenant, and is active (not soft-deleted)
   */
  static async validateMenuItemOwnership(menuItemId: string, tenantId: string): Promise<boolean> {
    try {
      const menuItem = await MenuItem.findOne({
        _id: new Types.ObjectId(menuItemId),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      });
      return !!menuItem;
    } catch {
      return false;
    }
  }

  /**
   * Create a new variant under a menu item
   */
  static async createVariant(
    tenantId: string,
    data: any,
    userId?: string
  ): Promise<IVariant> {
    const isOwner = await this.validateMenuItemOwnership(data.menuItemId, tenantId);
    if (!isOwner) {
      throw new Error('Menu item not found or does not belong to this tenant');
    }

    const variant = new Variant({
      ...data,
      menuItemId: new Types.ObjectId(data.menuItemId),
      tenantId: new Types.ObjectId(tenantId),
      isAvailable: data.isAvailable !== undefined ? !!data.isAvailable : true,
      isDeleted: false,
      createdBy: userId ? new Types.ObjectId(userId) : null,
      updatedBy: userId ? new Types.ObjectId(userId) : null,
    });

    return await variant.save();
  }

  /**
   * Retrieve list of variants for a parent menu item
   */
  static async getVariants(tenantId: string, menuItemId: string): Promise<IVariant[]> {
    return await Variant.find({
      menuItemId: new Types.ObjectId(menuItemId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    }).sort({ createdAt: 1 });
  }

  /**
   * Retrieve variant by ID and tenant ID
   */
  static async getVariantById(id: string, tenantId: string): Promise<IVariant | null> {
    return await Variant.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });
  }

  /**
   * Replace/Update variant details (PUT replacement)
   */
  static async updateVariant(
    id: string,
    tenantId: string,
    data: any,
    userId?: string
  ): Promise<IVariant | null> {
    // Validate parent menu item ownership if it's changing or provided
    if (data.menuItemId) {
      const isOwner = await this.validateMenuItemOwnership(data.menuItemId, tenantId);
      if (!isOwner) {
        throw new Error('Menu item not found or does not belong to this tenant');
      }
    }

    const updatePayload: any = {
      name: data.name,
      price: data.price,
      isAvailable: data.isAvailable !== undefined ? !!data.isAvailable : true,
      updatedBy: userId ? new Types.ObjectId(userId) : null,
    };

    if (data.menuItemId) {
      updatePayload.menuItemId = new Types.ObjectId(data.menuItemId);
    }

    return await Variant.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      },
      updatePayload,
      { new: true }
    );
  }

  /**
   * Soft-delete a variant
   */
  static async deleteVariant(
    id: string,
    tenantId: string,
    userId?: string
  ): Promise<IVariant | null> {
    return await Variant.findOneAndUpdate(
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
  }
}
