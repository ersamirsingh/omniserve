import type { Request, Response } from 'express';
import { ApiResponse } from '../utils/ApiResponse.js';
import { OrderService } from '../services/order.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getRequestScope } from '../utils/requestScope.js';
import { routeParam } from '../utils/http.js';

const orderService = new OrderService();

export const listOrders = asyncHandler(async (req: Request, res: Response) => {
  const orders = await orderService.list(getRequestScope(req));
  return ApiResponse.success(res, orders, 'Orders fetched');
});

export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const order = await orderService.create(getRequestScope(req), req.body);
  return ApiResponse.created(res, order, 'Order created');
});

export const updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
  const order = await orderService.updateStatus(getRequestScope(req), routeParam(req, 'orderId'), req.body.status);
  return ApiResponse.success(res, order, 'Order status updated');
});
