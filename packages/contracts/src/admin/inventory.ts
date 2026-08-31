import { z } from 'zod';

export const SkuStockSchema = z.object({
  id: z.string(),
  sku_code: z.string(),
  name: z.string(),
  oem_code: z.string().nullable().optional(),
  unit: z.string(),
  stock_by_location: z.record(z.number()),
  total_quantity: z.number().int(),
  low_stock_threshold: z.number().int(),
  is_low_stock: z.boolean(),
  is_active: z.boolean().optional(),
});
export type SkuStock = z.infer<typeof SkuStockSchema>;

export const SkuListResponseSchema = z.object({
  items: z.array(SkuStockSchema),
  next_cursor: z.string().nullable().optional(),
  low_stock_count: z.number().int().optional(),
});
export type SkuListResponse = z.infer<typeof SkuListResponseSchema>;

export const MovementResponseSchema = z.object({
  movement_id: z.string(),
  sku_id: z.string(),
  stock_by_location: z.record(z.number()),
  total_quantity: z.number().int(),
  audit_id: z.string(),
});
export type MovementResponse = z.infer<typeof MovementResponseSchema>;

export const JobUsageLineSchema = z.object({
  sku_code: z.string(),
  sku_name: z.string(),
  quantity: z.number(),
  visit_label: z.string(),
  visit_id: z.string().nullable().optional(),
  job_part_id: z.string(),
});

export const JobUsageResponseSchema = z.object({
  job_card_id: z.string(),
  job_card_ref: z.string(),
  customer_name: z.string().nullable().optional(),
  vehicle_summary: z.string().nullable().optional(),
  technician_name: z.string().nullable().optional(),
  items: z.array(JobUsageLineSchema),
});
export type JobUsageResponse = z.infer<typeof JobUsageResponseSchema>;

export const PartsHistoryResponseSchema = z.object({
  customer_id: z.string(),
  customer_name: z.string().nullable().optional(),
  vehicles: z.array(
    z.object({
      vehicle_id: z.string().nullable().optional(),
      vehicle_label: z.string(),
      jobs: z.array(
        z.object({
          job_card_id: z.string(),
          job_card_ref: z.string(),
          sku_labels: z.string(),
          completed_at: z.string().nullable().optional(),
        }),
      ),
    }),
  ),
});
export type PartsHistoryResponse = z.infer<typeof PartsHistoryResponseSchema>;

export const SkuDetailSchema = z.object({
  sku: SkuStockSchema,
  stock: z.array(z.object({ location_code: z.string(), quantity: z.number().int() })),
  movements: z.array(z.record(z.unknown())),
  next_cursor: z.string().nullable().optional(),
  used_by: z
    .array(
      z.object({
        owner_type: z.string(),
        owner_slug: z.string(),
        owner_name: z.string(),
      }),
    )
    .optional(),
});
export type SkuDetail = z.infer<typeof SkuDetailSchema>;
