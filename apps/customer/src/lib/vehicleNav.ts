export function passAlongParams(
  flowParam: Record<string, string | undefined>,
  returnTo?: string | string[],
): Record<string, string> {
  const value = Array.isArray(returnTo) ? returnTo[0] : returnTo;
  const next: Record<string, string> = {};
  for (const [key, item] of Object.entries(flowParam)) {
    if (item) next[key] = item;
  }
  if (value) next.returnTo = value;
  return next;
}
