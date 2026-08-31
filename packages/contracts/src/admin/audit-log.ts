import { z } from 'zod';

export const AuditLogRowSchema = z.object({
  id: z.string(),
  created_at: z.string(),
  actor_display_name: z.string(),
  actor_role: z.string(),
  command: z.string(),
  resource_type: z.string(),
  resource_id: z.string(),
  reason: z.string().nullable().optional(),
  request_id: z.string().nullable().optional(),
  before_summary: z.record(z.unknown()).nullable().optional(),
  after_summary: z.record(z.unknown()).nullable().optional(),
});

export const AuditLogListResponseSchema = z.object({
  items: z.array(AuditLogRowSchema),
  next_cursor: z.string().nullable().optional(),
});
export type AuditLogListResponse = z.infer<typeof AuditLogListResponseSchema>;
export type AuditLogRow = z.infer<typeof AuditLogRowSchema>;
