export function visitsOverlap(
  startA: string | Date | undefined,
  endA: string | Date | undefined,
  startB: string | Date | undefined,
  endB: string | Date | undefined,
): boolean {
  if (!startA || !endA || !startB || !endB) return false;
  const a0 = new Date(startA).getTime();
  const a1 = new Date(endA).getTime();
  const b0 = new Date(startB).getTime();
  const b1 = new Date(endB).getTime();
  return a0 < b1 && a1 > b0;
}
