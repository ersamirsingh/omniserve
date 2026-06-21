
import { z } from "zod";

/**
 * Common Date Range Schema
 */
export const dateRangeSchema = z.object({
  startDate: z
    .string()
    .min(1, "startDate is required")
    .datetime(),

  endDate: z
    .string()
    .min(1, "endDate is required")
    .datetime(),
});

/**
 * Dashboard Filter
 */
export const dashboardSchema = z.object({
  outletId: z.string().optional(),
});

/**
 * Revenue Trend Validation
 */
export const revenueTrendSchema =
  dateRangeSchema.extend({
    outletId: z.string().optional(),
  });

/**
 * Top Selling Items Validation
 */
export const topItemsSchema =
  dateRangeSchema.extend({
    limit: z
      .coerce
      .number()
      .min(1)
      .max(100)
      .default(10),

    outletId: z.string().optional(),
  });

/**
 * Peak Hours Validation
 */
export const peakHoursSchema =
  dateRangeSchema.extend({
    outletId: z.string().optional(),
  });

/**
 * Customer Retention Validation
 */
export const customerRetentionSchema =
  dateRangeSchema;

/**
 * Outlet Comparison Validation
 */
export const outletComparisonSchema =
  z.object({});

/**
 * Revenue Growth Validation
 */
export const revenueGrowthSchema =
  z.object({
    currentStart: z.string().datetime(),

    currentEnd: z.string().datetime(),

    previousStart: z.string().datetime(),

    previousEnd: z.string().datetime(),

    outletId: z.string().optional(),
  });

/**
 * Export Report Validation
 */
export const exportReportSchema =
  dateRangeSchema.extend({
    format: z.enum([
      "pdf",
      "excel",
      "csv",
    ]),
  });

/**
 * Analytics Query Types
 */

export type DashboardQuery =
  z.infer<typeof dashboardSchema>;

export type RevenueTrendQuery =
  z.infer<typeof revenueTrendSchema>;

export type TopItemsQuery =
  z.infer<typeof topItemsSchema>;

export type PeakHoursQuery =
  z.infer<typeof peakHoursSchema>;

export type CustomerRetentionQuery =
  z.infer<
    typeof customerRetentionSchema
  >;

export type OutletComparisonQuery =
  z.infer<
    typeof outletComparisonSchema
  >;

export type RevenueGrowthQuery =
  z.infer<
    typeof revenueGrowthSchema
  >;

export type ExportReportQuery =
  z.infer<
    typeof exportReportSchema
  >;