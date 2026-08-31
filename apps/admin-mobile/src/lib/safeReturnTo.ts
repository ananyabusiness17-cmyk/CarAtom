const OPS_INBOX = '/(ops)/(tabs)/inbox';

/** In-app paths only. Reject protocol-relative and absolute URLs. */
export function safeReturnTo(value: unknown, fallback = OPS_INBOX): string {
  if (typeof value !== 'string') return fallback;
  if (!value.startsWith('/') || value.startsWith('//')) return fallback;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return fallback;
  if (value.includes('://')) return fallback;
  return value;
}
