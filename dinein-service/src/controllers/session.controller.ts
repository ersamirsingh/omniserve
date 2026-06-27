import type { Request, Response } from 'express';
import { ApiResponse } from '../utils/ApiResponse.js';
import { SessionService } from '../services/session.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getRequestScope } from '../utils/requestScope.js';
import { routeParam } from '../utils/http.js';

const sessionService = new SessionService();

export const listSessions = asyncHandler(async (req: Request, res: Response) => {
  const sessions = await sessionService.listActive(getRequestScope(req));
  return ApiResponse.success(res, sessions, 'Active sessions fetched');
});

export const openSession = asyncHandler(async (req: Request, res: Response) => {
  const data = await sessionService.open(getRequestScope(req), req.body);
  return ApiResponse.created(res, data, 'Session opened');
});

export const joinSession = asyncHandler(async (req: Request, res: Response) => {
  const data = await sessionService.join(getRequestScope(req), routeParam(req, 'sessionId'), req.body);
  return ApiResponse.success(res, data, 'Guest joined session');
});

export const closeSession = asyncHandler(async (req: Request, res: Response) => {
  const session = await sessionService.close(getRequestScope(req), routeParam(req, 'sessionId'), req.body.notes);
  return ApiResponse.success(res, session, 'Session closed');
});

export const getSession = asyncHandler(async (req: Request, res: Response) => {
  const data = await sessionService.getById(getRequestScope(req), routeParam(req, 'sessionId'));
  return ApiResponse.success(res, data, 'Session fetched');
});
