import { z } from 'zod';

export const QcItemSchema = z.object({
  code: z.string(),
  label: z.string(),
  passed: z.boolean(),
});

export const QcRequestSchema = z.object({
  items: z.array(QcItemSchema).min(1),
  passed: z.boolean(),
  checklist_version: z.string().optional(),
});

export type QcItem = z.infer<typeof QcItemSchema>;
export type QcRequest = z.infer<typeof QcRequestSchema>;
