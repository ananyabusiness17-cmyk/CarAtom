import { z } from 'zod';

import { MoneySchema } from './catalog';

export const RepairCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string().optional(),
});

export const RepairOfferingSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  display_price: MoneySchema.pick({ amount_minor: true, currency: true }),
  category: RepairCategorySchema.nullable().optional(),
  icon_key: z.string().nullable().optional(),
  compatible: z.boolean().default(true),
});
export type RepairOffering = z.infer<typeof RepairOfferingSchema>;

export const RepairOfferingListResponseSchema = z.object({
  items: z.array(RepairOfferingSchema),
});
export type RepairOfferingListResponse = z.infer<typeof RepairOfferingListResponseSchema>;

export const AddJobCardItemRequestSchema = z.object({
  kind: z.literal('REPAIR'),
  repair_offering_slug: z.string(),
  quantity: z.number().int().min(1).default(1),
});
export type AddJobCardItemRequest = z.infer<typeof AddJobCardItemRequestSchema>;
