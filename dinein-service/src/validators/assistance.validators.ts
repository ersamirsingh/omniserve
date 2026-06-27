import { z } from 'zod';
import { AssistanceType } from '../constants/table-states.constants.js';
import { objectIdSchema } from './common.validators.js';

export const createAssistanceSchema = z.object({
  sessionId: objectIdSchema,
  tableId: objectIdSchema,
  guestId: objectIdSchema.optional(),
  seatId: objectIdSchema.optional(),
  type: z.nativeEnum(AssistanceType),
  customMessage: z.string().max(300).optional(),
});

export const resolveAssistanceSchema = z.object({
  assignedWaiterId: objectIdSchema.optional(),
});
