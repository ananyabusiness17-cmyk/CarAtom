import { z } from 'zod';

export const KitAvailabilityStateSchema = z.enum(['ON_VAN', 'IN_WH', 'SHORT', 'LABOUR']);
export type KitAvailabilityState = z.infer<typeof KitAvailabilityStateSchema>;

export const KitLineSchema = z.object({
  sku_id: z.string().nullable().optional(),
  sku_code: z.string().nullable().optional(),
  label: z.string(),
  quantity: z.number(),
  line_kind: z.enum(['LABOUR', 'PART']),
  van_qty: z.number().int().nullable().optional(),
  wh_qty: z.number().int().nullable().optional(),
  availability: KitAvailabilityStateSchema,
});
export type KitLine = z.infer<typeof KitLineSchema>;

export const VisitKitSchema = z.object({
  visit_id: z.string().optional(),
  job_card_id: z.string(),
  van_code: z.string().nullable().optional(),
  lines: z.array(KitLineSchema),
  warnings: z.array(z.string()).default([]),
});
export type VisitKit = z.infer<typeof VisitKitSchema>;

export const DispatchLaneVisitSchema = z.object({
  visit_id: z.string(),
  job_card_id: z.string(),
  job_card_ref: z.string(),
  vehicle_label: z.string(),
  visit_window_label: z.string().nullable(),
  status: z.string(),
  scheduled_start_at: z.string(),
  scheduled_end_at: z.string(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
});
export type DispatchLaneVisit = z.infer<typeof DispatchLaneVisitSchema>;

export const CloseoutQueueSchema = z.enum([
  'estimate_unpublished',
  'invoice_missing',
  'payment_missing',
  'consume_gap',
  'qc_incomplete',
]);
export type CloseoutQueue = z.infer<typeof CloseoutQueueSchema>;

export const CloseoutItemSchema = z.object({
  job_card_id: z.string(),
  job_card_ref: z.string(),
  visit_id: z.string().nullable().optional(),
  queue: CloseoutQueueSchema,
  summary: z.string(),
  href: z.string(),
});
export type CloseoutItem = z.infer<typeof CloseoutItemSchema>;

export const CloseoutListSchema = z.object({
  queue: CloseoutQueueSchema,
  items: z.array(CloseoutItemSchema),
});
export type CloseoutList = z.infer<typeof CloseoutListSchema>;

export const CatalogKitLineSchema = z.object({
  id: z.string().optional(),
  sku_id: z.string().nullable().optional(),
  sku_code: z.string().nullable().optional(),
  sku_name: z.string().nullable().optional(),
  quantity: z.number().int().positive(),
  line_kind: z.enum(['LABOUR', 'PART']),
  label: z.string().nullable().optional(),
});
export type CatalogKitLine = z.infer<typeof CatalogKitLineSchema>;

export const CatalogKitSchema = z.object({
  owner_type: z.enum(['SERVICE_OFFERING', 'REPAIR_OFFERING']),
  owner_id: z.string(),
  owner_slug: z.string().optional(),
  lines: z.array(CatalogKitLineSchema),
});
export type CatalogKit = z.infer<typeof CatalogKitSchema>;

export const VehicleServiceLogSchema = z.object({
  id: z.string(),
  vehicle_id: z.string(),
  visit_id: z.string().nullable().optional(),
  offering_slug: z.string().nullable().optional(),
  invoice_total_minor: z.number().int().nullable().optional(),
  odometer_km: z.number().int().nullable().optional(),
  notes: z.string().nullable().optional(),
  created_at: z.string(),
});
export type VehicleServiceLog = z.infer<typeof VehicleServiceLogSchema>;

export const VehicleServiceLogListSchema = z.object({
  items: z.array(VehicleServiceLogSchema),
});
export type VehicleServiceLogList = z.infer<typeof VehicleServiceLogListSchema>;

export const MassAssignResultSchema = z.object({
  assigned: z.array(z.string()),
  failed: z.array(
    z.object({
      job_card_id: z.string(),
      code: z.string(),
      message: z.string(),
      details: z.record(z.unknown()).optional(),
    }),
  ),
});
export type MassAssignResult = z.infer<typeof MassAssignResultSchema>;
