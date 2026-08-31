import { z } from 'zod';

export const OfflineQueueKindSchema = z.enum([
  'EN_ROUTE',
  'CHECK_IN',
  'START_INSPECTION',
  'START_SERVICE',
  'INSPECTION_FINDINGS',
  'PARTS',
  'LABOUR',
  'QC',
  'COMPLETE',
  'LOCATION_PING',
  'UPLOAD_INTENT',
  'SCOPE_PROGRESS',
  'EXCEPTION',
]);

export const OfflineQueueEntrySchema = z.object({
  eventId: z.string().uuid(),
  visitId: z.string().uuid(),
  kind: OfflineQueueKindSchema,
  payload: z.record(z.unknown()),
  createdAt: z.string(),
  status: z.enum(['pending', 'failed']),
  error: z.string().nullable().optional(),
});

export type OfflineQueueKind = z.infer<typeof OfflineQueueKindSchema>;
export type OfflineQueueEntry = z.infer<typeof OfflineQueueEntrySchema>;
