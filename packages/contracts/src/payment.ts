import { z } from 'zod';

export const PaymentPurposeSchema = z.enum(['FULL', 'PARTS_ADVANCE', 'BALANCE']);
export type PaymentPurpose = z.infer<typeof PaymentPurposeSchema>;

export const PaymentVerificationStatusSchema = z.enum([
  'NOT_STARTED',
  'PENDING',
  'VERIFIED',
  'FAILED',
]);
export type PaymentVerificationStatus = z.infer<typeof PaymentVerificationStatusSchema>;

export const PaymentOrderCreateRequestSchema = z.object({
  purpose: PaymentPurposeSchema,
});
export type PaymentOrderCreateRequest = z.infer<typeof PaymentOrderCreateRequestSchema>;

export const PaymentOrderCreateResponseSchema = z.object({
  payment_id: z.string(),
  razorpay_order_id: z.string().nullable().optional(),
  razorpay_key_id: z.string(),
  amount_minor: z.number().int(),
  currency: z.string(),
  purpose: z.string(),
  status: z.string(),
  verification_status: z.string(),
  expires_at: z.string().nullable().optional(),
  prefill: z
    .object({
      name: z.string().nullable().optional(),
      contact: z.string().nullable().optional(),
    })
    .optional(),
});
export type PaymentOrderCreateResponse = z.infer<typeof PaymentOrderCreateResponseSchema>;

export const PaymentSchema = z.object({
  id: z.string(),
  payment_id: z.string().optional(),
  invoice_id: z.string().nullable().optional(),
  status: z.string(),
  amount_minor: z.number().int(),
  currency: z.string().optional(),
  purpose: z.string(),
  verification_status: z.string(),
  captured_at: z.string().nullable().optional(),
  invoice_status: z.string().nullable().optional(),
  message: z.string().nullable().optional(),
  failure_reason: z.string().nullable().optional(),
  amount: z
    .object({
      amount_minor: z.number().int(),
      currency: z.string(),
    })
    .optional(),
});
export type Payment = z.infer<typeof PaymentSchema>;
