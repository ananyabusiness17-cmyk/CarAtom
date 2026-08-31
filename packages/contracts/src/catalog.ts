import { z } from 'zod';

export const MoneySchema = z.object({
  amount_minor: z.number().int(),
  currency: z.string(),
  label: z.string().nullable().optional(),
});
export type Money = z.infer<typeof MoneySchema>;

export const HeroBlockSchema = z.object({
  tab: z.string(),
  kicker: z.string(),
  title: z.string(),
  media_url: z.string().nullable().optional(),
  media_type: z.string().nullable().optional(),
});
export type HeroBlock = z.infer<typeof HeroBlockSchema>;

export const CatalogOfferingSchema = z.object({
  slug: z.string(),
  name: z.string(),
  flow_policy: z.string(),
  display_price: MoneySchema,
  duration_minutes: z.number().int().nullable().optional(),
  included_items: z.array(z.string()),
  policy_note: z.string(),
});

export const OneManJobSchema = z.object({
  slug: z.string(),
  name: z.string(),
  flow_policy: z.string(),
  display_price: MoneySchema,
  duration_minutes: z.number().int().nullable().optional(),
  icon_key: z.string().nullable().optional(),
});
export type OneManJob = z.infer<typeof OneManJobSchema>;

export const CatalogHomeResponseSchema = z.object({
  service_area: z.object({
    slug: z.string(),
    name: z.string(),
    serviceable: z.boolean(),
  }),
  hero: z.object({
    blocks: z.array(HeroBlockSchema),
  }),
  sections: z.object({
    general_service: z.object({
      offering: CatalogOfferingSchema,
    }),
    service_repair_entry: z.object({
      offering_slug: z.string(),
      policy_note_warn: z.string(),
      cta_label: z.string(),
    }),
    one_man_jobs: z.array(OneManJobSchema),
    sos: z.object({
      headline: z.string(),
      tiles: z.array(z.object({ id: z.string(), label: z.string() })),
    }),
    uncertain_repair: z
      .object({
        title: z.string(),
        subtitle: z.string(),
        offering_slug: z.string(),
        cta: z.string(),
      })
      .optional(),
  }),
  trust_strip: z.array(z.object({ icon_key: z.string(), label: z.string() })),
  search_placeholder: z.string(),
});
export type CatalogHomeResponse = z.infer<typeof CatalogHomeResponseSchema>;

export const ServiceListResponseSchema = z.object({
  items: z.array(
    z.object({
      slug: z.string(),
      name: z.string(),
      flow_policy: z.string(),
      display_price: MoneySchema.nullable().optional(),
      duration_minutes: z.number().int().nullable().optional(),
      short_description: z.string().nullable().optional(),
    }),
  ),
  page: z.number().int(),
  page_size: z.number().int(),
  total: z.number().int(),
});
export type ServiceListResponse = z.infer<typeof ServiceListResponseSchema>;

export const ServiceDetailSchema = z.object({
  slug: z.string(),
  name: z.string(),
  flow_policy: z.string(),
  display_price: MoneySchema.nullable().optional(),
  duration_minutes: z.number().int().nullable().optional(),
  included_items: z.array(z.string()),
  disclosures: z.array(z.string()),
  media: z.array(z.object({ url: z.string(), type: z.string() })),
  is_active: z.boolean(),
  visit_count: z.number().int().nullable().optional(),
  price_presentation: z.string().nullable().optional(),
  inspection_fee_display: z.string().nullable().optional(),
});
export type ServiceDetail = z.infer<typeof ServiceDetailSchema>;
