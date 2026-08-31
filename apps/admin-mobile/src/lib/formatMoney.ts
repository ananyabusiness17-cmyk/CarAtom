export function formatInr(amountMinor: number): string {
  const rupees = Math.round(amountMinor / 100);
  return `₹${rupees.toLocaleString('en-IN')}`;
}

export function newIdempotencyKey(prefix: string): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}`;
}
