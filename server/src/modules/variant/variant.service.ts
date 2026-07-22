import { Types } from 'mongoose';
import Variant, { IVariant } from "../../models/variant.model.js";
import MenuItem from "../../models/menuItem.model.js";
import { EventBusService } from "../../events/eventBus.js";

export class VariantService {

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

    const saved = await variant.save();

    const menuItem = await MenuItem.findById(saved.menuItemId);
    if (menuItem) {
      EventBusService.publishMenuChanged(
        tenantId,
        menuItem.outletId,
        saved.menuItemId,
        "MENU_ITEM",
        saved,
        { createdBy: userId }
      ).catch(err => console.error('Failed to publish MENU_CHANGED event for variant create:', err));
    }

    return saved;
  }

  static async getVariants(tenantId: string, menuItemId: string): Promise<IVariant[]> {
    return await Variant.find({
      menuItemId: new Types.ObjectId(menuItemId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    }).sort({ createdAt: 1 });
  }

  static async getVariantById(id: string, tenantId: string): Promise<IVariant | null> {
    return await Variant.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });
  }

  static async updateVariant(
    id: string,
    tenantId: string,
    data: any,
    userId?: string
  ): Promise<IVariant | null> {

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

    const updated = await Variant.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      },
      updatePayload,
      { new: true }
    );

    if (updated) {
      const menuItem = await MenuItem.findById(updated.menuItemId);
      if (menuItem) {
        EventBusService.publishMenuChanged(
          tenantId,
          menuItem.outletId,
          updated.menuItemId,
          "MENU_ITEM",
          updated,
          { createdBy: userId }
        ).catch(err => console.error('Failed to publish MENU_CHANGED event for variant update:', err));
      }
    }

    return updated;
  }

  static async deleteVariant(
    id: string,
    tenantId: string,
    userId?: string
  ): Promise<IVariant | null> {
    const deleted = await Variant.findOneAndUpdate(
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

    if (deleted) {
      const menuItem = await MenuItem.findById(deleted.menuItemId);
      if (menuItem) {
        EventBusService.publishMenuChanged(
          tenantId,
          menuItem.outletId,
          deleted.menuItemId,
          "MENU_ITEM",
          deleted,
          { createdBy: userId }
        ).catch(err => console.error('Failed to publish MENU_CHANGED event for variant delete:', err));
      }
    }

    return deleted;
  }
}
