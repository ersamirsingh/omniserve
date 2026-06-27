import { z } from 'zod';
import { objectIdSchema } from './common.validators.js';

export const createReservationSchema = z.object({
  tableId: objectIdSchema.optional(),
  customerName: z.string().min(1).max(100),
  customerPhone: z.string().min(5).max(20),
  customerEmail: z.string().email().optional(),
  partySize: z.number().int().min(1),
  reservedFor: z.coerce.date(),
  notes: z.string().max(500).optional(),
  specialRequests: z.string().max(500).optional(),
});

export const confirmReservationSchema = z.object({
  tableId: objectIdSchema.optional(),
});

export const cancelReservationSchema = z.object({
  reason: z.string().min(1).max(300),
});
