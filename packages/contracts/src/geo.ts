import { z } from 'zod';

export const ReverseGeocodeSchema = z.object({
  label: z.string(),
  line1: z.string().nullable().optional(),
  locality: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  postal_code: z.string().nullable().optional(),
  latitude: z.number(),
  longitude: z.number(),
  source: z.enum(['nominatim', 'coords']),
});
export type ReverseGeocode = z.infer<typeof ReverseGeocodeSchema>;

export const GeocodeSearchResponseSchema = z.object({
  items: z.array(ReverseGeocodeSchema),
});
export type GeocodeSearchResponse = z.infer<typeof GeocodeSearchResponseSchema>;
