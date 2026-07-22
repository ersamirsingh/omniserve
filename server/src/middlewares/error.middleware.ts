import { Request, Response, NextFunction } from 'express';
import { AppError } from "../utils/apiError.js";
import { ApiResponseHandler } from "../utils/apiResponse.js";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {

  console.error('Error encountered in request:', err);

  if (err instanceof AppError) {
    return ApiResponseHandler.error(res, err.statusCode, err.message);
  }

  if (err.name === 'ValidationError') {
    return ApiResponseHandler.badRequest(res, err.message);
  }

  if (err.name === 'CastError') {
    return ApiResponseHandler.badRequest(res, `Invalid input format: path '${err.path}' is invalid.`);
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return ApiResponseHandler.badRequest(res, `Duplicate value for field '${field}'. Please use a unique value.`);
  }

  if (err.name === 'JsonWebTokenError') {
    return ApiResponseHandler.unauthorized(res, 'Invalid token. Please log in again.');
  }

  if (err.name === 'TokenExpiredError') {
    return ApiResponseHandler.unauthorized(res, 'Your token has expired. Please log in again.');
  }

  const message = err instanceof Error ? err.message : 'Internal server error';
  return ApiResponseHandler.internalError(res, message);
};
