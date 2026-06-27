import { FloorRepository } from '../repositories/floor.repository.js';
import type { RequestScope } from '../interfaces/request-scope.interface.js';

export class FloorService {
  constructor(private readonly floorRepository = new FloorRepository()) {}

  createFloor(scope: RequestScope, payload: Record<string, unknown>) {
    return this.floorRepository.createFloor(scope, payload);
  }

  createSection(scope: RequestScope, payload: Record<string, unknown>) {
    return this.floorRepository.createSection(scope, payload);
  }

  async getFloorMap(scope: RequestScope) {
    return this.floorRepository.getFloorMap(scope);
  }
}
