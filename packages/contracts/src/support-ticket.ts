import { z } from 'zod';

export const CreateSupportTicketRequestSchema = z.object({
  ticket_type: z.enum(['ROADSIDE']).default('ROADSIDE'),
  issue_code: z.string().min(1),
  issue_label: z.string().min(1),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  location_label: z.string().nullable().optional(),
});
export type CreateSupportTicketRequest = z.infer<typeof CreateSupportTicketRequestSchema>;

export const SupportTicketSchema = z.object({
  id: z.string(),
  public_ref: z.string(),
  status: z.string(),
  ticket_type: z.string(),
  issue_code: z.string(),
  issue_label: z.string(),
  location_label: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  dispatched_partner_label: z.string().nullable().optional(),
  eta_minutes: z.number().nullable().optional(),
  allowed_actions: z.array(z.string()),
  ops_phone_e164: z.string().nullable().optional(),
  created_at: z.string(),
});
export type SupportTicket = z.infer<typeof SupportTicketSchema>;

export const SupportTicketListResponseSchema = z.object({
  items: z.array(SupportTicketSchema),
  next_cursor: z.string().nullable().optional(),
});
export type SupportTicketListResponse = z.infer<typeof SupportTicketListResponseSchema>;
