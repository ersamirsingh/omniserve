import { z } from 'zod';
import { objectIdSchema } from './common.validators.js';

export const openSessionSchema = z.object({
  tableId: objectIdSchema,
  waiterId: objectIdSchema.optional(),
  hostUserId: objectIdSchema.optional(),
  guestCount: z.number().int().min(1),
  notes: z.string().max(500).optional(),
});

export const joinSessionSchema = z.object({
  guestName: z.string().min(1).max(100),
  seatNumber: z.string().min(1).max(20).optional(),
});

export const closeSessionSchema = z.object({
  notes: z.string().max(500).optional(),
});
