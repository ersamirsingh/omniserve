import type { Request } from 'express';
import { ApiError } from './ApiError.js';

export const routeParam = (req: Request, key: string): string => {
  const value = req.params[key];

  if (typeof value !== 'string' || value.length === 0) {
    throw ApiError.badRequest(`Missing route param: ${key}`);
  }

  return value;
};
