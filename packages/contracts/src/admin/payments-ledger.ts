import { z } from 'zod';

export const LedgerRowSchema = z.object({
  id: z.string(),
  job_card_ref: z.string(),
  label: z.string(),
  amount_minor: z.number().int(),
  currency: z.string(),
  method: z.string(),
  status: z.string(),
  created_at: z.string(),
  payment_id: z.string().nullable().optional(),
});

export const LedgerResponseSchema = z.object({
  items: z.array(LedgerRowSchema),
  next_cursor: z.string().nullable().optional(),
  daily_total: z.object({
    total_minor: z.number().int(),
    currency: z.string(),
  }),
});
export type LedgerResponse = z.infer<typeof LedgerResponseSchema>;

export const OfflinePaymentResponseSchema = z.object({
  payment_id: z.string(),
  audit_id: z.string(),
  job_card_ref: z.string(),
});
export type OfflinePaymentResponse = z.infer<typeof OfflinePaymentResponseSchema>;

export const RefundResponseSchema = z.object({
  refund_id: z.string(),
  audit_id: z.string(),
  amount_minor: z.number().int(),
  job_card_ref: z.string(),
});
export type RefundResponse = z.infer<typeof RefundResponseSchema>;
