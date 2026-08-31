import { z } from 'zod';

import { FlowDecisionSchema } from './flow-decision';

export const SlotSchema = z.object({
  slot_id: z.string(),
  starts_at: z.string(),
  ends_at: z.string(),
  label: z.string(),
  available: z.boolean(),
});
export type Slot = z.infer<typeof SlotSchema>;

export const SlotsResponseSchema = z.object({
  timezone: z.string(),
  visit_duration_minutes: z.number().optional(),
  slots: z.array(SlotSchema),
});
export type SlotsResponse = z.infer<typeof SlotsResponseSchema>;

export const HoldResponseSchema = z.object({
  hold: z.object({
    id: z.string(),
    slot_starts_at: z.string(),
    slot_ends_at: z.string(),
    expires_at: z.string(),
    status: z.string(),
  }),
  flow_decision: FlowDecisionSchema,
});
export type HoldResponse = z.infer<typeof HoldResponseSchema>;
