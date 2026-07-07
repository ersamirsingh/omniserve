import { Types } from "mongoose";
import DiningArea, { IDiningArea } from "../../models/diningarea.model.js";
import Table from "../../models/table.model.js";

export class DiningAreaService {
  /**
   * Create a new Dining Area
   */
  static async createDiningArea(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId,
    payload: { name: string; description?: string; displayOrder?: number; isActive?: boolean },
    triggeredById?: string
  ): Promise<IDiningArea> {
    const diningArea = new DiningArea({
      tenantId: new Types.ObjectId(tenantId),
      outletId: new Types.ObjectId(outletId),
      name: payload.name,
      description: payload.description,
      displayOrder: payload.displayOrder || 0,
      isActive: payload.isActive !== undefined ? payload.isActive : true
    });

    await diningArea.save();
    return diningArea;
  }

  /**
   * Update an existing Dining Area
   */
  static async updateDiningArea(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId,
    areaId: string | Types.ObjectId,
    payload: { name?: string; description?: string; displayOrder?: number; isActive?: boolean },
    triggeredById?: string
  ): Promise<IDiningArea> {
    const updateData: any = {};
    if (payload.name !== undefined) updateData.name = payload.name;
    if (payload.description !== undefined) updateData.description = payload.description;
    if (payload.displayOrder !== undefined) updateData.displayOrder = payload.displayOrder;
    if (payload.isActive !== undefined) updateData.isActive = payload.isActive;

    const diningArea = await DiningArea.findOneAndUpdate(
      { _id: new Types.ObjectId(areaId), tenantId: new Types.ObjectId(tenantId), outletId: new Types.ObjectId(outletId), isDeleted: false },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!diningArea) {
      throw new Error(`DiningArea not found: ${areaId}`);
    }

    return diningArea;
  }

  /**
   * Archive (soft-delete) a Dining Area
   * Fails if it contains active tables.
   */
  static async archiveDiningArea(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId,
    areaId: string | Types.ObjectId,
    triggeredById?: string
  ): Promise<IDiningArea> {
    const activeTablesCount = await Table.countDocuments({
      diningAreaId: new Types.ObjectId(areaId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false
    });

    if (activeTablesCount > 0) {
      throw new Error(`Cannot archive DiningArea containing active tables. Found ${activeTablesCount} table(s).`);
    }

    const diningArea = await DiningArea.findOneAndUpdate(
      { _id: new Types.ObjectId(areaId), tenantId: new Types.ObjectId(tenantId), outletId: new Types.ObjectId(outletId), isDeleted: false },
      { $set: { isDeleted: true, isActive: false } },
      { new: true }
    );

    if (!diningArea) {
      throw new Error(`DiningArea not found: ${areaId}`);
    }

    return diningArea;
  }
}
