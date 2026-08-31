import { z } from 'zod';

export const PeopleRowSchema = z.object({
  id: z.string(),
  kind: z.string(),
  display_name: z.string(),
  masked_phone: z.string().nullable().optional(),
  subtitle: z.string(),
  status_chip: z.string().nullable().optional(),
  technician_id: z.string().nullable().optional(),
  is_disabled: z.boolean().optional(),
});

export const PeopleListResponseSchema = z.object({
  items: z.array(PeopleRowSchema),
});
export type PeopleListResponse = z.infer<typeof PeopleListResponseSchema>;

export const CustomerDetailSchema = z.object({
  id: z.string(),
  full_name: z.string().nullable().optional(),
  phone_e164: z.string().nullable().optional(),
  masked_phone: z.string().nullable().optional(),
  is_disabled: z.boolean(),
  vehicles: z.array(z.record(z.unknown())),
  recent_jobs: z.array(z.record(z.unknown())),
});
export type CustomerDetail = z.infer<typeof CustomerDetailSchema>;

export const DisableProfileResponseSchema = z.object({
  id: z.string(),
  is_disabled: z.boolean(),
  audit_id: z.string(),
});
export type DisableProfileResponse = z.infer<typeof DisableProfileResponseSchema>;

export const TechnicianCreateResponseSchema = z.object({
  id: z.string(),
  profile_id: z.string(),
  display_name: z.string(),
});
export type TechnicianCreateResponse = z.infer<typeof TechnicianCreateResponseSchema>;
