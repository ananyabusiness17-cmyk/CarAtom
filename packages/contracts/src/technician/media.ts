import { z } from 'zod';

export const SignedUploadRequestSchema = z.object({
  visit_id: z.string().uuid().optional(),
  job_card_id: z.string().uuid().optional(),
  filename: z.string().min(1),
  content_type: z.string().min(3),
  byte_size: z.number().int().positive(),
  sha256: z.string().optional(),
});

export const SignedUploadResponseSchema = z.object({
  asset_id: z.string().uuid(),
  upload_url: z.string(),
  upload_headers: z.record(z.string()),
  expires_at: z.string(),
});

export const MediaConfirmResponseSchema = z.object({
  asset_id: z.string().uuid(),
  status: z.string(),
});

export const ExceptionRequestSchema = z.object({
  summary: z.string().min(1),
  requested_action: z.string().min(1),
  media_asset_ids: z.array(z.string().uuid()).optional(),
});

export const ScopeProgressRequestSchema = z.object({
  line_id: z.string().uuid(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'DONE', 'NOT_APPLICABLE']),
});

export type SignedUploadRequest = z.infer<typeof SignedUploadRequestSchema>;
export type SignedUploadResponse = z.infer<typeof SignedUploadResponseSchema>;
export type MediaConfirmResponse = z.infer<typeof MediaConfirmResponseSchema>;
export type ExceptionRequest = z.infer<typeof ExceptionRequestSchema>;
export type ScopeProgressRequest = z.infer<typeof ScopeProgressRequestSchema>;
