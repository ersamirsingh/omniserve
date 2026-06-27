import type { Request, Response } from 'express';
import { ApiResponse } from '../utils/ApiResponse.js';
import { AssistanceService } from '../services/assistance.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getRequestScope } from '../utils/requestScope.js';
import { routeParam } from '../utils/http.js';

const assistanceService = new AssistanceService();

export const listAssistanceRequests = asyncHandler(async (req: Request, res: Response) => {
  const requests = await assistanceService.list(getRequestScope(req));
  return ApiResponse.success(res, requests, 'Assistance requests fetched');
});

export const createAssistanceRequest = asyncHandler(async (req: Request, res: Response) => {
  const request = await assistanceService.create(getRequestScope(req), req.body);
  return ApiResponse.created(res, request, 'Assistance request created');
});

export const resolveAssistanceRequest = asyncHandler(async (req: Request, res: Response) => {
  const request = await assistanceService.resolve(
    getRequestScope(req),
    routeParam(req, 'requestId'),
    req.body.assignedWaiterId
  );
  return ApiResponse.success(res, request, 'Assistance request resolved');
});
