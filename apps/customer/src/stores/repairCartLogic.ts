export function nextSelectedSlugs(current: string[], slug: string): string[] {
  return current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug];
}
