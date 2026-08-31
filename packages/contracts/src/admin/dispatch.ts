import { z } from 'zod';

import { DispatchLaneVisitSchema } from './ops-bring';

export const DispatchTechnicianSchema = z.object({
  id: z.string(),
  name: z.string(),
  duty_status: z.enum(['ON_DUTY', 'OFF_DUTY']),
  skills_label: z.string(),
  active_jobs_count: z.number().int(),
  van_label: z.string().nullable(),
  last_ping_label: z.string().nullable(),
  area_label: z.string().nullable(),
  assigned_visits: z.array(DispatchLaneVisitSchema).optional(),
});
export type DispatchTechnician = z.infer<typeof DispatchTechnicianSchema>;

export const DispatchUnassignedJobSchema = z.object({
  visit_id: z.string(),
  job_card_id: z.string(),
  job_card_ref: z.string(),
  vehicle_label: z.string(),
  visit_window_label: z.string().nullable(),
  scheduled_start_at: z.string().optional(),
  scheduled_end_at: z.string().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
});
export type DispatchUnassignedJob = z.infer<typeof DispatchUnassignedJobSchema>;

export const DispatchBoardReadModelSchema = z.object({
  technicians: z.array(DispatchTechnicianSchema),
  unassigned_jobs: z.array(DispatchUnassignedJobSchema),
});
export type DispatchBoardReadModel = z.infer<typeof DispatchBoardReadModelSchema>;
