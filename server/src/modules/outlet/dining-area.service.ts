import { Types } from "mongoose";
import DiningArea, { IDiningArea } from "../../models/diningarea.model.js";
import Table from "../../models/table.model.js";
import { EventBusService } from "../../events/eventBus.js";
import { escapeRegex } from "../../utils/sanitize.utils.js";

export class DiningAreaService {

  static async createDiningArea(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId,
    payload: { name: string; description?: string; displayOrder?: number; isActive?: boolean },
    triggeredById?: string
  ): Promise<IDiningArea> {
    if (!payload.name) {
      throw new Error("Dining area name is required");
    }
    const nameClean = payload.name.trim();
    if (!nameClean) {
      throw new Error("Dining area name cannot be empty");
    }

    const existing = await DiningArea.findOne({
      tenantId: new Types.ObjectId(tenantId),
      outletId: new Types.ObjectId(outletId),
      name: { $regex: new RegExp(`^${escapeRegex(nameClean)}$`, "i") },
      isDeleted: false
    });
    if (existing) {
      throw new Error(`Dining area name "${nameClean}" already exists in this outlet`);
    }

    const diningArea = new DiningArea({
      tenantId: new Types.ObjectId(tenantId),
      outletId: new Types.ObjectId(outletId),
      name: nameClean,
      description: payload.description,
      displayOrder: payload.displayOrder || 0,
      isActive: payload.isActive !== undefined ? payload.isActive : true
    });

    await diningArea.save();

    await EventBusService.publishDiningAreaCreated(
      tenantId,
      outletId,
      diningArea._id,
      {
        diningAreaId: diningArea._id.toString(),
        name: diningArea.name,
        action: "CREATE",
        updatedAt: new Date()
      },
      { createdBy: triggeredById, sourceSystem: "SYSTEM" }
    );

    return diningArea;
  }

  static async updateDiningArea(
    tenantId: string | Types.ObjectId,
    outletId: string | Types.ObjectId,
    areaId: string | Types.ObjectId,
    payload: { name?: string; description?: string; displayOrder?: number; isActive?: boolean },
    triggeredById?: string
  ): Promise<IDiningArea> {
    const updateData: any = {};

    if (payload.name !== undefined) {
      const nameClean = payload.name.trim();
      if (!nameClean) {
        throw new Error("Dining area name cannot be empty");
      }

      const existing = await DiningArea.findOne({
        _id: { $ne: new Types.ObjectId(areaId) },
        tenantId: new Types.ObjectId(tenantId),
        outletId: new Types.ObjectId(outletId),
        name: { $regex: new RegExp(`^${escapeRegex(nameClean)}$`, "i") },
        isDeleted: false
      });
      if (existing) {
        throw new Error(`Dining area name "${nameClean}" already exists in this outlet`);
      }
      updateData.name = nameClean;
    }

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

    await EventBusService.publishDiningAreaUpdated(
      tenantId,
      outletId,
      diningArea._id,
      {
        diningAreaId: diningArea._id.toString(),
        name: diningArea.name,
        action: "UPDATE",
        updatedAt: new Date()
      },
      { createdBy: triggeredById, sourceSystem: "SYSTEM" }
    );

    return diningArea;
  }

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

    await EventBusService.publishDiningAreaArchived(
      tenantId,
      outletId,
      diningArea._id,
      {
        diningAreaId: diningArea._id.toString(),
        name: diningArea.name,
        action: "DELETE",
        updatedAt: new Date()
      },
      { createdBy: triggeredById, sourceSystem: "SYSTEM" }
    );

    return diningArea;
  }
}
