import { z } from 'zod';

export const PartLineSchema = z
  .object({
    sku_code: z.string().min(1),
    label: z.string().min(1),
    quantity: z.number().positive(),
    notes: z.string().nullable().optional(),
    intent: z.enum(['FIT', 'REMOVE', 'RECYCLE']).optional(),
  })
  .strict();

export const PartsRequestSchema = z.object({
  lines: z.array(PartLineSchema).min(1),
});

export const PartsResponseSchema = z.object({
  parts_recorded: z.number(),
});

export const LabourEntrySchema = z.object({
  description: z.string().min(1),
  minutes: z.number().int().positive().nullable().optional(),
});

export const LabourRequestSchema = z.object({
  entries: z.array(LabourEntrySchema).min(1),
});

export const LabourResponseSchema = z.object({
  labour_recorded: z.number(),
});

export type PartLine = z.infer<typeof PartLineSchema>;
export type PartsRequest = z.infer<typeof PartsRequestSchema>;
export type PartsResponse = z.infer<typeof PartsResponseSchema>;
export type LabourEntry = z.infer<typeof LabourEntrySchema>;
export type LabourRequest = z.infer<typeof LabourRequestSchema>;
export type LabourResponse = z.infer<typeof LabourResponseSchema>;
