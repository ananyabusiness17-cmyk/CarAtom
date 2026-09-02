export const CART_QTY_MAX = 10;

export function nextSelectedSlugs(current: string[], slug: string): string[] {
  return current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug];
}

export function clampCartQty(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(CART_QTY_MAX, Math.max(0, Math.trunc(value)));
}

export function slugsFromQuantities(quantities: Record<string, number>): string[] {
  return Object.keys(quantities).filter((slug) => (quantities[slug] ?? 0) > 0);
}

export function totalCartQty(quantities: Record<string, number>): number {
  return slugsFromQuantities(quantities).reduce((sum, slug) => sum + (quantities[slug] ?? 0), 0);
}

export function quantitiesFromSlugs(slugs: string[]): Record<string, number> {
  return Object.fromEntries(slugs.map((slug) => [slug, 1]));
}
