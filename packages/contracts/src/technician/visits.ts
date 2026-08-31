import { z } from 'zod';

import { VisitKitSchema } from '../admin/ops-bring';

export const VisitTypeSchema = z.enum(['INSPECTION', 'SERVICE', 'ONE_MAN', 'SOS_ASSIST', 'REPAIR']);
export const VisitStatusSchema = z.enum([
  'SCHEDULED',
  'ASSIGNED',
  'EN_ROUTE',
  'LATE',
  'ON_SITE',
  'INSPECTION_IN_PROGRESS',
  'INSPECTION_SUBMITTED',
  'SERVICE_IN_PROGRESS',
  'QC_PENDING',
  'QC_FAILED',
  'COMPLETED',
  'CANCELLED',
  'UNASSIGNED',
  'SUPPORT_REQUIRED',
  'FOLLOW_UP_REQUIRED',
]);

export const AllowedActionSchema = z.enum([
  'VIEW',
  'EN_ROUTE',
  'CHECK_IN',
  'START_INSPECTION',
  'START_SERVICE',
  'SUBMIT_INSPECTION',
  'RECORD_PARTS',
  'RECORD_LABOUR',
  'SUBMIT_QC',
  'COMPLETE',
  'RAISE_EXCEPTION',
]);

export const TechnicianScopeLineSchema = z.object({
  id: z.string().uuid(),
  label: z.string(),
  kind: z.enum(['SERVICE', 'REPAIR', 'INCLUSION']),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'DONE', 'NOT_APPLICABLE']),
});

export const VisitTagSchema = z.object({
  code: z.string(),
  label: z.string(),
});

export const TechnicianVisitSummarySchema = z.object({
  id: z.string().uuid(),
  public_ref: z.string(),
  job_card_ref: z.string(),
  visit_type: VisitTypeSchema,
  status: VisitStatusSchema,
  scheduled_label: z.string(),
  distance_km: z.number().nullable(),
  vehicle_label: z.string(),
  address_short: z.string(),
  allowed_actions: z.array(AllowedActionSchema),
  pending_sync: z.boolean().optional(),
});

export const TechnicianVisitDetailSchema = TechnicianVisitSummarySchema.extend({
  concerns: z.string().nullable(),
  scope_lines: z.array(TechnicianScopeLineSchema),
  advisor_note: z.string().nullable(),
  customer_name: z.string(),
  customer_phone_masked: z.string(),
  address_full: z.string(),
  parking_notes: z.string().nullable(),
  map_preview_url: z.string().nullable(),
  tags: z.array(VisitTagSchema).default([]),
  plate: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  kit: VisitKitSchema.optional(),
  actual_start_at: z.string().nullable().optional(),
  actual_finish_at: z.string().nullable().optional(),
});

export const VisitListResponseSchema = z.object({
  date: z.string(),
  timezone: z.string(),
  visits: z.array(TechnicianVisitSummarySchema),
  summary: z.object({
    total: z.number(),
    completed: z.number(),
  }),
});

export const TechnicianMeSchema = z.object({
  technician_id: z.string().uuid(),
  display_name: z.string(),
  on_duty: z.boolean(),
  skills: z.array(z.string()),
  today_jobs: z.number(),
  status: z.string(),
});

export const AssignResponseSchema = z.object({
  visit_id: z.string().uuid(),
  public_ref: z.string(),
  status: z.string(),
  visit_type: z.string(),
  audit_ref: z.string(),
  warnings: z.array(z.string()).optional(),
  kit: VisitKitSchema.optional(),
});

export type VisitType = z.infer<typeof VisitTypeSchema>;
export type VisitStatus = z.infer<typeof VisitStatusSchema>;
export type AllowedAction = z.infer<typeof AllowedActionSchema>;
export type TechnicianScopeLine = z.infer<typeof TechnicianScopeLineSchema>;
export type TechnicianVisitSummary = z.infer<typeof TechnicianVisitSummarySchema>;
export type TechnicianVisitDetail = z.infer<typeof TechnicianVisitDetailSchema>;
export type VisitListResponse = z.infer<typeof VisitListResponseSchema>;
export const LocationPingRequestSchema = z.object({
  visit_id: z.string().uuid().nullable().optional(),
  lat: z.number(),
  lng: z.number(),
  accuracy_m: z.number().nullable().optional(),
  recorded_at: z.string(),
  client_event_id: z.string().min(1),
  force: z.boolean().optional(),
});

export const LocationPingAcceptedSchema = z.object({
  accepted: z.boolean(),
});

export type TechnicianMe = z.infer<typeof TechnicianMeSchema>;
export type AssignResponse = z.infer<typeof AssignResponseSchema>;
export type LocationPingRequest = z.infer<typeof LocationPingRequestSchema>;
export type LocationPingAccepted = z.infer<typeof LocationPingAcceptedSchema>;
