import { z } from 'zod';

export const CustomerProgressKeySchema = z.enum([
  'BUILDING',
  'ESTIMATE_READY',
  'ACTION_REQUIRED',
  'ADVISOR_CONTACTING',
  'READY_TO_BOOK',
  'BOOKING_CONFIRMED',
  'VISIT_IN_PROGRESS',
  'ESTIMATE_APPROVAL_REQUIRED',
  'PARTS_PAYMENT_REQUIRED',
  'REPAIR_BOOKING_REQUIRED',
  'COMPLETED',
  'PAYMENT_DUE',
  'PAYMENT_VERIFICATION_PENDING',
  'PAID',
  'SUPPORT_REQUIRED',
]);
export type CustomerProgressKey = z.infer<typeof CustomerProgressKeySchema>;

export const ProgressStepSchema = z.object({
  key: z.string(),
  label: z.string(),
  status: z.enum(['pending', 'active', 'done']),
});
export type ProgressStep = z.infer<typeof ProgressStepSchema>;

export const CustomerProgressSchema = z.object({
  key: z.string(),
  headline: z.string(),
  subheadline: z.string().nullable().optional(),
  steps: z.array(ProgressStepSchema),
  primary_action: z.string().nullable().optional(),
});
export type CustomerProgress = z.infer<typeof CustomerProgressSchema>;
