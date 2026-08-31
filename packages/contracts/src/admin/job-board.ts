import { z } from 'zod';

export const AssignedTechnicianSchema = z.object({
  id: z.string(),
  name: z.string(),
});
export type AssignedTechnician = z.infer<typeof AssignedTechnicianSchema>;

export const AdminJobBoardItemSchema = z.object({
  id: z.string(),
  ref: z.string(),
  public_ref: z.string(),
  status: z.string(),
  status_label: z.string(),
  policy_label: z.string(),
  customer_name: z.string().nullable().optional(),
  vehicle_label: z.string(),
  area_label: z.string(),
  visit_window_label: z.string().nullable(),
  assigned_technician: AssignedTechnicianSchema.nullable(),
  estimate_total_minor: z.number().int().nullable(),
  payment_chip: z.string().nullable(),
  needs_dispatch: z.boolean(),
  visit_id: z.string().nullable(),
  technician_name: z.string().nullable().optional(),
  locality: z.string().nullable().optional(),
  updated_at: z.string(),
  payment_status: z.string().nullable().optional(),
});
export type AdminJobBoardItem = z.infer<typeof AdminJobBoardItemSchema>;

export const AdminJobBoardListResponseSchema = z.object({
  items: z.array(AdminJobBoardItemSchema),
  next_cursor: z.string().nullable().optional(),
});
export type AdminJobBoardListResponse = z.infer<typeof AdminJobBoardListResponseSchema>;

export const AdminJobLiteLineSchema = z.object({
  name: z.string(),
  amount_minor: z.number().int(),
});
export type AdminJobLiteLine = z.infer<typeof AdminJobLiteLineSchema>;

export const AdminJobLiteDetailSchema = AdminJobBoardItemSchema.extend({
  concerns: z.array(z.string()),
  lines: z.array(AdminJobLiteLineSchema),
  lines_omitted_count: z.number().int(),
  van_label: z.string().nullable(),
  allowed_status_targets: z.array(z.string()).optional(),
});
export type AdminJobLiteDetail = z.infer<typeof AdminJobLiteDetailSchema>;
