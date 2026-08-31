import { z } from 'zod';

export const OverrideLiteActionSchema = z.enum([
  'FORCE_STATUS',
  'MOVE_VISIT_SLOT',
  'RECORD_OFFLINE_PAYMENT',
  'DESK_COMPLETE_VISIT',
]);
export type OverrideLiteAction = z.infer<typeof OverrideLiteActionSchema>;

export const OverrideLiteRequestSchema = z.object({
  action: OverrideLiteActionSchema,
  reason: z.string().min(10),
  target_status: z.string().nullable().optional(),
  payload: z.record(z.unknown()).optional(),
});
export type OverrideLiteRequest = z.infer<typeof OverrideLiteRequestSchema>;

export const AllowedOverrideActionsSchema = z.object({
  actions: z.array(z.string()),
  allowed_targets: z.array(z.string()).optional(),
});
export type AllowedOverrideActions = z.infer<typeof AllowedOverrideActionsSchema>;
