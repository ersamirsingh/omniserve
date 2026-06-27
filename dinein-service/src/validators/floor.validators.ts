import { z } from 'zod';
import { objectIdSchema } from './common.validators.js';
import { SectionType, TableShape, TableStatus } from '../constants/table-states.constants.js';

export const createFloorSchema = z.object({
  name: z.string().min(1).max(100),
  floorNumber: z.number().int().min(0),
  description: z.string().max(300).optional(),
});

export const createSectionSchema = z.object({
  floorId: objectIdSchema,
  name: z.string().min(1).max(100),
  type: z.nativeEnum(SectionType).default(SectionType.INDOOR),
  description: z.string().max(300).optional(),
  capacity: z.number().int().min(0).optional(),
  displayOrder: z.number().int().min(0).default(0),
});

export const createTableSchema = z.object({
  floorId: objectIdSchema,
  sectionId: objectIdSchema,
  tableNumber: z.string().min(1).max(20),
  displayName: z.string().max(50).optional(),
  capacity: z.number().int().min(1).max(100),
  minCapacity: z.number().int().min(1).max(100).optional(),
  shape: z.nativeEnum(TableShape).default(TableShape.SQUARE),
  position: z.object({
    x: z.number().default(0),
    y: z.number().default(0),
    width: z.number().positive().default(80),
    height: z.number().positive().default(80),
    rotation: z.number().default(0),
  }),
  tags: z.array(z.string().min(1)).default([]),
});

export const updateTableSchema = createTableSchema.partial();

export const moveTableSchema = z.object({
  floorId: objectIdSchema.optional(),
  sectionId: objectIdSchema.optional(),
  position: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number().positive().optional(),
    height: z.number().positive().optional(),
    rotation: z.number().optional(),
  }),
});

export const changeTableStatusSchema = z.object({
  status: z.nativeEnum(TableStatus),
});

export const mergeTablesSchema = z.object({
  primaryTableId: objectIdSchema,
  secondaryTableIds: z.array(objectIdSchema).min(1),
});

export const splitTablesSchema = z.object({
  primaryTableId: objectIdSchema,
});

export const assignWaiterSchema = z.object({
  waiterId: objectIdSchema,
});

export const lockTableSchema = z.object({
  reason: z.string().min(1).max(200),
});
