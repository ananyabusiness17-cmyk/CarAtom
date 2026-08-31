import { z } from 'zod';

import { FlowDecisionSchema } from './flow-decision';
import { MoneySchema } from './catalog';

export const EstimateLineSchema = z.object({
  label: z.string(),
  amount_minor: z.number().int(),
  kind: z.string(),
  is_included: z.boolean().default(false),
  was_amount_minor: z.number().int().nullable().optional(),
  change_type: z.string().nullable().optional(),
  repair_offering_slug: z.string().nullable().optional(),
});

export const EstimateSchema = z.object({
  id: z.string(),
  version: z.number().int(),
  status: z.string(),
  total: MoneySchema.pick({ amount_minor: true, currency: true }),
  expires_at: z.string().nullable().optional(),
  content_hash: z.string(),
  source: z.string().nullable().optional(),
  parts_advance_amount_minor: z.number().int().nullable().optional(),
  line_items: z.array(EstimateLineSchema),
});
export type Estimate = z.infer<typeof EstimateSchema>;

export const PriceResponseSchema = z.object({
  estimate: EstimateSchema,
  flow_decision: FlowDecisionSchema,
});
export type PriceResponse = z.infer<typeof PriceResponseSchema>;

export const AcceptEstimateRequestSchema = z.object({
  expected_total_minor: z.number().int(),
  expected_content_hash: z.string(),
});
export type AcceptEstimateRequest = z.infer<typeof AcceptEstimateRequestSchema>;

export const AcceptEstimateResponseSchema = z.object({
  acceptance: z.object({
    id: z.string(),
    accepted_at: z.string(),
    accepted_total_minor: z.number().int(),
  }),
  flow_decision: FlowDecisionSchema,
});
export type AcceptEstimateResponse = z.infer<typeof AcceptEstimateResponseSchema>;
