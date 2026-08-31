import type { FlowDecision } from '@caratom/contracts';

export type DecisionContext = {
  jobCardId: string;
  bookingId?: string;
};

export function nextOneManRouteFromDecision(
  decision: FlowDecision,
  ctx: DecisionContext,
): string | null {
  if (decision.required_next_action === 'ACCEPT_ESTIMATE') {
    throw new Error('ACCEPT_ESTIMATE is not part of the one-man path.');
  }
  switch (decision.required_next_action) {
    case 'FINALIZE':
      return `/checkout/details?jobCardId=${ctx.jobCardId}&flow=oneman`;
    case 'SELECT_SLOT':
    case 'CONFIRM_BOOKING':
      return `/checkout/slot?jobCardId=${ctx.jobCardId}&flow=oneman`;
    case 'VIEW_BOOKING':
      return ctx.bookingId ? `/booking/${ctx.bookingId}?flow=oneman` : null;
    default:
      return null;
  }
}
