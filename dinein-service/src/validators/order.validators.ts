import { z } from 'zod';
import { DineInOrderStatus } from '../constants/table-states.constants.js';
import { objectIdSchema } from './common.validators.js';

const addonSchema = z.object({
  addonId: objectIdSchema,
  name: z.string().min(1).max(100),
  price: z.number().min(0),
});

const orderItemInputSchema = z.object({
  menuItemId: objectIdSchema,
  variantId: objectIdSchema.optional(),
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  category: z.string().max(100).optional(),
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0),
  addons: z.array(addonSchema).default([]),
  notes: z.string().max(300).optional(),
  guestId: objectIdSchema.optional(),
  seatId: objectIdSchema.optional(),
});

export const createOrderSchema = z.object({
  sessionId: objectIdSchema,
  tableId: objectIdSchema,
  sectionId: objectIdSchema,
  guestId: objectIdSchema.optional(),
  waiterId: objectIdSchema.optional(),
  notes: z.string().max(500).optional(),
  items: z.array(orderItemInputSchema).min(1),
});

export const updateOrderStatusSchema = z.object({
  status: z.nativeEnum(DineInOrderStatus),
});
