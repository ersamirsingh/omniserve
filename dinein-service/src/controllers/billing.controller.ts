import type { Request, Response } from 'express';
import { ApiResponse } from '../utils/ApiResponse.js';
import { BillingService } from '../services/billing.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getRequestScope } from '../utils/requestScope.js';
import { routeParam } from '../utils/http.js';

const billingService = new BillingService();

export const generateBill = asyncHandler(async (req: Request, res: Response) => {
  const bill = await billingService.generate(getRequestScope(req), req.body);
  return ApiResponse.created(res, bill, 'Bill generated');
});

export const getBillBySession = asyncHandler(async (req: Request, res: Response) => {
  const bill = await billingService.getBySession(getRequestScope(req), routeParam(req, 'sessionId'));
  return ApiResponse.success(res, bill, 'Bill fetched');
});

export const recordPayment = asyncHandler(async (req: Request, res: Response) => {
  const bill = await billingService.recordPayment(
    getRequestScope(req),
    routeParam(req, 'billId'),
    req.body.amount
  );
  return ApiResponse.success(res, bill, 'Payment recorded');
});
