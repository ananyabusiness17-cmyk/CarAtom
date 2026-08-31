export function overrideReasonError(reason: string): string | null {
  const cleaned = reason.trim();
  if (cleaned.length < 10) return 'Reason must be at least 10 characters.';
  return null;
}
