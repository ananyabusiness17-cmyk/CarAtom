import { z } from 'zod';

export const UserRoleSchema = z.enum(['customer', 'technician', 'admin']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const MeResponseSchema = z.object({
  id: z.string().uuid(),
  role: UserRoleSchema,
  phone: z.string().nullable(),
  full_name: z.string().nullable(),
  phone_verified: z.boolean(),
  created_at: z.string(),
});
export type MeResponse = z.infer<typeof MeResponseSchema>;

export const ProfilePatchRequestSchema = z.object({
  full_name: z.string().min(1).max(120),
});
export type ProfilePatchRequest = z.infer<typeof ProfilePatchRequestSchema>;
