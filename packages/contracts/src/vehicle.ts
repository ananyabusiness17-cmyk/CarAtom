import { z } from 'zod';

export const VehicleSchema = z.object({
  id: z.string(),
  make: z.string(),
  model: z.string(),
  year: z.number().int(),
  fuel_type: z.string(),
  transmission: z.string(),
  is_archived: z.boolean(),
  created_at: z.string(),
  mileage_km: z.number().int().nullable().optional(),
});
export type Vehicle = z.infer<typeof VehicleSchema>;

export const VehicleListResponseSchema = z.object({
  items: z.array(VehicleSchema),
});
export type VehicleListResponse = z.infer<typeof VehicleListResponseSchema>;

export const VehicleWriteSchema = z.object({
  make: z.string(),
  model: z.string(),
  year: z.number().int(),
  fuel_type: z.string(),
  transmission: z.string(),
  mileage_km: z.number().int().nullable().optional(),
});
export type VehicleWrite = z.infer<typeof VehicleWriteSchema>;
