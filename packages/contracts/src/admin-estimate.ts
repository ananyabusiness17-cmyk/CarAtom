import { z } from 'zod';

import { EstimateSchema } from './estimate';
import { FlowDecisionSchema } from './flow-decision';
import { JobCardSchema } from './job-card';
import { MoneySchema } from './catalog';

export const InboxRowSchema = z.object({
  job_card_id: z.string(),
  public_ref: z.string(),
  status: z.string(),
  customer_name: z.string().nullable().optional(),
  masked_phone: z.string().nullable().optional(),
  submitted_total_minor: z.number().int().nullable().optional(),
  callback_requested_at: z.string().nullable().optional(),
  vehicle_summary: z.string().nullable().optional(),
});

export type InboxRow = z.infer<typeof InboxRowSchema>;

export const InboxResponseSchema = z.object({
  items: z.array(InboxRowSchema),
});
export type InboxResponse = z.infer<typeof InboxResponseSchema>;

export const AdminJobCardSchema = z.object({
  job_card: JobCardSchema,
  customer_name: z.string().nullable().optional(),
  phone_e164: z.string().nullable().optional(),
  advisor_case_id: z.string().nullable().optional(),
  advisor_case_status: z.string().nullable().optional(),
  submitted_estimate: EstimateSchema.nullable().optional(),
  flow_decision: FlowDecisionSchema,
  labour_total_minor: z.number().int().nullable().optional(),
  parts_total_minor: z.number().int().nullable().optional(),
  billed_percent: z.number().nullable().optional(),
});
export type AdminJobCard = z.infer<typeof AdminJobCardSchema>;

export const PublishLineSchema = z.object({
  kind: z.string(),
  label: z.string().nullable().optional(),
  repair_offering_slug: z.string().nullable().optional(),
  amount_minor: z.number().int(),
});

export const AdminPublishEstimateRequestSchema = z.object({
  lines: z.array(PublishLineSchema).min(1),
  advisor_case_id: z.string().optional(),
  publish_to_customer: z.boolean().default(true),
  revision_notes_customer_safe: z.string().nullable().optional(),
  force_approve: z.boolean().optional(),
  reason: z.string().nullable().optional(),
});
export type AdminPublishEstimateRequest = z.infer<typeof AdminPublishEstimateRequestSchema>;

export const AdminPublishEstimateResponseSchema = z.object({
  estimate: EstimateSchema,
  advisor_case_id: z.string(),
  advisor_case_status: z.string(),
  customer_notified_at: z.string(),
  flow_decision: FlowDecisionSchema,
  total: MoneySchema.pick({ amount_minor: true, currency: true }),
});
export type AdminPublishEstimateResponse = z.infer<typeof AdminPublishEstimateResponseSchema>;
