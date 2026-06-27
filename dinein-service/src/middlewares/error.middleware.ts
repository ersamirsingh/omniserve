import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): Response => {
  logger.error('Request failed', { error });

  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      code: error.code,
      details: error.details,
    });
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'issues' in error &&
    Array.isArray((error as { issues?: unknown }).issues)
  ) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: (error as { issues: unknown[] }).issues,
    });
  }

  if (error instanceof mongoose.Error.ValidationError) {
    return res.status(422).json({
      success: false,
      message: error.message,
      code: 'MONGOOSE_VALIDATION_ERROR',
    });
  }

  if (error instanceof mongoose.Error.CastError) {
    return res.status(400).json({
      success: false,
      message: `Invalid ${error.path}`,
      code: 'INVALID_OBJECT_ID',
    });
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 11000
  ) {
    return res.status(409).json({
      success: false,
      message: 'Duplicate resource',
      code: 'DUPLICATE_RESOURCE',
    });
  }

  return res.status(500).json({
    success: false,
    message: error instanceof Error ? error.message : 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
};
