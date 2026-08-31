import { ApiError } from '@caratom/api-client';

export function problemMessage(err: unknown, fallback = 'Request failed.'): string {
  if (err instanceof ApiError) {
    const code = err.problem?.code;
    if (code === 'REASON_REQUIRED') return 'A reason is required.';
    if (code === 'INSUFFICIENT_STOCK') return 'Not enough stock at that location.';
    if (code === 'INVALID_STATE_TRANSITION') return 'That status change is not allowed.';
    if (code === 'VERSION_MISMATCH') return 'Catalog changed. Refresh and try again.';
    if (code === 'SCHEDULE_OVERLAP') {
      const details = err.problem?.details as Record<string, unknown> | undefined;
      const ref = details?.conflicting_public_ref;
      const name = details?.technician_name;
      if (typeof ref === 'string' && typeof name === 'string') {
        return `Overlap with ${ref} for ${name}.`;
      }
      return err.problem?.message ?? 'That technician already has an overlapping visit.';
    }
    return err.problem?.message ?? err.message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}
