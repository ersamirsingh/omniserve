import { z } from "zod";
import { MEDIA_FOLDERS, MAX_IMAGE_SIZE } from "./media.constants.js";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid MongoDB ObjectId");

const folderValues = Object.values(MEDIA_FOLDERS) as string[];

export const signatureRequestSchema = z.object({
  folder: z.string().refine((val) => folderValues.includes(val), {
    message: `Folder must be one of: ${folderValues.join(", ")}`,
  }),
  outletId: objectIdSchema.optional(),
});

export const registerAssetSchema = z.object({
  publicId: z.string().min(1, "Public ID is required"),
  secureUrl: z.string().url("Secure URL must be a valid URL"),
  folder: z.string().refine((val) => folderValues.includes(val), {
    message: `Folder must be one of: ${folderValues.join(", ")}`,
  }),
  format: z.string().min(1, "Format is required"),
  width: z.number().int().positive().optional().nullable(),
  height: z.number().int().positive().optional().nullable(),
  bytes: z.number().int().nonnegative().max(MAX_IMAGE_SIZE, `File size cannot exceed ${MAX_IMAGE_SIZE} bytes (5MB)`),
  version: z.string().optional().nullable(),
  uploadedAt: z.preprocess((val) => {
    if (typeof val === 'string' || val instanceof Date) return new Date(val);
    return val;
  }, z.date()).optional().nullable(),
  outletId: objectIdSchema.optional().nullable(),
});
