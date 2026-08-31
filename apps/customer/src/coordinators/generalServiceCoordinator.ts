import type { FlowDecision } from '@caratom/contracts';

export const queryKeys = {
  jobCard: (id: string) => ['job-card', id] as const,
  estimate: (jobCardId: string) => ['estimate', jobCardId] as const,
  slots: (jobCardId: string, from: string, to: string) => ['slots', jobCardId, from, to] as const,
  booking: (id: string) => ['booking', id] as const,
};

export type DecisionContext = {
  jobCardId: string;
  bookingId?: string;
};

export function nextRouteFromDecision(
  decision: FlowDecision,
  ctx: DecisionContext,
): string | null {
  if (
    typeof __DEV__ !== 'undefined' &&
    __DEV__ &&
    decision.advisor_requirement !== 'NOT_REQUIRED'
  ) {
    throw new Error('Advisor is not part of the general service path.');
  }
  switch (decision.required_next_action) {
    case 'ACCEPT_ESTIMATE':
      return `/job-card/${ctx.jobCardId}/estimate`;
    case 'FINALIZE':
      return `/checkout/details?jobCardId=${ctx.jobCardId}`;
    case 'SELECT_SLOT':
    case 'CONFIRM_BOOKING':
      return `/checkout/slot?jobCardId=${ctx.jobCardId}`;
    case 'VIEW_BOOKING':
      return ctx.bookingId ? `/booking/${ctx.bookingId}` : null;
    default:
      return null;
  }
}
