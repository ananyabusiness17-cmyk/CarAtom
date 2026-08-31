import { z } from 'zod';

import { MoneySchema } from './catalog';

export const PartsAdvanceOrderRequestSchema = z.object({
  estimate_id: z.string(),
  expected_amount_minor: z.number().int().positive(),
});
export type PartsAdvanceOrderRequest = z.infer<typeof PartsAdvanceOrderRequestSchema>;

export const PartsAdvanceOrderResponseSchema = z.object({
  payment_id: z.string(),
  purpose: z.literal('PARTS_ADVANCE'),
  razorpay_order_id: z.string().nullable().optional(),
  amount: MoneySchema.pick({ amount_minor: true, currency: true }),
  key_id: z.string().optional(),
  verification_pending: z.boolean().optional(),
});
export type PartsAdvanceOrderResponse = z.infer<typeof PartsAdvanceOrderResponseSchema>;

export const PaymentStatusResponseSchema = z.object({
  payment_id: z.string().optional(),
  id: z.string().optional(),
  status: z.string(),
  purpose: z.string().optional(),
  amount: MoneySchema.pick({ amount_minor: true, currency: true }).optional(),
  amount_minor: z.number().int().optional(),
  currency: z.string().optional(),
  invoice_id: z.string().nullable().optional(),
  verification_status: z.string().optional(),
  captured_at: z.string().nullable().optional(),
  invoice_status: z.string().nullable().optional(),
  message: z.string().nullable().optional(),
  failure_reason: z.string().nullable().optional(),
});
export type PaymentStatusResponse = z.infer<typeof PaymentStatusResponseSchema>;

export const PartsStatusItemSchema = z.object({
  id: z.string(),
  description: z.string(),
  readiness_status: z.string(),
  eta_label: z.string().nullable().optional(),
});

export const PartsStatusResponseSchema = z.object({
  all_ready: z.boolean(),
  parts_advance_captured: z.boolean().optional(),
  parts: z.array(PartsStatusItemSchema),
  customer_progress: z.string().optional(),
});
export type PartsStatusResponse = z.infer<typeof PartsStatusResponseSchema>;
