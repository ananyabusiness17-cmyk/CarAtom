import { z } from 'zod';

import { FlowDecisionSchema } from './flow-decision';

export const VehicleContextSchema = z.object({
  make: z.string(),
  model: z.string(),
  year: z.number().int(),
  fuel_type: z.string(),
  transmission: z.string(),
});
export type VehicleContext = z.infer<typeof VehicleContextSchema>;

export const JobCardItemSchema = z.object({
  id: z.string(),
  kind: z.string(),
  label: z.string(),
  unit_price_minor: z.number().int(),
  currency: z.string().default('INR'),
  repair_offering_slug: z.string().nullable().optional(),
});

export const JobCardConcernSchema = z.object({
  id: z.string(),
  text: z.string(),
});

export const JobCardSchema = z.object({
  id: z.string(),
  public_ref: z.string(),
  status: z.string(),
  flow_policy: z.string(),
  vehicle_context: VehicleContextSchema,
  items: z.array(JobCardItemSchema),
  concerns: z.array(JobCardConcernSchema),
  vehicle_id: z.string().nullable().optional(),
  address_id: z.string().nullable().optional(),
  booking_id: z.string().nullable().optional(),
  customer_progress: z.string().nullable().optional(),
  parts_status: z
    .object({
      all_ready: z.boolean(),
      parts_advance_captured: z.boolean().optional(),
      parts: z.array(z.unknown()).optional(),
      customer_progress: z.string().optional(),
    })
    .nullable()
    .optional(),
  inspection_visit_id: z.string().nullable().optional(),
  repair_visit_id: z.string().nullable().optional(),
  accepted_inspection_estimate_id: z.string().nullable().optional(),
});
export type JobCard = z.infer<typeof JobCardSchema>;

export const JobCardEnvelopeSchema = z.object({
  job_card: JobCardSchema,
  flow_decision: FlowDecisionSchema,
});
export type JobCardEnvelope = z.infer<typeof JobCardEnvelopeSchema>;

export const CreateJobCardRequestSchema = z.object({
  service_offering_slug: z.string(),
  vehicle_context: VehicleContextSchema,
  concerns: z.array(z.object({ text: z.string() })).default([]),
  photo_asset_ids: z.array(z.string()).optional(),
});
export type CreateJobCardRequest = z.infer<typeof CreateJobCardRequestSchema>;

export const PatchJobCardRequestSchema = z.object({
  concerns: z.array(z.object({ text: z.string() })),
});
export type PatchJobCardRequest = z.infer<typeof PatchJobCardRequestSchema>;
