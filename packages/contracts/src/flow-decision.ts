import { z } from 'zod';

export const FlowDecisionSchema = z.object({
  policy: z.string(),
  advisor_requirement: z.string(),
  estimate_requirement: z.string(),
  required_next_action: z.string(),
  allowed_actions: z.array(z.string()),
  blocking_reasons: z.array(z.string()).default([]),
  estimate_version_id: z.string().nullable().optional(),
  expires_at: z.string().nullable().optional(),
  customer_progress: z.string().nullable().optional(),
});
export type FlowDecision = z.infer<typeof FlowDecisionSchema>;
