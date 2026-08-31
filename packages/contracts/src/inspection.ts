import { z } from 'zod';

import { FlowDecisionSchema } from './flow-decision';
import { MoneySchema } from './catalog';

export const FindingSeveritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);
export type FindingSeverity = z.infer<typeof FindingSeveritySchema>;

export const InspectionFindingSchema = z.object({
  id: z.string(),
  title: z.string(),
  severity: z.string(),
  customer_explanation: z.string(),
  recommendation: z.string().nullable().optional(),
  repair_category: z.string().nullable().optional(),
  media: z
    .object({
      url: z.string(),
      mime_type: z.string().optional(),
    })
    .nullable()
    .optional(),
});
export type InspectionFinding = z.infer<typeof InspectionFindingSchema>;

export const InspectionEstimateSummarySchema = z.object({
  estimate_id: z.string(),
  status: z.string(),
  source: z.string(),
  version: z.number().int(),
  content_hash: z.string(),
  total: MoneySchema.pick({ amount_minor: true, currency: true }),
  parts_advance: z.object({
    amount_minor: z.number().int(),
    currency: z.string(),
  }),
  valid_until: z.string().nullable().optional(),
  line_items: z.array(
    z.object({
      label: z.string(),
      amount_minor: z.number().int(),
      kind: z.string(),
      is_included: z.boolean().optional(),
    }),
  ),
});
export type InspectionEstimateSummary = z.infer<typeof InspectionEstimateSummarySchema>;

export const InspectionFindingsResponseSchema = z.object({
  job_card_id: z.string(),
  inspection: z
    .object({
      id: z.string(),
      summary: z.string().nullable().optional(),
      submitted_at: z.string().nullable().optional(),
    })
    .nullable(),
  findings: z.array(InspectionFindingSchema),
  estimate_summary: InspectionEstimateSummarySchema.nullable().optional(),
  flow_decision: FlowDecisionSchema.optional(),
  version: z.number().int().optional(),
  updated_at: z.string().nullable().optional(),
});
export type InspectionFindingsResponse = z.infer<typeof InspectionFindingsResponseSchema>;

export const RecommendedPartSubmitSchema = z.object({
  sku_code: z.string(),
  label: z.string(),
  quantity: z.number(),
  notes: z.string().nullable().optional(),
});

export const RecommendedLabourSubmitSchema = z.object({
  description: z.string(),
  minutes: z.number().int().nullable().optional(),
});

export const InspectionFindingsSubmitSchema = z.object({
  summary: z.string(),
  recommendation: z.string().optional(),
  severity: z.string().optional(),
  media_asset_ids: z.array(z.string()).optional(),
  findings: z
    .array(
      z.object({
        title: z.string(),
        severity: z.string().optional(),
        customer_explanation: z.string(),
        recommendation: z.string().nullable().optional(),
        repair_category: z.string().nullable().optional(),
        media_asset_id: z.string().nullable().optional(),
      }),
    )
    .optional(),
  recommended_parts: z.array(RecommendedPartSubmitSchema).optional(),
  recommended_labour: z.array(RecommendedLabourSubmitSchema).optional(),
});
export type InspectionFindingsSubmit = z.infer<typeof InspectionFindingsSubmitSchema>;
