import { z } from 'zod';

import { EstimateSchema } from './estimate';
import { FlowDecisionSchema } from './flow-decision';
import { JobCardSchema } from './job-card';

export const AdvisorCaseCustomerSchema = z.object({
  id: z.string(),
  status: z.string(),
  safe_status_label: z.string(),
  advisor_display_name: z.string(),
  expected_response_window_minutes: z.number().int(),
  submitted_total_minor: z.number().int(),
  pending_estimate_id: z.string().nullable().optional(),
  pending_estimate: EstimateSchema.nullable().optional(),
});
export type AdvisorCaseCustomer = z.infer<typeof AdvisorCaseCustomerSchema>;

export const AdvisorCaseEnvelopeSchema = z.object({
  advisor_case: AdvisorCaseCustomerSchema,
  flow_decision: FlowDecisionSchema,
});
export type AdvisorCaseEnvelope = z.infer<typeof AdvisorCaseEnvelopeSchema>;

export const RejectEstimateResponseSchema = z.object({
  job_card: JobCardSchema,
  flow_decision: FlowDecisionSchema,
});
export type RejectEstimateResponse = z.infer<typeof RejectEstimateResponseSchema>;
