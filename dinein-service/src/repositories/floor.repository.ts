import DineInFloor from '../models/dinein-floor.model.js';
import DineInSection from '../models/dinein-section.model.js';
import DineInTable from '../models/dinein-table.model.js';
import type { RequestScope } from '../interfaces/request-scope.interface.js';
import { ensureObjectId } from '../utils/objectId.js';

export class FloorRepository {
  async createFloor(scope: RequestScope, payload: Record<string, unknown>) {
    return DineInFloor.create({
      ...payload,
      tenantId: ensureObjectId(scope.tenantId, 'tenantId'),
      outletId: ensureObjectId(scope.outletId, 'outletId'),
      createdBy: scope.userId ? ensureObjectId(scope.userId, 'userId') : null,
      updatedBy: scope.userId ? ensureObjectId(scope.userId, 'userId') : null,
    });
  }

  async listFloors(scope: RequestScope) {
    return DineInFloor.find({
      tenantId: ensureObjectId(scope.tenantId, 'tenantId'),
      outletId: ensureObjectId(scope.outletId, 'outletId'),
    }).sort({ floorNumber: 1, name: 1 });
  }

  async createSection(scope: RequestScope, payload: Record<string, unknown>) {
    return DineInSection.create({
      ...payload,
      tenantId: ensureObjectId(scope.tenantId, 'tenantId'),
      outletId: ensureObjectId(scope.outletId, 'outletId'),
      createdBy: scope.userId ? ensureObjectId(scope.userId, 'userId') : null,
      updatedBy: scope.userId ? ensureObjectId(scope.userId, 'userId') : null,
    });
  }

  async listSections(scope: RequestScope, floorId?: string) {
    return DineInSection.find({
      tenantId: ensureObjectId(scope.tenantId, 'tenantId'),
      outletId: ensureObjectId(scope.outletId, 'outletId'),
      ...(floorId ? { floorId: ensureObjectId(floorId, 'floorId') } : {}),
    }).sort({ displayOrder: 1, name: 1 });
  }

  async getFloorMap(scope: RequestScope) {
    const [floors, sections, tables] = await Promise.all([
      this.listFloors(scope),
      this.listSections(scope),
      DineInTable.find({
        tenantId: ensureObjectId(scope.tenantId, 'tenantId'),
        outletId: ensureObjectId(scope.outletId, 'outletId'),
      }).sort({ tableNumber: 1 }),
    ]);

    return {
      floors,
      sections,
      tables,
    };
  }
}
