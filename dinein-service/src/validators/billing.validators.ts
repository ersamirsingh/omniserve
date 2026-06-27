import { z } from 'zod';
import { DineInPaymentMethod, SplitType } from '../constants/table-states.constants.js';
import { objectIdSchema } from './common.validators.js';

export const generateBillSchema = z.object({
  sessionId: objectIdSchema,
  tableId: objectIdSchema,
  splitType: z.nativeEnum(SplitType).default(SplitType.NO_SPLIT),
  splitCount: z.number().int().min(1).default(1),
  discount: z.number().min(0).default(0),
  couponCode: z.string().max(50).optional(),
  couponDiscount: z.number().min(0).default(0),
  tip: z.number().min(0).default(0),
  serviceChargeRate: z.number().min(0).max(100).default(5),
  notes: z.string().max(500).optional(),
});

export const recordPaymentSchema = z.object({
  method: z.nativeEnum(DineInPaymentMethod),
  amount: z.number().positive(),
});
