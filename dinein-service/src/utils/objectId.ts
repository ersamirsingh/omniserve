import mongoose from 'mongoose';
import { ApiError } from './ApiError.js';

export const ensureObjectId = (value: string, field: string): mongoose.Types.ObjectId => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw ApiError.badRequest(`Invalid ${field}`);
  }

  return new mongoose.Types.ObjectId(value);
};
