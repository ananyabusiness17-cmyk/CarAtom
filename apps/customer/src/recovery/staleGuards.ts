export function isStaleEstimate(
  localHash: string | null | undefined,
  serverHash: string | null | undefined,
): boolean {
  if (!localHash || !serverHash) return false;
  return localHash !== serverHash;
}

export function isHoldExpired(code: string | null | undefined): boolean {
  return code === 'HOLD_EXPIRED' || code === 'SLOT_UNAVAILABLE';
}
