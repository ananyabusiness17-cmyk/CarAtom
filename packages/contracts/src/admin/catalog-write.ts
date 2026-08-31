import { z } from 'zod';

export const CatalogOfferingRowSchema = z.object({
  slug: z.string(),
  name: z.string(),
  display_price_minor: z.number().int().nullable().optional(),
  display_label: z.string(),
  kind: z.string(),
  is_active: z.boolean(),
  version: z.number().int().optional(),
  duration_minutes: z.number().int().nullable().optional(),
  flow_policy: z.string().nullable().optional(),
  id: z.string().optional(),
});

export const CatalogOverviewSchema = z.object({
  offerings: z.array(CatalogOfferingRowSchema),
  parts_advance_percent: z.number().int(),
  second_vehicle_discount_percent: z.number().int(),
  service_hours: z.record(z.unknown()).nullable().optional(),
  service_radius_km: z.number().int().nullable().optional(),
  note: z.string().optional(),
});
export type CatalogOverview = z.infer<typeof CatalogOverviewSchema>;

export const PatchOfferingResponseSchema = z.object({
  slug: z.string(),
  display_price_minor: z.number().int().nullable().optional(),
  version: z.number().int(),
  effective_at: z.string(),
  audit_id: z.string(),
});
export type PatchOfferingResponse = z.infer<typeof PatchOfferingResponseSchema>;
