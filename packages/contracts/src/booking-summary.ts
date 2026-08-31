import { z } from 'zod';

export const BookingSummarySchema = z.object({
  id: z.string(),
  public_ref: z.string(),
  status: z.string(),
  progress_label: z.string(),
  service_summary: z.string(),
  flow_policy: z.string(),
  visit_starts_at: z.string(),
  created_at: z.string(),
  title: z.string().nullable().optional(),
  status_chip: z.string().nullable().optional(),
  status_tone: z.string().nullable().optional(),
  subtitle: z.string().nullable().optional(),
  vehicle_summary: z.string().nullable().optional(),
  customer_progress: z.string().nullable().optional(),
  next_action_hint: z.string().nullable().optional(),
});
export type BookingSummary = z.infer<typeof BookingSummarySchema>;

export const BookingListResponseSchema = z.object({
  items: z.array(BookingSummarySchema),
  next_cursor: z.string().nullable().optional(),
  has_more: z.boolean().optional(),
});
export type BookingListResponse = z.infer<typeof BookingListResponseSchema>;
