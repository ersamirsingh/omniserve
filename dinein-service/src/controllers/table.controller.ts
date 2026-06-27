import type { Request, Response } from 'express';
import { ApiResponse } from '../utils/ApiResponse.js';
import { TableService } from '../services/table.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getRequestScope } from '../utils/requestScope.js';
import { routeParam } from '../utils/http.js';

const tableService = new TableService();

export const listTables = asyncHandler(async (req: Request, res: Response) => {
  const tables = await tableService.list(getRequestScope(req));
  return ApiResponse.success(res, tables, 'Tables fetched');
});

export const createTable = asyncHandler(async (req: Request, res: Response) => {
  const table = await tableService.create(getRequestScope(req), req.body);
  return ApiResponse.created(res, table, 'Table created');
});

export const updateTable = asyncHandler(async (req: Request, res: Response) => {
  const table = await tableService.update(getRequestScope(req), routeParam(req, 'tableId'), req.body);
  return ApiResponse.success(res, table, 'Table updated');
});

export const deleteTable = asyncHandler(async (req: Request, res: Response) => {
  await tableService.remove(getRequestScope(req), routeParam(req, 'tableId'));
  return ApiResponse.noContent(res);
});

export const moveTable = asyncHandler(async (req: Request, res: Response) => {
  const table = await tableService.move(getRequestScope(req), routeParam(req, 'tableId'), req.body);
  return ApiResponse.success(res, table, 'Table moved');
});

export const changeTableStatus = asyncHandler(async (req: Request, res: Response) => {
  const table = await tableService.changeStatus(getRequestScope(req), routeParam(req, 'tableId'), req.body.status);
  return ApiResponse.success(res, table, 'Table status updated');
});

export const reserveTable = asyncHandler(async (req: Request, res: Response) => {
  const table = await tableService.reserve(getRequestScope(req), routeParam(req, 'tableId'), routeParam(req, 'reservationId'));
  return ApiResponse.success(res, table, 'Table reserved');
});

export const releaseTable = asyncHandler(async (req: Request, res: Response) => {
  const table = await tableService.release(getRequestScope(req), routeParam(req, 'tableId'));
  return ApiResponse.success(res, table, 'Table released');
});

export const mergeTables = asyncHandler(async (req: Request, res: Response) => {
  const table = await tableService.merge(
    getRequestScope(req),
    req.body.primaryTableId,
    req.body.secondaryTableIds
  );
  return ApiResponse.success(res, table, 'Tables merged');
});

export const splitTables = asyncHandler(async (req: Request, res: Response) => {
  const table = await tableService.split(getRequestScope(req), req.body.primaryTableId);
  return ApiResponse.success(res, table, 'Tables split');
});

export const assignWaiter = asyncHandler(async (req: Request, res: Response) => {
  const table = await tableService.assignWaiter(getRequestScope(req), routeParam(req, 'tableId'), req.body.waiterId);
  return ApiResponse.success(res, table, 'Waiter assigned');
});

export const transferWaiter = asyncHandler(async (req: Request, res: Response) => {
  const table = await tableService.assignWaiter(
    getRequestScope(req),
    routeParam(req, 'tableId'),
    req.body.waiterId,
    true
  );
  return ApiResponse.success(res, table, 'Waiter transferred');
});

export const lockTable = asyncHandler(async (req: Request, res: Response) => {
  const table = await tableService.lock(getRequestScope(req), routeParam(req, 'tableId'), req.body.reason);
  return ApiResponse.success(res, table, 'Table locked');
});

export const unlockTable = asyncHandler(async (req: Request, res: Response) => {
  const table = await tableService.unlock(getRequestScope(req), routeParam(req, 'tableId'));
  return ApiResponse.success(res, table, 'Table unlocked');
});
