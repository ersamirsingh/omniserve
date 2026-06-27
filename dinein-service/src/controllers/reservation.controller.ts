import type { Request, Response } from 'express';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ReservationService } from '../services/reservation.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getRequestScope } from '../utils/requestScope.js';
import { routeParam } from '../utils/http.js';

const reservationService = new ReservationService();

export const listReservations = asyncHandler(async (req: Request, res: Response) => {
  const reservations = await reservationService.list(getRequestScope(req));
  return ApiResponse.success(res, reservations, 'Reservations fetched');
});

export const createReservation = asyncHandler(async (req: Request, res: Response) => {
  const reservation = await reservationService.create(getRequestScope(req), req.body);
  return ApiResponse.created(res, reservation, 'Reservation created');
});

export const confirmReservation = asyncHandler(async (req: Request, res: Response) => {
  const reservation = await reservationService.confirm(
    getRequestScope(req),
    routeParam(req, 'reservationId'),
    req.body.tableId
  );
  return ApiResponse.success(res, reservation, 'Reservation confirmed');
});

export const cancelReservation = asyncHandler(async (req: Request, res: Response) => {
  const reservation = await reservationService.cancel(
    getRequestScope(req),
    routeParam(req, 'reservationId'),
    req.body.reason
  );
  return ApiResponse.success(res, reservation, 'Reservation cancelled');
});
