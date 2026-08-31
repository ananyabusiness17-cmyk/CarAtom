import { z } from 'zod';

export const ReviewCreateRequestSchema = z.object({
  booking_id: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).nullable().optional(),
});
export type ReviewCreateRequest = z.infer<typeof ReviewCreateRequestSchema>;

export const ReviewSchema = z.object({
  id: z.string(),
  booking_id: z.string(),
  rating: z.number().int(),
  comment: z.string().nullable().optional(),
  submitted_at: z.string(),
});
export type Review = z.infer<typeof ReviewSchema>;
