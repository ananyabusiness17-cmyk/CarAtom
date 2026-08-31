import { z } from 'zod';

import { FlowDecisionSchema } from './flow-decision';
import { JobCardSchema, VehicleContextSchema } from './job-card';

export const FinalizationRequestSchema = z.object({
  customer: z.object({
    full_name: z.string(),
    phone_e164: z.string(),
  }),
  address: z.object({
    line1: z.string(),
    locality: z.string(),
    city: z.string().optional(),
    postal_code: z.string(),
    latitude: z.number().nullable().optional(),
    longitude: z.number().nullable().optional(),
    line2: z.string().nullable().optional(),
  }),
  vehicle: VehicleContextSchema,
  save_vehicle: z.boolean().default(true),
  save_address: z.boolean().default(true),
});
export type FinalizationRequest = z.infer<typeof FinalizationRequestSchema>;

export const FinalizationResponseSchema = z.object({
  job_card: JobCardSchema,
  address_id: z.string(),
  vehicle_id: z.string(),
  flow_decision: FlowDecisionSchema,
});
export type FinalizationResponse = z.infer<typeof FinalizationResponseSchema>;

export const AddressSchema = z.object({
  id: z.string(),
  line1: z.string(),
  locality: z.string(),
  city: z.string(),
  postal_code: z.string(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  is_default: z.boolean(),
  is_archived: z.boolean(),
  created_at: z.string(),
});
export type Address = z.infer<typeof AddressSchema>;

export const AddressListResponseSchema = z.object({
  items: z.array(AddressSchema),
});
export type AddressListResponse = z.infer<typeof AddressListResponseSchema>;

export const AddressWriteSchema = z.object({
  line1: z.string(),
  locality: z.string(),
  city: z.string().optional(),
  postal_code: z.string(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  line2: z.string().nullable().optional(),
  label: z.string().nullable().optional(),
  is_default: z.boolean().optional(),
});
export type AddressWrite = z.infer<typeof AddressWriteSchema>;
