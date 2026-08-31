import { z } from 'zod';

import { FlowDecisionSchema } from './flow-decision';
import { CustomerProgressSchema } from './customer-progress';
import { InvoiceSummarySchema } from './invoice';

export const BookingSchema = z.object({
  id: z.string(),
  public_ref: z.string(),
  status: z.string(),
  slot: z.object({
    starts_at: z.string(),
    ends_at: z.string(),
    display: z.string(),
  }),
  job_card_ref: z.string(),
  job_card_id: z.string().nullable().optional(),
  vehicle_summary: z.string(),
  address_summary: z.string(),
  customer_progress: z.string(),
  note: z.string().nullable().optional(),
});
export type Booking = z.infer<typeof BookingSchema>;

export const BookResponseSchema = z.object({
  booking: BookingSchema,
  flow_decision: FlowDecisionSchema.nullable().optional(),
});
export type BookResponse = z.infer<typeof BookResponseSchema>;

export const BookingDetailResponseSchema = z.object({
  booking: BookingSchema,
  snapshot: z.record(z.unknown()).nullable().optional(),
  customer_progress: CustomerProgressSchema.nullable().optional(),
  allowed_actions: z.array(z.string()).optional(),
  visits: z.array(z.record(z.unknown())).optional(),
  invoice: InvoiceSummarySchema.nullable().optional(),
  review_submitted: z.boolean().optional(),
});
export type BookingDetailResponse = z.infer<typeof BookingDetailResponseSchema>;
