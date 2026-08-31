import { z } from 'zod';

export const HealthResponseSchema = z.object({
  status: z.literal('ok'),
  version: z.string(),
  database: z.enum(['ok', 'degraded', 'unavailable']),
  timestamp: z.string().datetime(),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
