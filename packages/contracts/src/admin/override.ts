import { z } from 'zod';

export const OverrideResponseSchema = z.object({
  job_card: z.object({
    id: z.string(),
    public_ref: z.string(),
    status: z.string(),
    version: z.number().int().optional(),
  }),
  audit_id: z.string(),
  audit_ref: z.string().optional(),
});
export type OverrideResponse = z.infer<typeof OverrideResponseSchema>;

export const OnBehalfResponseSchema = z.object({
  job_card_id: z.string(),
  public_ref: z.string(),
  booking_id: z.string(),
  audit_id: z.string(),
});
export type OnBehalfResponse = z.infer<typeof OnBehalfResponseSchema>;

export const AdminJobListResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      public_ref: z.string(),
      customer_name: z.string().nullable().optional(),
      status: z.string(),
      technician_name: z.string().nullable().optional(),
      locality: z.string().nullable().optional(),
      updated_at: z.string(),
      payment_status: z.string().nullable().optional(),
    }),
  ),
  next_cursor: z.string().nullable().optional(),
});
export type AdminJobListResponse = z.infer<typeof AdminJobListResponseSchema>;

export const AdminJobPatchResponseSchema = z.object({
  job_card: z.unknown(),
});
export type AdminJobPatchResponse = z.infer<typeof AdminJobPatchResponseSchema>;
