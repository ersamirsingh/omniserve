import type { Request, Response } from 'express';
import { ApiResponse } from '../utils/ApiResponse.js';
import { FloorService } from '../services/floor.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getRequestScope } from '../utils/requestScope.js';

const floorService = new FloorService();

export const createFloor = asyncHandler(async (req: Request, res: Response) => {
  const floor = await floorService.createFloor(getRequestScope(req), req.body);
  return ApiResponse.created(res, floor, 'Floor created');
});

export const createSection = asyncHandler(async (req: Request, res: Response) => {
  const section = await floorService.createSection(getRequestScope(req), req.body);
  return ApiResponse.created(res, section, 'Section created');
});

export const getFloorMap = asyncHandler(async (req: Request, res: Response) => {
  const floorMap = await floorService.getFloorMap(getRequestScope(req));
  return ApiResponse.success(res, floorMap, 'Floor map fetched');
});
