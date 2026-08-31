import { z } from 'zod';

export const ProblemDetailsSchema = z.object({
  code: z.string(),
  message: z.string(),
  retryable: z.boolean().optional(),
  allowed_actions: z.array(z.string()).optional(),
  field_errors: z
    .array(
      z.object({
        field: z.string(),
        message: z.string(),
      }),
    )
    .optional(),
  request_id: z.string().optional(),
  details: z.record(z.unknown()).optional(),
});
export type ProblemDetails = z.infer<typeof ProblemDetailsSchema>;
