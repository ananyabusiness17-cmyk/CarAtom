import { z } from 'zod';

export const TechnicianDossierSchema = z.object({
  technician: z.object({
    id: z.string(),
    display_name: z.string(),
    on_duty: z.boolean(),
    van_code: z.string().nullable().optional(),
    skills: z.array(z.string()).optional(),
    profile_id: z.string().nullable().optional(),
  }),
  location: z.object({
    last_ping_at: z.string().nullable().optional(),
    locality: z.string().nullable().optional(),
    latitude: z.number().nullable().optional(),
    longitude: z.number().nullable().optional(),
  }),
  today: z.object({
    assigned_count: z.number().int(),
    completed_count: z.number().int(),
    current_job_ref: z.string().nullable().optional(),
    jobs: z.array(z.record(z.unknown())).optional(),
  }),
  week_stats: z.object({
    jobs_done: z.number().int(),
    avg_rating: z.number().nullable().optional(),
  }),
  parts_fitted_week: z.array(
    z.object({
      sku_name: z.string(),
      quantity: z.number(),
    }),
  ),
});
export type TechnicianDossier = z.infer<typeof TechnicianDossierSchema>;
